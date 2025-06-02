# 总页数显示功能

## 功能描述

在页码输入框旁边添加了总页数显示，格式为 `/ 123`，其中123是PDF的总页数。

## 实现细节

### 1. HTML结构修改

在 `index.html` 中的页码输入框后添加了一个新的span元素：

```html
<input type="number" id="pageInput" class="page-input" title="当前页码，按回车跳转" min="1" placeholder="1">
<span id="totalPagesDisplay" class="total-pages-display">/ 0</span>
```

### 2. CSS样式

为总页数显示元素添加了样式：

```css
.total-pages-display {
    -webkit-app-region: no-drag;
    color: #999;
    font-size: 12px;
    margin-right: 8px;
    margin-left: 2px;
}
```

### 3. JavaScript逻辑

#### DOM元素引用
在 `renderer.js` 中添加了对新元素的引用：
```javascript
const totalPagesDisplay = document.getElementById('totalPagesDisplay');
```

#### PDF加载事件处理
修改了PDF加载事件处理器，在PDF加载完成时更新总页数显示：
```javascript
leftWebview.addEventListener('ipc-message', (event) => {
    if (event.channel === 'pdf-loaded') {
        const { page, totalPages } = event.args[0];
        logger.log('PDF Loaded', `页面 ${page}/${totalPages} 已加载`);
        currentPDFPage = page;
        pageInput.value = page;
        totalPagesDisplay.textContent = `/ ${totalPages}`;
        saveCurrentPageState();
    } else if (event.channel === 'pdf-error') {
        logger.error('PDF Error', event.args[0]);
    }
});
```

#### 按钮状态更新
在 `updateButtonStates()` 函数中添加了总页数显示的重置逻辑：
```javascript
// 更新页码输入框的值
if (hasFile) {
    pageInput.value = currentPDFPage;
} else {
    pageInput.value = '';
    pageInput.placeholder = '1';
    totalPagesDisplay.textContent = '/ 0';
}
```

## 功能特性

1. **自动更新**: 当PDF文件加载完成时，总页数会自动显示
2. **状态重置**: 当没有文件打开时，显示为 `/ 0`
3. **样式一致**: 与现有UI风格保持一致
4. **响应式**: 在文件切换时正确更新

## 使用场景

- 用户可以快速了解当前PDF的总页数
- 在页码输入时可以参考总页数避免输入超出范围的页码
- 提供更好的阅读体验和导航参考

## 技术实现

总页数信息来源于PDF.js库，通过以下流程传递：

1. `pdf-viewer.html` 中的 `loadPDF()` 函数获取PDF总页数
2. 通过 `window.parent.postMessage()` 发送给主窗口
3. `renderer.js` 中的事件监听器接收并更新显示

这确保了总页数信息的准确性和实时性。 