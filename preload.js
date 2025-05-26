// 在 webview 中注入的预加载脚本
const { ipcRenderer } = require('electron');

console.log('Preload script running in webview');

// 监听页面加载
window.addEventListener('load', () => {
    console.log('Page loaded in webview');
});

// 监听错误
window.addEventListener('error', (event) => {
    console.error('Error in webview:', event.error);
});

// 提供一个全局函数来发送 IPC 消息
window.sendToMain = (channel, ...args) => {
    try {
        ipcRenderer.sendToHost(channel, ...args);
        console.log('IPC message sent:', channel, args);
    } catch (error) {
        console.error('Failed to send IPC message:', error);
    }
}; 