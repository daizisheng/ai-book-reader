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

// 设置 webview 的基本属性
[leftWebview, rightWebview].forEach(webview => {
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=no');
    webview.setAttribute('preload', path.join(__dirname, 'preload.js'));
    // 设置两个 webview 共享同一个持久化会话
    webview.setAttribute('partition', 'persist:shared');
    webview.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
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
});

// 监听来自主进程的消息
ipcRenderer.on('file-opened', (event, filePath) => {
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
    } else {
        logger.warn('File Opened', '文件不存在:', filePath);
    }
});

// 添加截图功能
smartButton.addEventListener('click', async () => {
    logger.log('Smart Button', '用户点击了 Smart 按钮');
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
            
            // 注入 JavaScript 来查找输入框并粘贴
            const pasteScript = `
                (async () => {
                    try {
                        // 等待页面完全加载
                        if (document.readyState !== 'complete') {
                            await new Promise(resolve => window.addEventListener('load', resolve));
                        }
                        
                        // 查找 ProseMirror 编辑器
                        const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
                        if (!editor) {
                            throw new Error('找不到 ChatGPT 输入框');
                        }
                        
                        // 聚焦编辑器
                        editor.focus();
                        
                        // 方法1: 使用 execCommand
                        document.execCommand('paste');
                        
                        // 方法2: 使用 Clipboard API
                        try {
                            const clipboardItems = await navigator.clipboard.read();
                            for (const item of clipboardItems) {
                                if (item.types.includes('image/png')) {
                                    const blob = await item.getType('image/png');
                                    const img = document.createElement('img');
                                    img.src = URL.createObjectURL(blob);
                                    editor.appendChild(img);
                                }
                            }
                        } catch (clipboardError) {
                            console.log('Clipboard API 失败，尝试其他方法');
                        }
                        
                        // 方法3: 模拟键盘事件
                        const pasteEvent = new KeyboardEvent('keydown', {
                            key: 'v',
                            code: 'KeyV',
                            ctrlKey: true,
                            bubbles: true,
                            cancelable: true
                        });
                        editor.dispatchEvent(pasteEvent);
                        
                        // 方法4: 模拟粘贴事件
                        const pasteEvent2 = new ClipboardEvent('paste', {
                            clipboardData: new DataTransfer(),
                            bubbles: true,
                            cancelable: true
                        });
                        editor.dispatchEvent(pasteEvent2);

                        // 等待图片上传完成
                        console.log('等待图片上传...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        console.log('图片上传等待完成');

                        // 添加提示文本
                        const promptText = '请解释本页内容，要用中文';
                        const textNode = document.createTextNode(promptText);
                        editor.appendChild(textNode);

                        // 触发输入事件以确保 ChatGPT 识别到文本变化
                        const inputEvent = new Event('input', {
                            bubbles: true,
                            cancelable: true
                        });
                        editor.dispatchEvent(inputEvent);

                        // 等待一小段时间让 ChatGPT 处理输入
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // 查找发送按钮
                        const sendButton = document.querySelector('button[data-testid="send-button"]');
                        if (!sendButton) {
                            throw new Error('找不到发送按钮');
                        }

                        // 检查按钮是否可用
                        if (sendButton.disabled) {
                            console.log('发送按钮当前不可用，等待按钮可用...');
                            // 等待按钮可用
                            let attempts = 0;
                            while (sendButton.disabled && attempts < 10) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                attempts++;
                                console.log('等待按钮可用，尝试次数: ' + attempts);
                            }
                            if (sendButton.disabled) {
                                throw new Error('发送按钮在等待后仍然不可用');
                            }
                        }

                        // 点击发送按钮
                        sendButton.click();
                        console.log('已点击发送按钮');
                        
                        return true;
                    } catch (error) {
                        console.error('操作错误:', error);
                        return error.message;
                    }
                })();
            `;
            
            // 执行脚本
            const result = await rightWebview.executeJavaScript(pasteScript);
            if (result === true) {
                logger.log('Smart Button', '截图和提示文本已成功添加到 ChatGPT 并发送');
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