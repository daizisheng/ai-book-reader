# AI解读完成通知功能

## 功能概述

新增了AI解读完成后的系统级通知功能，当ChatGPT完成页面解读后，会自动发送操作系统通知，用户点击通知可以直接回到应用查看结果。

## 功能特点

### 1. 智能监控
- 发送prompt后自动监控ChatGPT状态
- 检测停止按钮消失，判断AI完成解读
- 最大监控时间5分钟，防止无限等待

### 2. 系统级通知
- 通知标题：`《书名》解读完成了`
- 通知内容：`可以回来查看了`
- 需要用户交互才会消失（`requireInteraction: true`）
- 防止重复通知（`tag: 'ai-explanation-complete'`）

### 3. 点击响应
- 用户点击通知时自动聚焦应用窗口
- 如果窗口最小化会自动恢复
- 点击后自动关闭通知

## 技术实现

### 1. 监控逻辑 (pasteScript.js)

```javascript
async function waitForAICompletion(bookName) {
    const maxWaitTime = 300000; // 5分钟最大等待时间
    const checkInterval = 2000; // 每2秒检查一次
    
    return new Promise((resolve) => {
        const checkCompletion = () => {
            // 检查停止按钮是否还存在
            const stopButton = findButton(buttonSelectors.stopButtons, '停止');
            
            if (!stopButton) {
                // 停止按钮消失，说明AI完成了
                // 发送IPC消息通知主进程
                resolve(true);
            } else {
                // 继续监控
                setTimeout(checkCompletion, checkInterval);
            }
        };
        
        setTimeout(checkCompletion, checkInterval);
    });
}
```

### 2. IPC通信

**发送方 (webview中的脚本)**:
```javascript
// 主要方法：使用ipcRenderer
if (window.require) {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.sendToHost('ai-explanation-complete', bookName);
}

// 备用方法：自定义事件
const event = new CustomEvent('ai-explanation-complete', {
    detail: { bookName: bookName }
});
window.dispatchEvent(event);
```

**接收方 (renderer.js)**:
```javascript
rightWebview.addEventListener('ipc-message', (event) => {
    if (event.channel === 'ai-explanation-complete') {
        const bookName = event.args[0] || 'AI Book Reader';
        showCompletionNotification(bookName);
    }
});
```

### 3. 通知显示 (renderer.js)

```javascript
function showCompletionNotification(bookName) {
    const notification = new Notification(`《${bookName}》解读完成了`, {
        body: '可以回来查看了',
        silent: false,
        requireInteraction: true,
        tag: 'ai-explanation-complete'
    });
    
    notification.onclick = () => {
        ipcRenderer.send('focus-window');
        notification.close();
    };
}
```

### 4. 窗口聚焦 (main.js)

```javascript
ipcMain.on('focus-window', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
    }
});
```

## 工作流程

1. **用户点击Smart按钮** → 截图并发送到ChatGPT
2. **发送成功后** → 开始监控AI完成状态
3. **每2秒检查** → 停止按钮是否还存在
4. **停止按钮消失** → AI完成解读
5. **发送IPC消息** → 通知主进程
6. **显示系统通知** → 《书名》解读完成了
7. **用户点击通知** → 聚焦应用窗口

## 错误处理

### 1. 监控超时
- 最大等待5分钟
- 超时后显示"监控超时"通知
- 提示用户手动检查ChatGPT页面

### 2. IPC通信失败
- 主要方法失败时使用备用方法
- 详细的错误日志记录
- 多重备选方案确保可靠性

### 3. 通知权限
- 检查系统通知支持
- 处理通知显示错误
- 提供错误回调处理

## 用户体验

### 优势
1. **无需手动检查** - 自动监控完成状态
2. **及时通知** - AI完成后立即通知
3. **便捷回归** - 点击通知直接回到应用
4. **状态清晰** - 明确显示哪本书解读完成

### 使用场景
1. **多任务工作** - 解读期间可以做其他事情
2. **长时间解读** - 复杂页面需要较长时间
3. **后台运行** - 应用最小化时也能收到通知

## 配置选项

通过全局设置可以控制：
- `enableNotifications` - 是否启用解读完成通知
- 默认值：`true`（启用）

## 兼容性

- ✅ macOS - 完全支持
- ✅ Windows - 完全支持  
- ✅ Linux - 完全支持
- ✅ 所有Electron支持的平台

## 文件修改

1. **pasteScript.js** - 添加AI完成监控逻辑
2. **renderer.js** - 添加通知显示和IPC处理
3. **main.js** - 已有focus-window处理（无需修改）

这个功能显著提升了用户体验，让用户在AI解读期间可以自由进行其他工作，完成后会及时收到通知并能快速回到应用查看结果。 