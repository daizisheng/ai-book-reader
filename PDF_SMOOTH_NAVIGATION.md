# PDF 平滑翻页功能

## 功能概述

为了解决PDF翻页时的闪烁问题，我们实现了一个基于截图遮罩的平滑翻页功能。这个功能通过在翻页前截取当前页面，然后用截图遮罩覆盖webview，在新页面加载完成后再淡出遮罩，从而提供流畅的翻页体验。

## 实现原理

### 1. 截图遮罩机制

```
翻页流程：
1. 用户点击翻页按钮
2. 截取当前PDF页面
3. 将截图设置为遮罩背景
4. 显示遮罩（覆盖webview）
5. 加载新的PDF页面
6. 等待500ms后开始淡出遮罩
7. 300ms淡出动画完成，移除遮罩
```

### 2. CSS 样式

```css
.pdf-loading-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #1e1e1e;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease-out;
}

.pdf-loading-mask.active {
    opacity: 1;
    pointer-events: auto;
}

.pdf-loading-mask.fade-out {
    opacity: 0;
}
```

### 3. JavaScript 实现

#### 截图和显示遮罩
```javascript
async function captureAndShowMask() {
    try {
        // 截取当前PDF页面
        const screenshot = await leftWebview.capturePage();
        const dataUrl = screenshot.toDataURL();
        
        // 设置遮罩背景图片
        pdfLoadingMask.style.backgroundImage = `url(${dataUrl})`;
        
        // 显示遮罩
        pdfLoadingMask.classList.add('active');
        
        return true;
    } catch (error) {
        return false;
    }
}
```

#### 隐藏遮罩
```javascript
function hideMask() {
    // 添加淡出效果
    pdfLoadingMask.classList.add('fade-out');
    
    // 300ms后完全隐藏遮罩
    setTimeout(() => {
        pdfLoadingMask.classList.remove('active', 'fade-out');
        pdfLoadingMask.style.backgroundImage = '';
    }, 300);
}
```

#### 导航函数
```javascript
async function navigateToPage(pageNumber) {
    // 检查页面是否变化
    if (pageNumber === currentPDFPage) {
        return;
    }
    
    // 先截图并显示遮罩
    const maskShown = await captureAndShowMask();
    
    // 更新页面
    currentPDFPage = pageNumber;
    const pdfUrl = buildPDFUrl(currentFilePath, currentPDFPage);
    leftWebview.loadURL(pdfUrl);
    
    // 500ms后开始隐藏遮罩
    if (maskShown) {
        setTimeout(() => {
            hideMask();
        }, 500);
    }
}
```

## 时间轴

```
0ms     - 用户点击翻页按钮
0-50ms  - 截取当前页面
50ms    - 显示遮罩（瞬间）
60ms    - 开始加载新页面
500ms   - 开始淡出遮罩
800ms   - 遮罩完全消失
```

## 用户体验改进

### 改进前
- ❌ 翻页时出现明显的白屏闪烁
- ❌ 页面加载过程可见，体验不佳
- ❌ 快速翻页时闪烁更加明显

### 改进后
- ✅ 翻页过程平滑，无闪烁
- ✅ 用户看到的是连续的页面切换
- ✅ 快速翻页也能保持流畅体验
- ✅ 保留了原有的所有翻页功能

## 技术特点

### 优势
1. **无侵入性** - 不影响原有的PDF加载机制
2. **高性能** - 截图操作快速，内存占用小
3. **兼容性好** - 适用于所有PDF文件
4. **用户友好** - 提供视觉连续性

### 注意事项
1. **截图时机** - 只在页面确实发生变化时才截图
2. **内存管理** - 及时清理遮罩背景图片
3. **错误处理** - 截图失败时优雅降级
4. **性能优化** - 避免重复截图相同页面

## 支持的操作

所有翻页操作都支持平滑遮罩：

1. **翻页按钮** - 上一页/下一页按钮
2. **页码输入** - 直接输入页码跳转
3. **键盘快捷键** - 如果有的话（未来扩展）

## 配置参数

可以通过修改以下参数来调整体验：

```javascript
// 遮罩显示延迟（等待新页面加载）
const MASK_HIDE_DELAY = 500; // ms

// 淡出动画时间
const FADE_OUT_DURATION = 300; // ms (与CSS transition一致)
```

## 故障排除

### 常见问题

1. **截图失败**
   - 原因：webview未完全加载
   - 解决：函数会优雅降级，不显示遮罩

2. **遮罩不消失**
   - 原因：JavaScript错误
   - 解决：检查控制台错误日志

3. **翻页仍有闪烁**
   - 原因：遮罩时间设置不当
   - 解决：调整MASK_HIDE_DELAY参数

## 未来改进

1. **智能延迟** - 根据PDF大小动态调整遮罩时间
2. **预加载** - 预加载下一页以进一步减少延迟
3. **动画效果** - 添加页面切换动画效果
4. **性能监控** - 监控截图和遮罩性能 