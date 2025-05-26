# 设置模态框快捷键支持实现

## 问题背景

用户希望在设置模态框中的输入框也能支持标准的快捷键操作（Ctrl+C/V/X/A/Z等），而不是被全局的webview快捷键处理器拦截。

## 解决方案

### 1. 智能快捷键检测

在 `renderer.js` 中的全局键盘事件监听器中添加了智能检测逻辑：

```javascript
// 检查设置模态框是否打开
const isSettingsModalOpen = settingsModal && settingsModal.classList.contains('show');

// 检查当前焦点是否在输入框或文本区域
const activeElement = document.activeElement;
const isInputElement = activeElement && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA' || 
    activeElement.contentEditable === 'true'
);
```

### 2. 条件处理逻辑

根据不同的状态组合，采用不同的处理策略：

#### 场景1：设置模态框打开 + 焦点在输入框
```javascript
if (isSettingsModalOpen && isInputElement) {
    // 允许标准快捷键正常工作，不拦截
    switch (event.key.toLowerCase()) {
        case 'c':
        case 'v':
        case 'x':
        case 'a':
        case 'z':
            logger.log('Settings Modal', `允许 Ctrl+${event.key.toUpperCase()} 在输入框中执行`);
            return; // 不阻止默认行为
    }
}
```

#### 场景2：设置模态框打开 + 焦点不在输入框
```javascript
if (isSettingsModalOpen && !isInputElement) {
    // 设置模态框打开但不在输入框中，不处理webview命令
    return;
}
```

#### 场景3：设置模态框关闭
```javascript
// 正常处理webview快捷键
executeWebviewCommand(getFocusedWebview(), command);
```

### 3. ESC键关闭模态框

添加了ESC键快捷关闭设置模态框的功能，ESC键不需要Ctrl修饰符：

```javascript
// ESC键不需要修饰符，单独处理
if (event.key === 'Escape') {
    const isSettingsModalOpen = settingsModal && settingsModal.classList.contains('show');
    if (isSettingsModalOpen) {
        logger.log('Settings Modal', 'ESC键关闭设置模态框');
        closeSettingsModal();
        event.preventDefault();
        event.stopPropagation();
        return;
    }
}
```

### 4. 特殊快捷键处理

对于一些不适合在设置模态框中使用的快捷键，进行了特殊处理：

- **刷新快捷键（Ctrl+R/Shift+R）**：设置模态框打开时不处理
- **缩放快捷键（Ctrl+0/+/-）**：设置模态框打开时不处理

```javascript
case 'r':
    if (isSettingsModalOpen) {
        // 设置模态框打开时，不处理刷新快捷键
        return;
    }
    // ... 正常处理
    break;
```

## 支持的快捷键

### 在设置模态框输入框中支持的快捷键

- **Ctrl+C / Cmd+C**: 复制选中文本
- **Ctrl+V / Cmd+V**: 粘贴文本
- **Ctrl+X / Cmd+X**: 剪切选中文本
- **Ctrl+A / Cmd+A**: 全选文本
- **Ctrl+Z / Cmd+Z**: 撤销输入
- **Ctrl+Shift+Z / Cmd+Shift+Z**: 重做输入

### 设置模态框专用快捷键

- **ESC**: 关闭设置模态框

### 在设置模态框中被禁用的快捷键

- **Ctrl+R / Cmd+R**: 刷新（避免意外刷新丢失设置）
- **Ctrl+0/+/- / Cmd+0/+/-**: 缩放（不适用于模态框）

## 技术实现细节

### 1. 状态检测

```javascript
// 检测设置模态框状态
const isSettingsModalOpen = settingsModal && settingsModal.classList.contains('show');

// 检测输入元素焦点
const activeElement = document.activeElement;
const isInputElement = activeElement && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA' || 
    activeElement.contentEditable === 'true'
);
```

### 2. 事件处理优先级

1. **最高优先级**：设置模态框中的输入框快捷键
2. **中等优先级**：设置模态框专用快捷键（ESC）
3. **最低优先级**：webview快捷键

### 3. 日志记录

所有快捷键操作都有详细的日志记录：

```javascript
logger.log('Settings Modal', '设置模态框中的输入框，允许标准快捷键');
logger.log('Settings Modal', `允许 Ctrl+${event.key.toUpperCase()} 在输入框中执行`);
logger.log('Settings Modal', 'ESC键关闭设置模态框');
```

## 用户体验

### 1. 直观的操作

- 在输入框中使用熟悉的快捷键
- 不需要学习新的操作方式
- 与系统标准行为一致

### 2. 智能切换

- 自动检测当前上下文
- 在不同状态间无缝切换
- 避免快捷键冲突

### 3. 安全保护

- 防止在设置模态框中意外触发刷新
- 避免缩放操作影响模态框显示
- ESC键提供快速退出方式

## 测试场景

### 1. 基本文本编辑
1. 打开设置模态框
2. 在书名输入框中输入文本
3. 使用Ctrl+A全选，Ctrl+C复制
4. 切换到作者输入框，使用Ctrl+V粘贴
5. 验证操作正常

### 2. 撤销重做
1. 在解释提示词文本框中输入文本
2. 使用Ctrl+Z撤销输入
3. 使用Ctrl+Shift+Z重做输入
4. 验证撤销重做功能正常

### 3. ESC键关闭
1. 打开设置模态框
2. 按ESC键
3. 验证模态框关闭

### 4. 快捷键隔离
1. 打开设置模态框
2. 按Ctrl+R（刷新）
3. 验证页面不会刷新
4. 关闭模态框后再按Ctrl+R
5. 验证webview正常刷新

## 兼容性

- **跨平台**：支持Windows（Ctrl）和macOS（Cmd）
- **多输入类型**：支持input、textarea和contentEditable元素
- **向后兼容**：不影响现有的webview快捷键功能

## 总结

这个实现提供了完整的设置模态框快捷键支持，通过智能的状态检测和条件处理，确保用户在不同上下文中都能获得最佳的快捷键体验。同时保持了系统的一致性和安全性。 