const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// 获取 DOM 元素
const leftWebview = document.getElementById('leftWebview');
const rightWebview = document.getElementById('rightWebview');

// 设置 webview 的基本属性
[leftWebview, rightWebview].forEach(webview => {
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=no');
});

// 设置右侧 webview 使用持久化会话
rightWebview.setAttribute('partition', 'persist:chatgpt');
// 加载 ChatGPT 网站
rightWebview.src = 'https://chat.openai.com';

// 监听来自主进程的消息
ipcRenderer.on('file-opened', (event, filePath) => {
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
        // 将文件路径转换为 file:// URL
        const fileUrl = `file://${filePath}`;
        // 在左侧 webview 中加载 PDF
        leftWebview.src = fileUrl;
    } else {
        console.log('File no longer exists:', filePath);
    }
}); 