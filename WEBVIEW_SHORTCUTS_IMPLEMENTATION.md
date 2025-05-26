# Webview 快捷键支持实现

## 问题背景

Electron 中的 webview 默认不支持标准的快捷键（如 Ctrl+C/V 等），需要手动实现快捷键转发机制。

## 解决方案

### 1. 应用菜单快捷键

在 `main.js` 中创建完整的应用菜单，包含所有标准快捷键：

```javascript
const template = [
    {
        label: '编辑',
        submenu: [
            {
                label: '撤销',
                accelerator: 'CmdOrCtrl+Z',
                click: () => {
                    mainWindow.webContents.send('webview-command', 'undo');
                }
            },
            {
                label: '重做',
                accelerator: 'Shift+CmdOrCtrl+Z',
                click: () => {
                    mainWindow.webContents.send('webview-command', 'redo');
                }
            },
            {
                label: '剪切',
                accelerator: 'CmdOrCtrl+X',
                click: () => {
                    mainWindow.webContents.send('webview-command', 'cut');
                }
            },
            {
                label: '复制',
                accelerator: 'CmdOrCtrl+C',
                click: () => {
                    mainWindow.webContents.send('webview-command', 'copy');
                }
            },
            {
                label: '粘贴',
                accelerator: 'CmdOrCtrl+V',
                click: () => {
                    mainWindow.webContents.send('webview-command', 'paste');
                }
            },
            {
                label: '全选',
                accelerator: 'CmdOrCtrl+A',
                click: () => {
                    mainWindow.webContents.send('webview-command', 'selectAll');
                }
            }
        ]
    }
];
```

### 2. Webview 焦点检测

在 `renderer.js` 中实现智能的 webview 焦点检测：

```javascript
function getFocusedWebview() {
    // 1. 检查当前焦点元素
    if (document.activeElement === leftWebview) {
        return leftWebview;
    } else if (document.activeElement === rightWebview) {
        return rightWebview;
    }
    
    // 2. 使用最近交互的webview
    const lastInteraction = getLastWebviewInteraction();
    if (lastInteraction) {
        return lastInteraction;
    }
    
    // 3. 默认使用右侧webview（ChatGPT）
    return rightWebview;
}
```

### 3. 交互跟踪

跟踪用户与 webview 的交互，确定最近使用的 webview：

```javascript
[leftWebview, rightWebview].forEach(webview => {
    webview.addEventListener('focus', () => {
        lastWebviewInteraction = webview;
    });
    
    webview.addEventListener('click', () => {
        lastWebviewInteraction = webview;
    });
    
    webview.addEventListener('mousedown', () => {
        lastWebviewInteraction = webview;
    });
});
```

### 4. 命令执行

将快捷键命令转发到目标 webview：

```javascript
function executeWebviewCommand(webview, command) {
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
        // 缩放命令
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
    }
}
```

### 5. 备用键盘监听器

添加全局键盘事件监听器作为备用方案：

```javascript
document.addEventListener('keydown', (event) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (!isCtrlOrCmd) return;
    
    let handled = false;
    
    switch (event.key.toLowerCase()) {
        case 'c':
            executeWebviewCommand(getFocusedWebview(), 'copy');
            handled = true;
            break;
        case 'v':
            executeWebviewCommand(getFocusedWebview(), 'paste');
            handled = true;
            break;
        case 'x':
            executeWebviewCommand(getFocusedWebview(), 'cut');
            handled = true;
            break;
        case 'a':
            executeWebviewCommand(getFocusedWebview(), 'selectAll');
            handled = true;
            break;
        case 'z':
            if (event.shiftKey) {
                executeWebviewCommand(getFocusedWebview(), 'redo');
            } else {
                executeWebviewCommand(getFocusedWebview(), 'undo');
            }
            handled = true;
            break;
    }
    
    if (handled) {
        event.preventDefault();
        event.stopPropagation();
    }
});
```

## 支持的快捷键

### 编辑操作
- **Ctrl+C / Cmd+C**: 复制
- **Ctrl+V / Cmd+V**: 粘贴
- **Ctrl+X / Cmd+X**: 剪切
- **Ctrl+A / Cmd+A**: 全选
- **Ctrl+Z / Cmd+Z**: 撤销
- **Ctrl+Shift+Z / Cmd+Shift+Z**: 重做

### 视图操作
- **Ctrl+R / Cmd+R**: 重新加载
- **Ctrl+Shift+R / Cmd+Shift+R**: 强制重新加载
- **Ctrl+0 / Cmd+0**: 重置缩放
- **Ctrl++ / Cmd++**: 放大
- **Ctrl+- / Cmd+-**: 缩小

### 窗口操作
- **Ctrl+M / Cmd+M**: 最小化
- **Ctrl+W / Cmd+W**: 关闭窗口
- **Alt+Cmd+I / Ctrl+Shift+I**: 切换开发者工具

### 文件操作
- **Ctrl+O / Cmd+O**: 打开文件
- **Ctrl+Q / Cmd+Q**: 退出应用

## 技术特点

### 1. 双重保障
- 应用菜单快捷键（主要方案）
- 全局键盘监听器（备用方案）

### 2. 智能焦点检测
- 当前焦点元素检测
- 最近交互记录
- 默认目标选择

### 3. 跨平台兼容
- 自动检测 macOS（Cmd）和 Windows/Linux（Ctrl）
- 平台特定的快捷键组合

### 4. 详细日志
- 快捷键触发日志
- webview 焦点变化日志
- 命令执行状态日志

## 使用场景

### 1. PDF 阅读器（左侧 webview）
- 复制文本内容
- 缩放页面
- 刷新页面

### 2. ChatGPT 界面（右侧 webview）
- 复制/粘贴对话内容
- 撤销/重做输入
- 全选文本

### 3. 通用操作
- 在两个 webview 之间无缝切换
- 统一的快捷键体验
- 符合用户习惯的操作方式

## 调试和测试

### 启用调试日志
```bash
npm start -- --enable-debug
```

### 测试快捷键
1. 在左侧 PDF 中选择文本，按 Ctrl+C 复制
2. 切换到右侧 ChatGPT，按 Ctrl+V 粘贴
3. 在 ChatGPT 中输入文本，按 Ctrl+Z 撤销
4. 按 Ctrl+A 全选，按 Ctrl+X 剪切

### 查看日志
- 快捷键触发会在控制台显示日志
- webview 焦点变化会被记录
- 命令执行结果会被追踪

## 总结

这个实现提供了完整的 webview 快捷键支持，解决了 Electron webview 默认不支持快捷键的问题。通过双重保障机制和智能焦点检测，确保用户可以在任何情况下使用熟悉的快捷键操作。 