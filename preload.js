// 在 webview 中注入的预加载脚本
console.log('Preload script running in webview');

// 监听页面加载
window.addEventListener('load', () => {
    console.log('Page loaded in webview');
});

// 监听错误
window.addEventListener('error', (event) => {
    console.error('Error in webview:', event.error);
}); 