# ChatGPT 按钮检测逻辑改进

## 概述

基于对ChatGPT不同状态下HTML结构的分析，我们简化并改进了按钮检测逻辑，使其更加准确和可靠。

## 分析的HTML文件

1. **chatgpt-not-ready-ui.html** - AI正在工作状态
2. **chatgpt-send-ready-ui.html** - 可以发送消息状态  
3. **chatgpt-voice-ready-ui.html** - 语音模式状态

## 关键发现

### 1. AI正在工作状态 (chatgpt-not-ready-ui.html)
- **停止按钮**: `<button id="composer-submit-button" aria-label="停止流式传输" data-testid="stop-button">`
- **特征**: 
  - `data-testid="stop-button"`
  - `aria-label` 包含 "停止" 或 "Stop"
  - SVG图标为方形 (`rect` 元素)

### 2. 可以发送状态 (chatgpt-send-ready-ui.html)
- **发送按钮**: `<button id="composer-submit-button" aria-label="发送提示" data-testid="send-button">`
- **特征**:
  - `data-testid="send-button"`
  - `aria-label` 包含 "发送" 或 "Send"
  - SVG图标为箭头 (`path` 元素)

### 3. 语音模式状态 (chatgpt-voice-ready-ui.html)
- **语音按钮**: `<button data-testid="composer-speech-button" aria-label="启动语音模式">`
- **特征**:
  - `data-testid="composer-speech-button"`
  - `aria-label` 包含 "语音" 或 "Voice"
  - 按钮通常被禁用 (`disabled:opacity-30`)

## 改进的检测逻辑

### 按钮选择器配置

```javascript
const buttonSelectors = {
    stopButtons: [
        'button[data-testid="stop-button"]',                    // 主要选择器
        'button[aria-label*="停止"]',                           // 中文停止按钮
        'button[aria-label*="Stop"]',                           // 英文停止按钮
        'button:has(svg rect[width="10"][height="10"])',        // 通过SVG方形图标检测
        'button#composer-submit-button[aria-label*="停止"]'     // 通过ID和label组合
    ],
    sendButtons: [
        'button[data-testid="send-button"]',                    // 主要选择器
        'button[aria-label*="发送"]',                           // 中文发送按钮
        'button[aria-label*="Send"]',                           // 英文发送按钮
        'button:has(svg path[d*="14.9993V5.41334"])',          // 通过SVG箭头图标检测
        'button#composer-submit-button[aria-label*="发送"]',    // 通过ID和label组合
        'button#composer-submit-button[aria-label*="Send"]'     // 英文版本
    ],
    voiceButtons: [
        'button[data-testid="composer-speech-button"]',         // 主要选择器
        'button[aria-label*="语音"]',                           // 中文语音按钮
        'button[aria-label*="Voice"]',                          // 英文语音按钮
        'button[aria-label*="启动语音模式"]'                    // 具体的语音模式按钮
    ]
};
```

### 智能检测函数

```javascript
function findButton(selectors, buttonType) {
    for (const selector of selectors) {
        try {
            const button = document.querySelector(selector);
            if (button) {
                console.log(`找到${buttonType}按钮:`, selector, button.getAttribute('aria-label'));
                return button;
            }
        } catch (error) {
            console.log(`选择器 "${selector}" 执行失败:`, error.message);
        }
    }
    return null;
}
```

## 检测流程

1. **检测停止按钮** - 如果找到，说明AI正在工作，返回 `ai_working`
2. **检测发送按钮** - 如果找到，说明可以发送消息，继续执行
3. **检测语音按钮** - 如果只找到语音按钮，说明处于语音模式，抛出错误

## 优势

1. **更准确**: 基于实际HTML结构分析，使用最可靠的选择器
2. **更健壮**: 多重选择器备选方案，提高兼容性
3. **更简洁**: 统一的检测函数，减少重复代码
4. **更易维护**: 配置化的选择器，便于更新和调试

## 测试结果

所有三种状态的检测测试均通过：
- ✅ AI工作状态检测正确
- ✅ 发送就绪状态检测正确  
- ✅ 语音模式状态检测正确

## 文件更新

1. **pasteScript.js** - 更新了按钮检测逻辑
2. **config.js** - 添加了按钮选择器配置
3. 测试验证了所有改进的正确性 