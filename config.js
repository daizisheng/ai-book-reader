// AI Book Reader 默认配置
const DEFAULT_CONFIG = {
    // 默认解释提示词
    defaultExplainPrompt: '请用中文解释本页内容',
    
    // 默认启动提示词
    defaultStartupPrompt: '你是费曼，我将会逐页的给你上传书籍的截图，请你给我讲解每一页的内容',
    
    // 默认通知设置
    defaultNotificationEnabled: true,
    
    // 等待时间配置（毫秒）
    waitTimes: {
        pasteDelay: 500,           // 粘贴操作之间的等待时间
        uploadCheck: 100,          // 检查上传状态的间隔
        maxUploadWait: 50000,      // 最大等待上传时间（50秒）
        sendButtonWait: 1000,      // 等待发送按钮的间隔
        maxSendWait: 30000,        // 最大等待发送按钮时间（30秒）
        completionCheck: 2000,     // 检查完成状态的间隔
        maxCompletionWait: 300000  // 最大等待完成时间（5分钟）
    },
    
    // UI 选择器
    selectors: {
        editor: '.ProseMirror[contenteditable="true"]',
        sendButton: [
            'button[data-testid="send-button"]',
            'button[aria-label="Send message"]',
            'button:has(svg)'
        ],
        uploadElements: [
            '[data-testid*="upload"]',
            '[class*="upload"]',
            '[class*="attachment"]',
            '[data-testid*="file"]',
            '[class*="file"]',
            '[class*="file-upload"]',
            '[class*="image-upload"]',
            '[data-testid*="image"]',
            '[class*="progress"]',
            '[class*="loading"]',
            '[class*="uploading"]'
        ]
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEFAULT_CONFIG;
} else if (typeof window !== 'undefined') {
    window.DEFAULT_CONFIG = DEFAULT_CONFIG;
} 