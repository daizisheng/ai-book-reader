const { ipcRenderer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 创建日志工具函数
const logger = {
    log: (prefix, ...args) => {
        const message = `[${prefix}] ${args.join(' ')}`;
        console.log(message);
        process.stdout.write(message + '\n');
    },
    warn: (prefix, ...args) => {
        const message = `[${prefix}] ⚠️ ${args.join(' ')}`;
        console.warn(message);
        process.stdout.write(message + '\n');
    },
    error: (prefix, ...args) => {
        const message = `[${prefix}] ❌ ${args.join(' ')}`;
        console.error(message);
        process.stdout.write(message + '\n');
    },
    debug: (prefix, ...args) => {
        const message = `[${prefix}] 🔍 ${args.join(' ')}`;
        console.debug(message);
        process.stdout.write(message + '\n');
    }
};

// 获取 DOM 元素
const leftWebview = document.getElementById('leftWebview');
const rightWebview = document.getElementById('rightWebview');
const smartButton = document.getElementById('smartButton');
const pageInput = document.getElementById('pageInput');
const prevPageButton = document.getElementById('prevPageButton');
const nextPageButton = document.getElementById('nextPageButton');
const bookTitleDisplay = document.getElementById('bookTitleDisplay');
const bookAuthorDisplay = document.getElementById('bookAuthorDisplay');
const layoutInput = document.getElementById('layoutInput');

// 设置 webview 的基本属性
[leftWebview, rightWebview].forEach(webview => {
    webview.setAttribute('allowpopups', 'true');
    // 为左侧PDF webview和右侧ChatGPT webview设置不同的安全策略
    if (webview.id === 'leftWebview') {
        // 左侧PDF webview需要访问本地文件，但尽可能保持安全
        webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,enableRemoteModule=no,sandbox=no,webSecurity=no,allowRunningInsecureContent=no,experimentalFeatures=no');
    } else {
        // 右侧ChatGPT webview使用更安全的设置
        webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,enableRemoteModule=no,sandbox=yes,webSecurity=yes,allowRunningInsecureContent=no,experimentalFeatures=no');
    }
    webview.setAttribute('preload', path.join(__dirname, 'preload.js'));
    // 设置两个 webview 共享同一个持久化会话
    webview.setAttribute('partition', 'persist:shared');
    webview.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // 添加交互事件监听器
    webview.addEventListener('focus', () => {
        logger.log('Webview Focus', `${webview.id} 获得焦点`);
        lastWebviewInteraction = webview;
    });
    
    webview.addEventListener('click', () => {
        logger.log('Webview Interaction', `${webview.id} 被点击`);
        lastWebviewInteraction = webview;
    });
    
    webview.addEventListener('mousedown', () => {
        logger.log('Webview Interaction', `${webview.id} 鼠标按下`);
        lastWebviewInteraction = webview;
    });
    
    // 为右侧 webview 启用上下文菜单
    if (webview.id === 'rightWebview') {
        // 监听上下文菜单事件并创建自定义菜单
        webview.addEventListener('context-menu', (e) => {
            logger.log('Right Webview', '上下文菜单请求:', e.params);
            
            // 发送上下文菜单请求到主进程
            ipcRenderer.send('show-context-menu', {
                x: e.params.x,
                y: e.params.y,
                canCopy: e.params.selectionText && e.params.selectionText.length > 0,
                canPaste: e.params.editFlags && e.params.editFlags.canPaste,
                canCut: e.params.editFlags && e.params.editFlags.canCut,
                canUndo: e.params.editFlags && e.params.editFlags.canUndo,
                canRedo: e.params.editFlags && e.params.editFlags.canRedo,
                isEditable: e.params.isEditable,
                selectionText: e.params.selectionText || '',
                webviewId: 'rightWebview'
            });
        });
        
        // 监听来自主进程的菜单操作
        ipcRenderer.on('context-menu-command', (event, command) => {
            logger.log('Right Webview', '执行上下文菜单命令:', command);
            
            // 在 webview 中执行相应的命令
            switch (command) {
                case 'copy':
                    webview.executeJavaScript('document.execCommand("copy")');
                    break;
                case 'paste':
                    webview.executeJavaScript('document.execCommand("paste")');
                    break;
                case 'cut':
                    webview.executeJavaScript('document.execCommand("cut")');
                    break;
                case 'undo':
                    webview.executeJavaScript('document.execCommand("undo")');
                    break;
                case 'redo':
                    webview.executeJavaScript('document.execCommand("redo")');
                    break;
                case 'selectAll':
                    webview.executeJavaScript('document.execCommand("selectAll")');
                    break;
            }
        });
        
        // 明确设置允许上下文菜单
        webview.addEventListener('dom-ready', () => {
            logger.log('Right Webview', '启用上下文菜单');
            // 注入脚本来确保上下文菜单可用
            webview.executeJavaScript(`
                // 确保上下文菜单事件不被阻止
                document.addEventListener('contextmenu', function(e) {
                    console.log('Context menu event triggered');
                    // 不调用 e.preventDefault()，允许显示菜单
                }, true);
                
                // 添加一些调试信息
                console.log('Context menu enabled for right webview');
            `);
        });
    }
    
    // 监听 console 消息
    webview.addEventListener('console-message', (event) => {
        const { level, message, line, sourceId } = event;
        const prefix = `[${webview.id}]`;
        
        switch (level) {
            case 0:
                logger.log(prefix, message);
                break;
            case 1:
                logger.warn(prefix, message);
                break;
            case 2:
                logger.error(prefix, message);
                break;
            case 3:
                logger.debug(prefix, message);
                break;
            default:
                logger.log(prefix, message);
        }
    });
});

// 监听来自PDF.js的消息
leftWebview.addEventListener('ipc-message', (event) => {
    if (event.channel === 'pdf-loaded') {
        const { page, totalPages } = event.args[0];
        logger.log('PDF Loaded', `页面 ${page}/${totalPages} 已加载`);
        currentPDFPage = page;
        pageInput.value = page;
        saveCurrentPageState();
    } else if (event.channel === 'pdf-error') {
        logger.error('PDF Error', event.args[0]);
    }
});

// 监听PDF页面加载完成事件
leftWebview.addEventListener('did-finish-load', () => {
    logger.log('Left Webview', 'PDF页面加载完成');
    // 延迟获取PDF信息，确保PDF.js完全初始化
    setTimeout(() => {
        getPDFInfo();
    }, 100);
});

// 标记是否已加载过 ChatGPT
let chatgptLoaded = false;
let enableDebug = false;

// 监听主进程传来的 enable-debug 标志
ipcRenderer.on('enable-debug', () => {
    enableDebug = true;
    logger.log('Debug', '调试模式已启用');
});

// 右侧 webview dom-ready 后加载 ChatGPT（仅第一次）
rightWebview.addEventListener('dom-ready', async () => {
    logger.log('Right Webview', 'DOM 准备就绪');
    logger.log('Right Webview', '分区信息:', rightWebview.getAttribute('partition'));
    
    if (!chatgptLoaded) {
        logger.log('Right Webview', '首次加载，准备打开保存的URL...');
        const savedUrl = await loadRightWebviewURL();
        rightWebview.loadURL(savedUrl);
        chatgptLoaded = true;
        logger.log('Right Webview', '加载请求已发送，URL:', savedUrl);
    } else {
        logger.log('Right Webview', '已经加载过，跳过加载');
    }
    // 只有启用 debug 时才打开 webview 的开发者工具
    if (enableDebug && rightWebview.isDevToolsOpened && !rightWebview.isDevToolsOpened()) {
        logger.log('Right Webview', '调试模式已启用，正在打开开发者工具');
        rightWebview.openDevTools({ mode: 'detach' });
    }
});

// 请求通知权限的函数
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        logger.warn('Notification', '此浏览器不支持通知');
        return false;
    }
    
    let permission = Notification.permission;
    logger.log('Notification', '当前通知权限状态:', permission);
    
    if (permission === "default") {
        logger.log('Notification', '请求通知权限...');
        permission = await Notification.requestPermission();
        logger.log('Notification', '通知权限请求结果:', permission);
    }
    
    if (permission === "granted") {
        logger.log('Notification', '通知权限已获得');
        return true;
    } else {
        logger.warn('Notification', '通知权限被拒绝');
        return false;
    }
}

// 等待 DOM 完全加载
document.addEventListener('DOMContentLoaded', async () => {
    logger.log('App', 'DOM 完全加载完成');
    
    // 请求通知权限
    await requestNotificationPermission();
    
    // 初始化布局
    await initializeLayout();
    
    // 初始化按钮状态
    updateButtonStates();
    
    // 添加全局键盘事件监听器作为备用
    document.addEventListener('keydown', (event) => {
        // 检查是否是快捷键组合
        const isCtrlOrCmd = event.ctrlKey || event.metaKey;
        
        // ESC键不需要修饰符，单独处理
        if (event.key === 'Escape') {
            const isSettingsModalOpen = settingsModal && settingsModal.classList.contains('show');
            if (isSettingsModalOpen) {
                logger.log('Settings Modal', 'ESC键关闭设置模态框');
                closeSettingsModal();
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
        
        if (!isCtrlOrCmd) return;
        
        // 检查设置模态框是否打开
        const isSettingsModalOpen = settingsModal && settingsModal.classList.contains('show');
        
        // 检查当前焦点是否在输入框或文本区域
        const activeElement = document.activeElement;
        const isInputElement = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.contentEditable === 'true'
        );
        
        // 如果设置模态框打开且焦点在输入框中，允许标准快捷键正常工作
        if (isSettingsModalOpen && isInputElement) {
            logger.log('Settings Modal', '设置模态框中的输入框，允许标准快捷键');
            // 对于文本编辑快捷键，让浏览器处理
            switch (event.key.toLowerCase()) {
                case 'c':
                case 'v':
                case 'x':
                case 'a':
                    logger.log('Settings Modal', `允许 Ctrl+${event.key.toUpperCase()} 在输入框中执行`);
                    return; // 不阻止默认行为
                case 'z':
                    if (event.shiftKey) {
                        logger.log('Settings Modal', '允许 Ctrl+Shift+Z 重做在输入框中执行');
                    } else {
                        logger.log('Settings Modal', '允许 Ctrl+Z 撤销在输入框中执行');
                    }
                    return; // 不阻止默认行为
                default:
                    break;
            }
        }
        
        // 防止默认行为，让我们的处理器接管
        let handled = false;
        
        switch (event.key.toLowerCase()) {
            case 'c':
                if (!event.shiftKey) {
                    logger.log('Keyboard Shortcut', 'Ctrl+C 复制');
                    if (isSettingsModalOpen && !isInputElement) {
                        // 设置模态框打开但不在输入框中，不处理
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'copy');
                    handled = true;
                }
                break;
            case 'v':
                if (!event.shiftKey) {
                    logger.log('Keyboard Shortcut', 'Ctrl+V 粘贴');
                    if (isSettingsModalOpen && !isInputElement) {
                        // 设置模态框打开但不在输入框中，不处理
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'paste');
                    handled = true;
                }
                break;
            case 'x':
                if (!event.shiftKey) {
                    logger.log('Keyboard Shortcut', 'Ctrl+X 剪切');
                    if (isSettingsModalOpen && !isInputElement) {
                        // 设置模态框打开但不在输入框中，不处理
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'cut');
                    handled = true;
                }
                break;
            case 'a':
                if (!event.shiftKey) {
                    logger.log('Keyboard Shortcut', 'Ctrl+A 全选');
                    if (isSettingsModalOpen && !isInputElement) {
                        // 设置模态框打开但不在输入框中，不处理
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'selectAll');
                    handled = true;
                }
                break;
            case 'z':
                if (event.shiftKey) {
                    logger.log('Keyboard Shortcut', 'Ctrl+Shift+Z 重做');
                    if (isSettingsModalOpen && !isInputElement) {
                        // 设置模态框打开但不在输入框中，不处理
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'redo');
                    handled = true;
                } else {
                    logger.log('Keyboard Shortcut', 'Ctrl+Z 撤销');
                    if (isSettingsModalOpen && !isInputElement) {
                        // 设置模态框打开但不在输入框中，不处理
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'undo');
                    handled = true;
                }
                break;
            case 'r':
                if (event.shiftKey) {
                    logger.log('Keyboard Shortcut', 'Ctrl+Shift+R 强制刷新');
                    if (isSettingsModalOpen) {
                        // 设置模态框打开时，不处理刷新快捷键
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'reloadIgnoringCache');
                    handled = true;
                } else {
                    logger.log('Keyboard Shortcut', 'Ctrl+R 刷新');
                    if (isSettingsModalOpen) {
                        // 设置模态框打开时，不处理刷新快捷键
                        return;
                    }
                    executeWebviewCommand(getFocusedWebview(), 'reload');
                    handled = true;
                }
                break;
            case '0':
                logger.log('Keyboard Shortcut', 'Ctrl+0 重置缩放');
                if (isSettingsModalOpen) {
                    // 设置模态框打开时，不处理缩放快捷键
                    return;
                }
                executeWebviewCommand(getFocusedWebview(), 'zoomReset');
                handled = true;
                break;
            case '=':
            case '+':
                logger.log('Keyboard Shortcut', 'Ctrl++ 放大');
                if (isSettingsModalOpen) {
                    // 设置模态框打开时，不处理缩放快捷键
                    return;
                }
                executeWebviewCommand(getFocusedWebview(), 'zoomIn');
                handled = true;
                break;
            case '-':
                logger.log('Keyboard Shortcut', 'Ctrl+- 缩小');
                if (isSettingsModalOpen) {
                    // 设置模态框打开时，不处理缩放快捷键
                    return;
                }
                executeWebviewCommand(getFocusedWebview(), 'zoomOut');
                handled = true;
                break;

        }
        
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
    

    
    rightWebview.addEventListener('did-fail-load', (event) => {
        logger.error('Right Webview', '加载失败:', {
            errorCode: event.errorCode,
            errorDescription: event.errorDescription,
            url: event.url
        });
    });

    rightWebview.addEventListener('did-finish-load', () => {
        logger.log('Right Webview', '页面加载完成');
        logger.log('Right Webview', '当前 URL:', rightWebview.getURL());
    });

    rightWebview.addEventListener('did-navigate', (event) => {
        logger.log('Right Webview', '导航完成:', {
            url: event.url,
            isInPlace: event.isInPlace,
            isMainFrame: event.isMainFrame
        });
        
        // 保存右侧webview的URL（与当前PDF文件捆绑）
        if (event.isMainFrame && event.url !== 'about:blank') {
            saveRightWebviewURLForCurrentFile();
        }
    });

    // 监听页面内导航（如单页应用的路由变化）
    rightWebview.addEventListener('did-navigate-in-page', (event) => {
        logger.log('Right Webview', '页面内导航:', {
            url: event.url,
            isMainFrame: event.isMainFrame
        });
        
        // 保存右侧webview的URL（与当前PDF文件捆绑）
        if (event.isMainFrame && event.url !== 'about:blank') {
            saveRightWebviewURLForCurrentFile();
        }
    });

    // 拦截新窗口，外部链接用系统浏览器打开
    rightWebview.addEventListener('new-window', (e) => {
        logger.log('Right Webview', '检测到新窗口请求:', e.url);
        e.preventDefault();
        logger.log('Right Webview', '正在使用系统浏览器打开链接');
        shell.openExternal(e.url);
    });

    // 监听来自 webview 的消息
    rightWebview.addEventListener('ipc-message', (event) => {
        logger.log('Right Webview', '收到 IPC 消息:', event.channel, event.args);
        
        if (event.channel === 'ai-explanation-complete') {
            const bookName = event.args[0] || 'AI Book Reader';
            logger.log('Right Webview', 'AI解读完成，书名:', bookName);
            
            // 显示完成通知
            showCompletionNotification(bookName);
        }
    });
    
    // 显示完成通知的函数
    async function showCompletionNotification(bookName) {
        logger.log('Notification', '准备显示解读完成通知，书名:', bookName);
        
        // 检查通知权限
        if (!("Notification" in window)) {
            logger.error('Notification', '此浏览器不支持通知');
            return;
        }
        
        // 请求通知权限
        let permission = Notification.permission;
        logger.log('Notification', '当前通知权限状态:', permission);
        
        if (permission === "default") {
            logger.log('Notification', '请求通知权限...');
            permission = await Notification.requestPermission();
            logger.log('Notification', '通知权限请求结果:', permission);
        }
        
        if (permission !== "granted") {
            logger.warn('Notification', '通知权限被拒绝，权限状态:', permission);
            // 即使没有权限，也在控制台显示消息
            console.log(`🎉 《${bookName}》解读完成了！可以回来查看了`);
            return;
        }
        
        try {
            const notification = new Notification(`《${bookName}》解读完成了`, {
                body: '可以回来查看了',
                silent: false,
                requireInteraction: true, // 需要用户交互才会消失
                tag: 'ai-explanation-complete' // 防止重复通知
            });
            
            // 点击通知时聚焦窗口
            notification.onclick = () => {
                logger.log('Notification', '用户点击了解读完成通知');
                ipcRenderer.send('focus-window');
                notification.close(); // 关闭通知
            };
            
            // 通知显示时的回调
            notification.onshow = () => {
                logger.log('Notification', '解读完成通知已显示');
            };
            
            // 通知错误时的回调
            notification.onerror = (error) => {
                logger.error('Notification', '通知显示失败:', error);
            };
            
            logger.log('Right Webview', '已创建解读完成通知');
        } catch (error) {
            logger.error('Notification', '创建通知失败:', error);
            // 备用方案：在控制台显示消息
            console.log(`🎉 《${bookName}》解读完成了！可以回来查看了`);
        }
    }
    
    // 监听来自 webview 的自定义事件（备用方法）
    rightWebview.addEventListener('dom-ready', () => {
        // 注入监听脚本到webview中
        const listenerScript = `
            window.addEventListener('ai-explanation-complete', (event) => {
                console.log('收到AI完成事件:', event.detail);
                // 通过ipcRenderer发送到主进程
                try {
                    if (window.require) {
                        const { ipcRenderer } = window.require('electron');
                        ipcRenderer.sendToHost('ai-explanation-complete', event.detail.bookName);
                        console.log('通过自定义事件发送完成通知');
                    }
                } catch (error) {
                    console.log('自定义事件IPC发送失败:', error);
                }
            });
        `;
        
        rightWebview.executeJavaScript(listenerScript).catch(error => {
            logger.warn('Right Webview', '注入监听脚本失败:', error);
        });
    });
});

// 监听来自主进程的webview命令
ipcRenderer.on('webview-command', (event, command) => {
    logger.log('Webview Command', '收到webview命令:', command);
    
    // 获取当前焦点的webview
    const focusedWebview = getFocusedWebview();
    
    if (!focusedWebview) {
        logger.warn('Webview Command', '没有找到焦点webview，尝试右侧webview');
        // 如果没有焦点webview，默认使用右侧webview（ChatGPT）
        executeWebviewCommand(rightWebview, command);
        return;
    }
    
    executeWebviewCommand(focusedWebview, command);
});

// 获取当前焦点的webview
function getFocusedWebview() {
    // 检查哪个webview当前有焦点
    if (document.activeElement === leftWebview) {
        logger.log('Webview Focus', '左侧webview有焦点');
        return leftWebview;
    } else if (document.activeElement === rightWebview) {
        logger.log('Webview Focus', '右侧webview有焦点');
        return rightWebview;
    }
    
    // 如果没有明确的焦点，检查最近的用户交互
    const lastInteraction = getLastWebviewInteraction();
    if (lastInteraction) {
        logger.log('Webview Focus', '使用最近交互的webview:', lastInteraction.id);
        return lastInteraction;
    }
    
    // 默认返回右侧webview
    logger.log('Webview Focus', '默认使用右侧webview');
    return rightWebview;
}

// 记录webview交互
let lastWebviewInteraction = null;

// 执行webview命令
function executeWebviewCommand(webview, command) {
    if (!webview) {
        logger.warn('Webview Command', 'webview不存在');
        return;
    }
    
    logger.log('Webview Command', `在${webview.id}上执行命令:`, command);
    
    try {
        switch (command) {
            case 'cut':
                webview.executeJavaScript('document.execCommand("cut")');
                break;
            case 'copy':
                webview.executeJavaScript('document.execCommand("copy")');
                break;
            case 'paste':
                webview.executeJavaScript('document.execCommand("paste")');
                break;
            case 'selectAll':
                webview.executeJavaScript('document.execCommand("selectAll")');
                break;
            case 'undo':
                webview.executeJavaScript('document.execCommand("undo")');
                break;
            case 'redo':
                webview.executeJavaScript('document.execCommand("redo")');
                break;
            case 'reload':
                webview.reload();
                break;
            case 'reloadIgnoringCache':
                webview.reloadIgnoringCache();
                break;
            case 'zoomIn':
                webview.executeJavaScript(`
                    document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1).toString();
                `);
                break;
            case 'zoomOut':
                webview.executeJavaScript(`
                    document.body.style.zoom = Math.max(0.1, parseFloat(document.body.style.zoom || 1) - 0.1).toString();
                `);
                break;
            case 'zoomReset':
                webview.executeJavaScript(`
                    document.body.style.zoom = '1';
                `);
                break;
            default:
                logger.warn('Webview Command', '未知命令:', command);
        }
    } catch (error) {
        logger.error('Webview Command', '执行命令失败:', error);
    }
}

// 获取最近交互的webview
function getLastWebviewInteraction() {
    return lastWebviewInteraction;
}

// 监听来自主进程的消息
ipcRenderer.on('file-opened', async (event, filePath) => {
    logger.log('File Opened', '收到文件打开请求:', filePath);
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
        logger.log('File Opened', '文件存在，准备加载');
        
        // Update current file info for settings
        currentFilePath = filePath;
        currentFileMD5 = await generateFileMD5(filePath);
        logger.log('Settings', '文件已打开，MD5:', currentFileMD5);
        
        // 尝试加载保存的页面状态
        const savedPageState = await loadPageState();
        if (savedPageState) {
            currentPDFPage = savedPageState.currentPage || 1;
            logger.log('File Opened', '恢复保存的页面状态:', savedPageState);
        } else {
            // 重置PDF状态
            currentPDFPage = 1;
            logger.log('File Opened', '使用默认页面状态');
        }
        
        // 使用PDF URL参数构建URL
        const fileUrl = buildPDFUrl(filePath, currentPDFPage);
        logger.log('File Opened', '转换后的 URL:', fileUrl);
        
        // 在左侧 webview 中加载 PDF
        leftWebview.loadURL(fileUrl);
        logger.log('File Opened', '已发送加载请求到左侧面板');
        
        // 加载该文件对应的右侧webview URL
        const rightUrl = await loadRightWebviewURLForCurrentFile();
        if (rightUrl && rightWebview.getURL() !== rightUrl) {
            logger.log('File Opened', '加载文件对应的右侧URL:', rightUrl);
            rightWebview.loadURL(rightUrl);
        }
        
        // 延迟获取PDF信息
        setTimeout(() => {
            getPDFInfo();
        }, 100);
        
        // Update book info display
        await updateBookInfoDisplay();
    } else {
        logger.warn('File Opened', '文件不存在:', filePath);
    }
});



// 监听关闭文件事件
ipcRenderer.on('file-closed', async () => {
    logger.log('File Closed', '收到文件关闭请求');
    
    // 清空左侧 webview
    leftWebview.loadURL('about:blank');
    logger.log('File Closed', '已清空左侧面板');
    
    // 清除当前文件信息
    currentFilePath = null;
    currentFileMD5 = null;
    logger.log('File Closed', '已清除当前文件信息');
    
    // Update book info display
    await updateBookInfoDisplay();
    
    // 显示关闭通知
    const notification = new Notification('文件已关闭', {
        body: '当前PDF文件已关闭',
        silent: true
    });
});

// 添加页码输入框功能
pageInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        const targetPage = parseInt(pageInput.value);
        if (targetPage && targetPage > 0) {
            logger.log('Page Input', `用户输入跳转到第${targetPage}页`);
            await navigateToPage(targetPage);
        } else {
            logger.warn('Page Input', '无效的页码:', pageInput.value);
            // 恢复当前页码
            pageInput.value = currentPDFPage;
        }
    }
});

pageInput.addEventListener('blur', () => {
    // 失去焦点时验证并恢复页码
    const targetPage = parseInt(pageInput.value);
    if (!targetPage || targetPage < 1) {
        logger.log('Page Input', '输入框失去焦点，恢复当前页码');
        pageInput.value = currentPDFPage;
    }
});

// 添加翻页按钮功能
prevPageButton.addEventListener('click', async () => {
    logger.log('Prev Page Button', '用户点击了上一页按钮');
    if (prevPageButton.disabled) {
        logger.log('Prev Page Button', '上一页按钮被禁用，忽略点击');
        return;
    }
    await previousPage();
});

nextPageButton.addEventListener('click', async () => {
    logger.log('Next Page Button', '用户点击了下一页按钮');
    if (nextPageButton.disabled) {
        logger.log('Next Page Button', '下一页按钮被禁用，忽略点击');
        return;
    }
    await nextPage();
});

// 添加截图功能
smartButton.addEventListener('click', async () => {
    logger.log('Smart Button', '用户点击了 Smart 按钮');
    
    // 检查按钮是否被禁用
    if (smartButton.disabled) {
        logger.log('Smart Button', 'Smart按钮被禁用，忽略点击');
        return;
    }
    
    // 检查是否有打开的文件
    if (!currentFilePath) {
        logger.warn('Smart Button', '没有打开的文件');
        const notification = new Notification('请先打开书籍', {
            body: '请先通过菜单打开一本书籍，然后再使用解释功能',
            silent: true
        });
        return;
    }
    
    try {
        logger.log('Smart Button', '开始截取左侧面板...');
        // 获取左侧面板的截图
        const screenshot = await leftWebview.capturePage();
        const size = screenshot.getSize();
        logger.log('Smart Button', `截图成功，图片尺寸: ${size.width}x${size.height}`);
        
        // 将截图转换为 PNG 格式的 Buffer
        const pngBuffer = screenshot.toPNG();
        logger.log('Smart Button', '转换为 PNG 格式完成，Buffer 大小:', pngBuffer.length, 'bytes');
        
        // 将截图保存到剪贴板
        const clipboard = require('electron').clipboard;
        clipboard.writeImage(screenshot);
        logger.log('Smart Button', '截图已成功保存到剪贴板');

        // 等待右侧 ChatGPT 页面加载完成
        const currentUrl = rightWebview.getURL();
        logger.log('Smart Button', '当前右侧页面 URL:', currentUrl);
        
        // 检查是否是 ChatGPT 页面
        const isChatGPT = currentUrl.includes('chat.openai.com') || currentUrl.includes('chatgpt.com');
        
        if (isChatGPT) {
            logger.log('Smart Button', '正在将截图粘贴到 ChatGPT 输入框...');
            
            // 获取当前解释提示词
            const currentPrompt = await getCurrentExplainPrompt();
            logger.log('Smart Button', '使用提示词:', currentPrompt);
            
            // 读取外部脚本文件
            let pasteScript;
            try {
                pasteScript = fs.readFileSync(path.join(__dirname, 'pasteScript.js'), 'utf8');
                // 替换占位符为实际的提示词
                pasteScript = pasteScript.replace('PROMPT_PLACEHOLDER', currentPrompt);
                
                // 获取当前书名用于通知
                let bookName = 'AI Book Reader';
                if (currentFilePath && currentFileMD5) {
                    try {
                        const bookSettings = await ipcRenderer.invoke('load-book-settings', currentFileMD5);
                        if (bookSettings && bookSettings.title && bookSettings.title.trim()) {
                            bookName = bookSettings.title.trim();
                        } else {
                            // 使用文件名作为书名
                            const fileName = path.basename(currentFilePath, path.extname(currentFilePath));
                            bookName = fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;
                        }
                    } catch (settingsError) {
                        logger.warn('Smart Button', '获取书名失败，使用文件名:', settingsError);
                        const fileName = path.basename(currentFilePath, path.extname(currentFilePath));
                        bookName = fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;
                    }
                }
                
                // 替换书名占位符
                pasteScript = pasteScript.replace('BOOK_NAME_PLACEHOLDER', bookName);
                logger.log('Smart Button', '将使用书名:', bookName);
            } catch (error) {
                logger.error('Smart Button', '读取粘贴脚本失败:', error);
                throw new Error('无法加载粘贴脚本');
            }
            
            // 执行脚本
            const result = await rightWebview.executeJavaScript(pasteScript);
            logger.log('Smart Button', '脚本执行结果:', result);
            
            // 根据不同的结果显示相应的通知
            switch (result) {
                case 'success':
                    logger.log('Smart Button', '智能解释流程成功完成');
                    // 成功完成，等待解读完成通知
                    const successNotification = new Notification('开始解读', {
                        body: '正在解读页面内容，完成后会通知您',
                        silent: true
                    });
                    return;
                    
                case 'ai_working':
                    logger.log('Smart Button', 'AI正在工作中');
                    const workingNotification = new Notification('AI正在工作', {
                        body: 'AI正在处理中，请稍等...',
                        silent: true
                    });
                    return;
                    
                case 'unknown_state':
                    logger.warn('Smart Button', '无法识别ChatGPT状态');
                    const unknownNotification = new Notification('状态未知', {
                        body: '无法识别ChatGPT当前状态，请刷新页面',
                        silent: true
                    });
                    return;
                    
                case 'no_editor':
                    logger.warn('Smart Button', '找不到ChatGPT输入框');
                    const noEditorNotification = new Notification('输入框未找到', {
                        body: '找不到ChatGPT输入框，请确保页面已加载',
                        silent: true
                    });
                    return;
                    
                case 'wait_send_timeout':
                    logger.warn('Smart Button', '等待发送按钮启用超时');
                    const waitTimeoutNotification = new Notification('等待超时', {
                        body: '等待发送按钮启用超时，请检查输入内容',
                        silent: true
                    });
                    return;
                    
                case 'no_send_button':
                    logger.warn('Smart Button', '发送按钮不存在');
                    const noSendNotification = new Notification('发送按钮未找到', {
                        body: '找不到发送按钮，请检查页面状态',
                        silent: true
                    });
                    return;
                    
                case 'send_button_disabled':
                    logger.warn('Smart Button', '发送按钮被禁用');
                    const disabledNotification = new Notification('发送按钮被禁用', {
                        body: '发送按钮不可用，请检查输入内容',
                        silent: true
                    });
                    return;
                    
                case 'send_failed':
                    logger.warn('Smart Button', '发送可能失败');
                    const failedNotification = new Notification('发送失败', {
                        body: '发送后未检测到AI工作状态，请手动检查',
                        silent: true
                    });
                    return;
                    
                case 'monitor_timeout':
                    logger.warn('Smart Button', 'AI工作监控超时');
                    const monitorTimeoutNotification = new Notification('监控超时', {
                        body: 'AI工作监控超时，请手动检查ChatGPT页面',
                        silent: true
                    });
                    return;
                    
                default:
                    if (result && result.startsWith('error:')) {
                        logger.error('Smart Button', '脚本执行出错:', result);
                        const errorNotification = new Notification('执行出错', {
                            body: result.replace('error: ', ''),
                            silent: true
                        });
                    } else {
                        logger.warn('Smart Button', '未知的执行结果:', result);
                        const unknownResultNotification = new Notification('未知结果', {
                            body: '操作完成，但结果未知',
                            silent: true
                        });
                    }
                    return;
            }
        } else {
            logger.warn('Smart Button', 'ChatGPT 页面未加载，当前页面:', currentUrl);
            // 尝试加载 ChatGPT
            logger.log('Smart Button', '正在加载 ChatGPT...');
            rightWebview.loadURL('https://chat.openai.com/');
        }
        
        // 显示成功提示
        const notification = new Notification('截图成功', {
            body: '截图已保存到剪贴板' + (isChatGPT ? '并发送到 ChatGPT' : '，正在加载 ChatGPT...'),
            silent: true
        });
        logger.log('Smart Button', '已显示成功通知');
    } catch (error) {
        logger.error('Smart Button', '截图过程中发生错误:', error);
        logger.error('Smart Button', '错误详情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        // 显示错误提示
        const notification = new Notification('截图失败', {
            body: error.message,
            silent: true
        });
        logger.log('Smart Button', '已显示错误通知');
    }
}); 

// Get current explain prompt from settings
async function getCurrentExplainPrompt() {
    try {
        // 优先级1: 书籍专用提示词
        if (currentFilePath && currentFileMD5) {
            const bookSettings = await ipcRenderer.invoke('load-book-settings', currentFileMD5);
            if (bookSettings && bookSettings.explainPrompt && bookSettings.explainPrompt.trim()) {
                logger.log('Settings', '使用书籍专用提示词');
                return bookSettings.explainPrompt.trim();
            }
        }
        
        // 优先级2: 全局设置中的解释提示词
        try {
            const globalSettings = await ipcRenderer.invoke('load-global-settings');
            if (globalSettings && globalSettings.explainPrompt && globalSettings.explainPrompt.trim()) {
                logger.log('Settings', '使用全局解释提示词');
                return globalSettings.explainPrompt.trim();
            }
        } catch (globalError) {
            logger.warn('Settings', '获取全局设置失败:', globalError);
        }
        
        // 优先级3: 配置文件中的默认提示词
        if (typeof DEFAULT_CONFIG !== 'undefined' && DEFAULT_CONFIG.defaultExplainPrompt) {
            logger.log('Settings', '使用配置文件中的默认提示词');
            return DEFAULT_CONFIG.defaultExplainPrompt;
        }
        
        // 最后的备选方案
        logger.log('Settings', '使用硬编码默认提示词');
        return '请用中文解释本页内容';
    } catch (error) {
        logger.error('Settings', '获取解释提示词失败:', error);
        return '请用中文解释本页内容';
    }
}

// Generate MD5 hash for file
async function generateFileMD5(filePath) {
    try {
        const crypto = require('crypto');
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        return hash;
    } catch (error) {
        logger.error('Settings', '生成文件 MD5 失败:', error);
        return null;
    }
}

// Current file path and MD5 for book-specific settings
let currentFilePath = null;
let currentFileMD5 = null;

// Update button states based on file status
function updateButtonStates() {
    const hasFile = !!currentFilePath;
    
    // 更新按钮状态
    smartButton.disabled = !hasFile;
    settingsButton.disabled = !hasFile;
    pageInput.disabled = !hasFile;
    prevPageButton.disabled = !hasFile;
    nextPageButton.disabled = !hasFile;
    // 布局输入框始终可用
    layoutInput.disabled = false;
    
    // 更新按钮样式
    if (hasFile) {
        smartButton.style.opacity = '1';
        settingsButton.style.opacity = '1';
        pageInput.style.opacity = '1';
        prevPageButton.style.opacity = '1';
        nextPageButton.style.opacity = '1';
        smartButton.style.cursor = 'pointer';
        settingsButton.style.cursor = 'pointer';
        pageInput.style.cursor = 'text';
        prevPageButton.style.cursor = 'pointer';
        nextPageButton.style.cursor = 'pointer';
    } else {
        smartButton.style.opacity = '0.5';
        settingsButton.style.opacity = '0.5';
        pageInput.style.opacity = '0.5';
        prevPageButton.style.opacity = '0.5';
        nextPageButton.style.opacity = '0.5';
        smartButton.style.cursor = 'not-allowed';
        settingsButton.style.cursor = 'not-allowed';
        pageInput.style.cursor = 'not-allowed';
        prevPageButton.style.cursor = 'not-allowed';
        nextPageButton.style.cursor = 'not-allowed';
        // 布局输入框始终可用
        layoutInput.style.opacity = '1';
        layoutInput.style.cursor = 'text';
    }
    
    // 更新页码输入框的值
    if (hasFile) {
        pageInput.value = currentPDFPage;
    } else {
        pageInput.value = '';
        pageInput.placeholder = '1';
    }
    
    // 更新设置界面中的文件相关字段状态
    updateBookSettingsState(hasFile);
    
    logger.log('Button States', '按钮状态已更新:', { 
        hasFile, 
        smartDisabled: !hasFile, 
        settingsDisabled: !hasFile,
        pageInputDisabled: !hasFile,
        prevPageDisabled: !hasFile,
        nextPageDisabled: !hasFile,
        currentPage: currentPDFPage
    });
}

// Update book settings section state
function updateBookSettingsState(hasFile) {
    const bookSettingsSection = document.getElementById('bookSettingsSection');
    const bookTitle = document.getElementById('bookTitle');
    const bookAuthor = document.getElementById('bookAuthor');
    const explainPrompt = document.getElementById('explainPrompt');
    
    if (!bookSettingsSection) return;
    
    if (hasFile) {
        // 启用状态
        bookSettingsSection.classList.remove('disabled');
        bookTitle.disabled = false;
        bookAuthor.disabled = false;
        explainPrompt.disabled = false;
    } else {
        // 禁用状态
        bookSettingsSection.classList.add('disabled');
        bookTitle.disabled = true;
        bookAuthor.disabled = true;
        explainPrompt.disabled = true;
        
        // 清空字段内容
        bookTitle.value = '';
        bookAuthor.value = '';
        explainPrompt.value = '';
    }
    
    logger.log('Book Settings', '本书设置状态已更新:', { hasFile, disabled: !hasFile });
}

// Update book info display in titlebar
async function updateBookInfoDisplay() {
    try {
        if (!currentFilePath) {
            // 没有文件时显示默认信息
            bookTitleDisplay.textContent = 'AI Book Reader';
            bookAuthorDisplay.textContent = '';
            updateButtonStates();
            return;
        }

        // 尝试从书籍设置中获取信息
        let bookTitle = '';
        let bookAuthor = '';
        
        if (currentFileMD5) {
            const bookSettings = await ipcRenderer.invoke('load-book-settings', currentFileMD5);
            if (bookSettings) {
                bookTitle = bookSettings.title || '';
                bookAuthor = bookSettings.author || '';
            }
        }

        // 如果没有设置的书名，使用文件名的前20个字符
        if (!bookTitle) {
            const fileName = path.basename(currentFilePath, path.extname(currentFilePath));
            bookTitle = fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;
        }

        // 更新显示
        bookTitleDisplay.textContent = bookTitle;
        bookAuthorDisplay.textContent = bookAuthor;
        updateButtonStates();
        
        logger.log('Book Info', '更新书籍信息显示:', { title: bookTitle, author: bookAuthor });
    } catch (error) {
        logger.error('Book Info', '更新书籍信息显示失败:', error);
        // 出错时显示默认信息
        bookTitleDisplay.textContent = 'AI Book Reader';
        bookAuthorDisplay.textContent = '';
    }
}

// Settings functionality
const settingsModal = document.getElementById('settingsModal');
const settingsButton = document.getElementById('settingsButton');
const closeModal = document.getElementById('closeModal');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettings = document.getElementById('saveSettings');

// Form elements
const bookTitle = document.getElementById('bookTitle');
const bookAuthor = document.getElementById('bookAuthor');
const explainPrompt = document.getElementById('explainPrompt');
const startupPrompt = document.getElementById('startupPrompt');
const enableNotifications = document.getElementById('enableNotifications');

// Load settings from files
async function loadSettings() {
    try {
        // Load global settings
        const globalSettings = await ipcRenderer.invoke('load-global-settings');
        if (globalSettings) {
            startupPrompt.value = globalSettings.startupPrompt || (typeof DEFAULT_CONFIG !== 'undefined' ? DEFAULT_CONFIG.defaultStartupPrompt : '你是费曼，我将会逐页的给你上传书籍的截图，请你给我讲解每一页的内容');
            enableNotifications.checked = globalSettings.enableNotifications !== false; // default to true
            
            // 如果全局设置中有解释提示词，设置为默认值
            if (globalSettings.explainPrompt) {
                explainPrompt.placeholder = globalSettings.explainPrompt;
            }
        } else {
            // 使用配置文件中的默认值
            if (typeof DEFAULT_CONFIG !== 'undefined') {
                startupPrompt.value = DEFAULT_CONFIG.defaultStartupPrompt || '你是费曼，我将会逐页的给你上传书籍的截图，请你给我讲解每一页的内容';
                explainPrompt.placeholder = DEFAULT_CONFIG.defaultExplainPrompt || '请用中文解释本页内容';
            }
        }

        // Load book-specific settings if we have a current file
        if (currentFilePath && currentFileMD5) {
            const bookSettings = await ipcRenderer.invoke('load-book-settings', currentFileMD5);
            if (bookSettings) {
                bookTitle.value = bookSettings.title || '';
                bookAuthor.value = bookSettings.author || '';
                explainPrompt.value = bookSettings.explainPrompt || '';
            } else {
                // Set defaults for new book
                bookTitle.value = '';
                bookAuthor.value = '';
                explainPrompt.value = '';
            }
        } else {
            // 没有打开文件时，清空书籍设置
            bookTitle.value = '';
            bookAuthor.value = '';
            explainPrompt.value = '';
        }
        
        // 确保设置界面的状态与当前文件状态一致
        updateBookSettingsState(!!currentFilePath);
    } catch (error) {
        logger.error('Settings', '加载设置失败:', error);
    }
}

// Save settings to files
async function saveSettingsToFiles() {
    try {
        // Save global settings
        const globalSettings = {
            startupPrompt: startupPrompt.value,
            enableNotifications: enableNotifications.checked
        };
        await ipcRenderer.invoke('save-global-settings', globalSettings);

        // Save book-specific settings if we have a current file
        if (currentFilePath && currentFileMD5) {
            const bookSettings = {
                title: bookTitle.value,
                author: bookAuthor.value,
                explainPrompt: explainPrompt.value,
                filePath: currentFilePath
            };
            await ipcRenderer.invoke('save-book-settings', currentFileMD5, bookSettings);
        }

        logger.log('Settings', '设置保存成功');
        return true;
    } catch (error) {
        logger.error('Settings', '保存设置失败:', error);
        return false;
    }
}

// Open settings modal
settingsButton.addEventListener('click', async () => {
    if (settingsButton.disabled) {
        logger.log('Settings', '设置按钮被禁用，忽略点击');
        return;
    }
    
    logger.log('Settings', '打开设置面板');
    await loadSettings();
    settingsModal.classList.add('show');
});

// Close modal handlers
function closeSettingsModal() {
    settingsModal.classList.remove('show');
}

closeModal.addEventListener('click', closeSettingsModal);
cancelSettings.addEventListener('click', closeSettingsModal);

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettingsModal();
    }
});

// Save settings
saveSettings.addEventListener('click', async () => {
    logger.log('Settings', '保存设置');
    const success = await saveSettingsToFiles();
    if (success) {
        closeSettingsModal();
        
        // Update book info display after saving settings
        await updateBookInfoDisplay();
        
        // Show success notification
        const notification = new Notification('设置保存成功', {
            body: '您的设置已保存',
            silent: true
        });
    } else {
        // Show error notification
        const notification = new Notification('设置保存失败', {
            body: '保存设置时出现错误',
            silent: true
        });
    }
});

// PDF控制相关变量
let currentPDFPage = 1;

// PDF URL参数控制函数
function buildPDFUrl(filePath, page = null) {
    const baseUrl = `file://${__dirname}/pdf-viewer.html`;
    if (page !== null && page > 0) {
        return `${baseUrl}?file=${encodeURIComponent(filePath)}&page=${page}`;
    }
    return `${baseUrl}?file=${encodeURIComponent(filePath)}`;
}

// 导航到指定页面
async function navigateToPage(pageNumber) {
    if (!currentFilePath) {
        logger.warn('PDF Navigation', '没有打开的PDF文件');
        return;
    }
    if (pageNumber < 1) {
        pageNumber = 1;
    }
    if (pageNumber === currentPDFPage) {
        logger.log('PDF Navigation', '页面没有变化，跳过导航');
        return;
    }
    logger.log('PDF Navigation', `准备导航到第${pageNumber}页`);
    currentPDFPage = pageNumber;
    pageInput.value = currentPDFPage;
    // 直接在webview里执行翻页
    leftWebview.executeJavaScript(`window.renderPage(${currentPDFPage})`);
    saveCurrentPageState();
}

// 下一页
async function nextPage() {
    await navigateToPage(currentPDFPage + 1);
}

// 上一页
async function previousPage() {
    if (currentPDFPage > 1) {
        await navigateToPage(currentPDFPage - 1);
    }
}
// 获取PDF信息的函数
function getPDFInfo() {
    if (!leftWebview) return;
    
    // 从webview中获取当前页面信息
    leftWebview.executeJavaScript(`
        if (window.currentPage) {
            window.parent.postMessage({
                type: 'pdf-loaded',
                page: window.currentPage,
                totalPages: window.totalPages
            }, '*');
        }
    `);
}

// 保存当前页面状态
async function saveCurrentPageState() {
    if (!currentFilePath || !currentFileMD5) return;
    
    try {
        const pageState = {
            currentPage: currentPDFPage,
            lastAccessed: new Date().toISOString()
        };
        
        await ipcRenderer.invoke('save-page-state', currentFileMD5, pageState);
        logger.log('Page State', '页面状态已保存:', pageState);
    } catch (error) {
        logger.error('Page State', '保存页面状态失败:', error);
    }
}

// 加载页面状态
async function loadPageState() {
    if (!currentFilePath || !currentFileMD5) return null;
    
    try {
        const pageState = await ipcRenderer.invoke('load-page-state', currentFileMD5);
        if (pageState) {
            logger.log('Page State', '加载页面状态:', pageState);
            return pageState;
        }
    } catch (error) {
        logger.error('Page State', '加载页面状态失败:', error);
    }
    
    return null;
}

// 保存右侧webview的URL（与当前PDF文件捆绑）
async function saveRightWebviewURLForCurrentFile() {
    try {
        const currentUrl = rightWebview.getURL();
        if (currentUrl && currentUrl !== 'about:blank') {
            if (currentFileMD5) {
                // 如果有当前文件，保存到该文件的专用记录中
                await ipcRenderer.invoke('save-right-webview-url-for-file', currentFileMD5, currentUrl);
                logger.log('Right Webview URL', `已为文件 ${currentFileMD5} 保存URL:`, currentUrl);
            } else {
                // 如果没有当前文件，保存到全局记录中
                await ipcRenderer.invoke('save-right-webview-url', currentUrl);
                logger.log('Right Webview URL', '已保存全局URL:', currentUrl);
            }
        }
    } catch (error) {
        logger.error('Right Webview URL', '保存URL失败:', error);
    }
}

// 加载右侧webview的URL（优先加载当前文件对应的URL）
async function loadRightWebviewURLForCurrentFile() {
    try {
        let savedUrl = null;
        
        if (currentFileMD5) {
            // 如果有当前文件，优先加载该文件对应的URL
            savedUrl = await ipcRenderer.invoke('load-right-webview-url-for-file', currentFileMD5);
            if (savedUrl && savedUrl !== 'about:blank') {
                logger.log('Right Webview URL', `加载文件 ${currentFileMD5} 对应的URL:`, savedUrl);
                return savedUrl;
            }
        }
        
        // 如果没有文件专用URL，加载全局URL
        savedUrl = await ipcRenderer.invoke('load-right-webview-url');
        if (savedUrl && savedUrl !== 'about:blank') {
            logger.log('Right Webview URL', '加载全局URL:', savedUrl);
            return savedUrl;
        }
    } catch (error) {
        logger.error('Right Webview URL', '加载URL失败:', error);
    }
    
    return 'https://chat.openai.com/';
}

// 兼容性函数：保持原有的全局URL保存功能
async function saveRightWebviewURL() {
    return saveRightWebviewURLForCurrentFile();
}

// 兼容性函数：保持原有的全局URL加载功能
async function loadRightWebviewURL() {
    return loadRightWebviewURLForCurrentFile();
}

// 布局管理功能
async function initializeLayout() {
    // 加载保存的布局配置
    const savedLayout = await loadLayoutConfig();
    const leftWidth = savedLayout || DEFAULT_CONFIG.defaultLeftPanelWidth;
    
    // 设置输入框的值
    layoutInput.value = leftWidth;
    
    // 应用布局
    applyLayout(leftWidth);
    
    // 添加输入框事件监听器
    setupLayoutInputListeners();
    
    logger.log('Layout', `布局初始化完成，左侧宽度: ${leftWidth}%`);
}

function setupLayoutInputListeners() {
    // 监听回车键
    layoutInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            applyLayoutFromInput();
        }
    });
    
    // 监听失去焦点
    layoutInput.addEventListener('blur', () => {
        applyLayoutFromInput();
    });
    
    // 监听输入变化（实时预览）
    layoutInput.addEventListener('input', () => {
        const value = parseInt(layoutInput.value);
        if (!isNaN(value) && value >= 20 && value <= 80) {
            applyLayout(value);
        }
    });
}

function applyLayoutFromInput() {
    let value = parseInt(layoutInput.value);
    
    // 验证输入值
    if (isNaN(value)) {
        // 如果输入无效，恢复之前的值
        const currentWidth = getCurrentLeftPanelWidth();
        layoutInput.value = currentWidth;
        logger.warn('Layout', `无效的布局值: ${layoutInput.value}，已恢复为: ${currentWidth}%`);
        return;
    }
    
    // 范围限制：小于20当作20，大于80当作80
    if (value < 20) {
        value = 20;
        logger.log('Layout', `输入值小于20，自动调整为20%`);
    } else if (value > 80) {
        value = 80;
        logger.log('Layout', `输入值大于80，自动调整为80%`);
    }
    
    // 更新输入框显示
    layoutInput.value = value;
    
    // 应用新的布局
    applyLayout(value);
    
    // 保存到配置
    saveLayoutConfig(value);
    
    logger.log('Layout', `用户设置布局: ${value}%`);
}

function applyLayout(leftWidthPercent) {
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    
    if (!leftPanel || !rightPanel) {
        logger.error('Layout', '找不到面板元素');
        return;
    }
    
    // 设置左侧面板宽度
    leftPanel.style.width = `${leftWidthPercent}%`;
    
    // 右侧面板自动占据剩余空间（通过flex: 1）
    logger.log('Layout', `应用布局: 左侧 ${leftWidthPercent}%`);
}

function getCurrentLeftPanelWidth() {
    const leftPanel = document.querySelector('.left-panel');
    const mainContent = document.querySelector('.main-content');
    
    if (!leftPanel || !mainContent) {
        return DEFAULT_CONFIG.defaultLeftPanelWidth;
    }
    
    const leftWidth = leftPanel.offsetWidth;
    const totalWidth = mainContent.offsetWidth;
    
    if (totalWidth === 0) {
        return DEFAULT_CONFIG.defaultLeftPanelWidth;
    }
    
    return Math.round((leftWidth / totalWidth) * 100);
}

async function loadLayoutConfig() {
    try {
        const config = await ipcRenderer.invoke('load-layout-config');
        return config?.leftPanelWidth || null;
    } catch (error) {
        logger.error('Layout', '加载布局配置失败:', error);
        return null;
    }
}

async function saveLayoutConfig(leftWidthPercent) {
    try {
        await ipcRenderer.invoke('save-layout-config', {
            leftPanelWidth: leftWidthPercent
        });
        logger.log('Layout', `布局配置已保存: ${leftWidthPercent}%`);
    } catch (error) {
        logger.error('Layout', '保存布局配置失败:', error);
    }
}