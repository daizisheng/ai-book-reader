# PDF 颜色模式持久化功能

## 功能概述

AI Book Reader 现在支持 PDF 颜色模式的持久化保存，用户选择的颜色模式会自动保存到 `global.json` 配置文件中，下次启动时会自动恢复上次使用的颜色模式。

## 实现特性

### 1. 多种颜色模式
- **normal** - 正常模式（默认）
- **invert** - 完全反色模式（black ↔ white）
- **dark** - 深色模式（90%反色 + 色相旋转180度）
- **sepia** - 护眼模式（85%反色 + 棕褐色调）
- **grayscale-invert** - 灰度反色模式

### 2. 自动持久化
- 颜色模式变化时自动保存到 `global.json`
- 应用启动时自动恢复上次使用的模式
- 与其他全局设置一起管理

### 3. 按钮状态指示
- 按钮图标颜色根据当前模式变化：
  - 🔴 红色 = 反色模式
  - 🔵 青色 = 深色模式  
  - 🟡 黄色 = 护眼模式
  - ⚪ 灰色 = 灰度反色
  - ⚫ 默认色 = 正常模式
- 悬停提示显示当前模式名称

## 技术实现

### 1. 配置文件结构
```javascript
// config.js
const DEFAULT_CONFIG = {
    defaultColorMode: 'normal', // 默认颜色模式
    // ... 其他配置
};
```

### 2. 全局设置存储
```json
// global.json
{
    "startupPrompt": "...",
    "enableNotifications": true,
    "colorMode": "dark"
}
```

### 3. 核心函数

#### 加载颜色模式配置
```javascript
async function loadColorModeConfig() {
    const globalSettings = await ipcRenderer.invoke('load-global-settings');
    return globalSettings?.colorMode || DEFAULT_CONFIG.defaultColorMode || 'normal';
}
```

#### 保存颜色模式配置
```javascript
async function saveColorModeConfig(colorMode) {
    const existingSettings = await ipcRenderer.invoke('load-global-settings') || {};
    const updatedSettings = { ...existingSettings, colorMode };
    await ipcRenderer.invoke('save-global-settings', updatedSettings);
}
```

#### 初始化颜色模式
```javascript
async function initializeColorMode() {
    const savedColorMode = await loadColorModeConfig();
    currentColorMode = savedColorMode;
    updateColorModeButton(currentColorMode);
}
```

### 4. 自动保存机制
当用户点击颜色模式按钮切换模式时：
1. PDF 查看器发送 `color-mode-changed` 消息
2. 主界面接收消息并更新 `currentColorMode`
3. 自动调用 `saveColorModeConfig()` 保存到 `global.json`
4. 更新按钮外观显示当前状态

## 使用流程

1. **首次使用**：使用默认的 `normal` 模式
2. **切换模式**：点击颜色模式按钮进行切换
3. **自动保存**：每次切换后自动保存到配置文件
4. **重启恢复**：下次启动时自动加载上次使用的模式

## 兼容性

- ✅ 与现有的全局设置系统完全兼容
- ✅ 不影响书籍特定设置
- ✅ 向后兼容，没有配置时使用默认值
- ✅ 配置文件结构向前兼容

## 文件位置

- **配置定义**：`config.js`
- **保存位置**：`~/Library/Application Support/ai-book-reader/global.json` (macOS)
- **主要逻辑**：`renderer.js` (第1756-1798行)

## 优势

🔄 **自动持久化** - 无需手动保存，切换即保存  
🚀 **快速恢复** - 启动时立即恢复上次状态  
🎯 **用户友好** - 按钮颜色直观显示当前模式  
⚡ **性能优化** - 只在变化时保存，避免频繁写入  
🔧 **易于维护** - 与现有设置系统集成，代码简洁  

此功能让用户的颜色模式偏好得到完美保持，大大提升了使用体验！ 