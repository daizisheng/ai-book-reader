const { ipcRenderer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 获取 DOM 元素
const leftWebview = document.getElementById('leftWebview');
const rightWebview = document.getElementById('rightWebview');

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
                console.log(prefix, message);
                break;
            case 1:
                console.warn(prefix, message);
                break;
            case 2:
                console.error(prefix, message);
                break;
            case 3:
                console.debug(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    });
});

// 标记是否已加载过 ChatGPT
let chatgptLoaded = false;
let enableDebug = false;

// 监听主进程传来的 enable-debug 标志
ipcRenderer.on('enable-debug', () => {
    enableDebug = true;
});

// 右侧 webview dom-ready 后加载 ChatGPT（仅第一次）
rightWebview.addEventListener('dom-ready', () => {
    console.log('Right webview DOM ready');
    console.log('Partition:', rightWebview.getAttribute('partition'));
    
    if (!chatgptLoaded) {
        console.log('Loading ChatGPT...');
        rightWebview.loadURL('https://chat.openai.com/');
        chatgptLoaded = true;
    }
    // 只有启用 debug 时才打开 webview 的开发者工具
    if (enableDebug && rightWebview.isDevToolsOpened && !rightWebview.isDevToolsOpened()) {
        rightWebview.openDevTools({ mode: 'detach' });
    }
});

// 等待 DOM 完全加载
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    rightWebview.addEventListener('did-fail-load', (event) => {
        console.error('Failed to load ChatGPT:', event);
        console.error('Error code:', event.errorCode);
        console.error('Error description:', event.errorDescription);
    });

    rightWebview.addEventListener('did-finish-load', () => {
        console.log('Right webview finished loading');
        console.log('Current URL:', rightWebview.getURL());
    });

    rightWebview.addEventListener('did-navigate', (event) => {
        console.log('Navigation completed:', event.url);
    });

    // 拦截新窗口，外部链接用系统浏览器打开
    rightWebview.addEventListener('new-window', (e) => {
        e.preventDefault();
        shell.openExternal(e.url);
    });
});

// 监听来自主进程的消息
ipcRenderer.on('file-opened', (event, filePath) => {
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
        // 将文件路径转换为 file:// URL
        const fileUrl = `file://${filePath}`;
        // 在左侧 webview 中加载 PDF
        leftWebview.loadURL(fileUrl);
    } else {
        console.log('File no longer exists:', filePath);
    }
}); 