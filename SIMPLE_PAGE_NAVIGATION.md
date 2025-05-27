# 简化的PDF翻页功能

## 概述

AI Book Reader现在实现了简化的PDF翻页功能，通过直接修改URL中的`page`参数来控制PDF页面，并自动保存和恢复当前页面位置。

## 功能特性

### 1. 翻页按钮
在标题栏右侧添加了两个翻页按钮：
- **←** 上一页按钮
- **→** 下一页按钮

### 2. URL参数控制
- 只使用 `#page=N` 参数控制页面
- 放弃了缩放参数，保持简单
- 例如：`file:///path/to/file.pdf#page=5`

### 3. 页面记忆功能
- 自动保存当前文件的当前页面
- 下次打开同一文件时自动跳转到上次阅读的页面
- 基于文件MD5哈希值进行识别

### 4. 右侧URL记忆
- 自动保存右侧webview的URL
- 下次启动应用时自动加载上次访问的URL

## 技术实现

### 核心函数

#### `buildPDFUrl(filePath, page)`
构建带页面参数的PDF URL：
```javascript
function buildPDFUrl(filePath, page = null) {
    const baseUrl = `file://${filePath}`;
    
    if (page !== null && page > 0) {
        return `${baseUrl}#page=${page}`;
    }
    
    return baseUrl;
}
```

#### 翻页函数
```javascript
// 下一页
function nextPage() {
    navigateToPage(currentPDFPage + 1);
}

// 上一页
function previousPage() {
    if (currentPDFPage > 1) {
        navigateToPage(currentPDFPage - 1);
    }
}

// 导航到指定页面
function navigateToPage(pageNumber) {
    if (!currentFilePath) return;
    
    if (pageNumber < 1) pageNumber = 1;
    
    currentPDFPage = pageNumber;
    const pdfUrl = buildPDFUrl(currentFilePath, currentPDFPage);
    leftWebview.loadURL(pdfUrl);
    
    // 自动保存当前页面状态
    saveCurrentPageState();
}
```

### 状态管理

#### 页面状态保存
```javascript
async function saveCurrentPageState() {
    if (!currentFilePath || !currentFileMD5) return;
    
    const pageState = {
        currentPage: currentPDFPage,
        lastAccessed: new Date().toISOString()
    };
    
    await ipcRenderer.invoke('save-page-state', currentFileMD5, pageState);
}
```

#### 页面状态加载
```javascript
async function loadPageState() {
    if (!currentFilePath || !currentFileMD5) return null;
    
    const pageState = await ipcRenderer.invoke('load-page-state', currentFileMD5);
    return pageState;
}
```

### 数据存储

应用在用户目录下创建以下文件来保存状态：
- `~/.ai-book-reader/page-states.json` - 保存各文件的页面状态
- `~/.ai-book-reader/right-webview-url.json` - 保存右侧webview的URL

## 使用方法

### 基本翻页
1. 打开PDF文件后，使用标题栏的翻页按钮
2. **←** 按钮：上一页（如果当前不是第一页）
3. **→** 按钮：下一页

### 自动记忆
1. 翻页时自动保存当前页面
2. 关闭应用后重新打开同一文件，自动跳转到上次阅读的页面
3. 右侧ChatGPT页面的URL也会自动保存和恢复

## 按钮状态

翻页按钮的状态会根据文件状态自动更新：
- **有文件打开时**：按钮可用，透明度100%
- **无文件打开时**：按钮禁用，透明度50%，鼠标悬停显示"不可用"

## 日志输出

所有翻页操作都会记录详细日志：
```
[PDF Navigation] 导航到第5页，URL: file:///path/to/file.pdf#page=5
[Page State] 页面状态已保存: {currentPage: 5, lastAccessed: "2024-01-01T12:00:00.000Z"}
[Right Webview URL] 已保存URL: https://chatgpt.com/c/xxx
```

## 优势

1. **简单直接**：只通过URL参数控制，无复杂逻辑
2. **自动保存**：无需手动操作，自动记忆阅读进度
3. **快速响应**：直接修改URL，响应迅速
4. **持久化**：重启应用后保持阅读状态
5. **轻量级**：最小化的状态管理，只保存必要信息

这个简化的实现专注于核心的翻页和记忆功能，去除了复杂的缩放控制和键盘快捷键，提供了更直观和可靠的用户体验。 