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
const bookTitleDisplay = document.getElementById('bookTitleDisplay');
const bookAuthorDisplay = document.getElementById('bookAuthorDisplay');

// 设置 webview 的基本属性
[leftWebview, rightWebview].forEach(webview => {
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=no,nodeIntegration=no,enableRemoteModule=no,sandbox=no,webSecurity=no,allowRunningInsecureContent=true');
    webview.setAttribute('preload', path.join(__dirname, 'preload.js'));
    // 设置两个 webview 共享同一个持久化会话
    webview.setAttribute('partition', 'persist:shared');
    webview.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
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

// 标记是否已加载过 ChatGPT
let chatgptLoaded = false;
let enableDebug = false;

// 监听主进程传来的 enable-debug 标志
ipcRenderer.on('enable-debug', () => {
    enableDebug = true;
    logger.log('Debug', '调试模式已启用');
});

// 右侧 webview dom-ready 后加载 ChatGPT（仅第一次）
rightWebview.addEventListener('dom-ready', () => {
    logger.log('Right Webview', 'DOM 准备就绪');
    logger.log('Right Webview', '分区信息:', rightWebview.getAttribute('partition'));
    
    if (!chatgptLoaded) {
        logger.log('Right Webview', '首次加载，准备打开 ChatGPT...');
        rightWebview.loadURL('https://chat.openai.com/');
        chatgptLoaded = true;
        logger.log('Right Webview', 'ChatGPT 加载请求已发送');
    } else {
        logger.log('Right Webview', 'ChatGPT 已经加载过，跳过加载');
    }
    // 只有启用 debug 时才打开 webview 的开发者工具
    if (enableDebug && rightWebview.isDevToolsOpened && !rightWebview.isDevToolsOpened()) {
        logger.log('Right Webview', '调试模式已启用，正在打开开发者工具');
        rightWebview.openDevTools({ mode: 'detach' });
    }
});

// 等待 DOM 完全加载
document.addEventListener('DOMContentLoaded', () => {
    logger.log('App', 'DOM 完全加载完成');
    
    // 初始化按钮状态
    updateButtonStates();
    
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
            const notification = new Notification(`${bookName} 解读完成`, {
                body: '可以回来阅读了',
                silent: false
            });
            
            // 可选：点击通知时聚焦窗口
            notification.onclick = () => {
                ipcRenderer.send('focus-window');
            };
            
            logger.log('Right Webview', '已显示解读完成通知');
        }
    });
});

// 监听来自主进程的消息
ipcRenderer.on('file-opened', async (event, filePath) => {
    logger.log('File Opened', '收到文件打开请求:', filePath);
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
        logger.log('File Opened', '文件存在，准备加载');
        // 将文件路径转换为 file:// URL
        const fileUrl = `file://${filePath}`;
        logger.log('File Opened', '转换后的 URL:', fileUrl);
        // 在左侧 webview 中加载 PDF
        leftWebview.loadURL(fileUrl);
        logger.log('File Opened', '已发送加载请求到左侧面板');
        
        // Update current file info for settings
        currentFilePath = filePath;
        currentFileMD5 = await generateFileMD5(filePath);
        logger.log('Settings', '文件已打开，MD5:', currentFileMD5);
        
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
            if (result === true) {
                logger.log('Smart Button', '截图和提示文本已成功添加到 ChatGPT 并发送');
            } else if (result === 'ai_working') {
                logger.log('Smart Button', 'AI正在工作，等待完成');
                // 显示等待通知
                const waitNotification = new Notification('请稍等', {
                    body: 'AI正在工作，请稍等...',
                    silent: true
                });
                return; // 提前返回，不显示成功通知
            } else if (result === 'explanation_complete') {
                logger.log('Smart Button', '截图和提示文本已成功添加到 ChatGPT 并发送，正在监控完成状态');
                // 显示开始解读通知
                const startNotification = new Notification('开始解读', {
                    body: '正在解读页面内容，完成后会通知您',
                    silent: true
                });
                return; // 提前返回，等待解读完成通知
            } else {
                logger.warn('Smart Button', '操作过程中出现问题:', result);
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
    
    // 更新按钮样式
    if (hasFile) {
        smartButton.style.opacity = '1';
        settingsButton.style.opacity = '1';
        smartButton.style.cursor = 'pointer';
        settingsButton.style.cursor = 'pointer';
    } else {
        smartButton.style.opacity = '0.5';
        settingsButton.style.opacity = '0.5';
        smartButton.style.cursor = 'not-allowed';
        settingsButton.style.cursor = 'not-allowed';
    }
    
    // 更新设置界面中的文件相关字段状态
    updateBookSettingsState(hasFile);
    
    logger.log('Button States', '按钮状态已更新:', { hasFile, smartDisabled: !hasFile, settingsDisabled: !hasFile });
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