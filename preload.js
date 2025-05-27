// 在 webview 中注入的预加载脚本
const { ipcRenderer, contextBridge } = require('electron');

console.log('Preload script running in webview');

// 监听页面加载
window.addEventListener('load', () => {
    console.log('Page loaded in webview');
});

// 监听错误
window.addEventListener('error', (event) => {
    console.error('Error in webview:', event.error);
});

// 使用 contextBridge 安全地暴露 API
try {
    contextBridge.exposeInMainWorld('electronAPI', {
        sendToMain: (channel, ...args) => {
            try {
                ipcRenderer.sendToHost(channel, ...args);
                console.log('IPC message sent:', channel, args);
            } catch (error) {
                console.error('Failed to send IPC message:', error);
            }
        }
    });
} catch (error) {
    // 如果 contextBridge 不可用（比如在某些webview中），回退到旧方法
    console.warn('contextBridge not available, using fallback method');
    window.sendToMain = (channel, ...args) => {
        try {
            ipcRenderer.sendToHost(channel, ...args);
            console.log('IPC message sent:', channel, args);
        } catch (error) {
            console.error('Failed to send IPC message:', error);
        }
    };
} 