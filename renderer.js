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
            
            // 获取当前解释提示词
            const currentPrompt = await getCurrentExplainPrompt();
            logger.log('Smart Button', '使用提示词:', currentPrompt);
            
            // 读取外部脚本文件
            let pasteScript;
            try {
                pasteScript = fs.readFileSync(path.join(__dirname, 'pasteScript.js'), 'utf8');
                // 替换占位符为实际的提示词
                pasteScript = pasteScript.replace('PROMPT_PLACEHOLDER', currentPrompt);
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