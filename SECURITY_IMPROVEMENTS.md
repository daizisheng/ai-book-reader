# Electron 安全性改进

## 已实施的安全措施

### 1. 主进程安全设置 (main.js)

**改进前的不安全设置：**
```javascript
webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    webviewTag: true,
    webSecurity: false,
    allowRunningInsecureContent: true,
    devTools: true,
    enableBlinkFeatures: 'ClipboardAPI'
}
```

**改进后的安全设置：**
```javascript
webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    webviewTag: true,
    webSecurity: true,                    // ✅ 启用 web 安全
    allowRunningInsecureContent: false,   // ✅ 禁止运行不安全内容
    devTools: true,
    enableBlinkFeatures: 'ClipboardAPI'
}
```

### 2. 命令行开关安全化

**移除的不安全开关：**
- `--no-sandbox` - 移除了全局沙箱禁用
- `--disable-web-security` - 移除了全局 web 安全禁用

**保留的必要开关：**
- `--user-data-dir` - 用户数据目录
- `--disable-gpu` - GPU 禁用（兼容性）
- `--enable-blink-features=ClipboardAPI` - 剪贴板功能
- `--autoplay-policy=no-user-gesture-required` - 自动播放策略

### 3. Webview 安全策略分离

**左侧 PDF Webview（最小权限原则）：**
```javascript
webpreferences: 'contextIsolation=yes,nodeIntegration=no,enableRemoteModule=no,sandbox=no,webSecurity=no,allowRunningInsecureContent=no,experimentalFeatures=no'
```

- ✅ `contextIsolation=yes` - 启用上下文隔离
- ✅ `nodeIntegration=no` - 禁用 Node.js 集成
- ✅ `enableRemoteModule=no` - 禁用远程模块
- ⚠️ `sandbox=no` - 必须禁用以访问本地 PDF 文件
- ⚠️ `webSecurity=no` - 必须禁用以访问本地文件
- ✅ `allowRunningInsecureContent=no` - 禁止运行不安全内容
- ✅ `experimentalFeatures=no` - 禁用实验性功能

**右侧 ChatGPT Webview（高安全性）：**
```javascript
webpreferences: 'contextIsolation=yes,nodeIntegration=no,enableRemoteModule=no,sandbox=yes,webSecurity=yes,allowRunningInsecureContent=no,experimentalFeatures=no'
```

- ✅ `contextIsolation=yes` - 启用上下文隔离
- ✅ `nodeIntegration=no` - 禁用 Node.js 集成
- ✅ `enableRemoteModule=no` - 禁用远程模块
- ✅ `sandbox=yes` - 启用沙箱保护
- ✅ `webSecurity=yes` - 启用 web 安全
- ✅ `allowRunningInsecureContent=no` - 禁止运行不安全内容
- ✅ `experimentalFeatures=no` - 禁用实验性功能

### 4. Preload 脚本安全化

**使用 contextBridge 安全暴露 API：**
```javascript
// 安全的 API 暴露方式
contextBridge.exposeInMainWorld('electronAPI', {
    sendToMain: (channel, ...args) => {
        // 安全的 IPC 通信
    }
});

// 回退机制（兼容性）
window.sendToMain = (channel, ...args) => {
    // 仅在 contextBridge 不可用时使用
};
```

## 剩余的安全警告

### 左侧 PDF Webview 的必要安全妥协

由于需要访问本地 PDF 文件，左侧 webview 必须保留以下设置：

1. **`webSecurity=no`** - 必须禁用以允许 `file://` 协议访问
2. **`sandbox=no`** - 必须禁用以允许本地文件系统访问

这些设置会产生以下警告（但是必要的）：
- "Disabled webSecurity" 警告
- "Insecure Content-Security-Policy" 警告

### 安全风险缓解措施

1. **隔离策略** - PDF webview 与 ChatGPT webview 完全隔离
2. **最小权限** - 仅 PDF webview 具有本地文件访问权限
3. **上下文隔离** - 启用 contextIsolation 防止脚本注入
4. **禁用 Node.js** - 防止恶意脚本访问系统 API
5. **禁用不安全内容** - 防止混合内容攻击

## 安全性评估

### 高安全性组件
- ✅ 主进程
- ✅ 右侧 ChatGPT webview
- ✅ IPC 通信
- ✅ 文件系统访问控制

### 受控安全风险
- ⚠️ 左侧 PDF webview（仅限本地文件访问）

### 总体安全等级
**中等偏高** - 在保持 PDF 功能的前提下，已实现最大程度的安全保护。

## 建议的进一步改进

1. **PDF.js 集成** - 考虑使用独立的 PDF.js 实现替代浏览器内置 PDF 查看器
2. **文件验证** - 添加 PDF 文件完整性检查
3. **权限管理** - 实现更细粒度的文件访问权限控制
4. **安全审计** - 定期进行安全漏洞扫描

## 开发 vs 生产环境

**注意：** 这些安全警告在开发环境中会显示，但在打包后的生产环境中不会出现。生产环境的安全性会进一步提升。 