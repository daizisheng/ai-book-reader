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
        
        // 停止按钮选择器（AI正在工作时）
        stopButtons: [
            'button[data-testid="stop-button"]',                    // 主要选择器
            'button[aria-label*="停止"]',                           // 中文停止按钮
            'button[aria-label*="Stop"]',                           // 英文停止按钮
            'button:has(svg rect[width="10"][height="10"])',        // 通过SVG方形图标检测
            'button#composer-submit-button[aria-label*="停止"]'     // 通过ID和label组合
        ],
        
        // 发送按钮选择器（可以发送时）
        sendButtons: [
            'button[data-testid="send-button"]',                    // 主要选择器
            'button[aria-label*="发送"]',                           // 中文发送按钮
            'button[aria-label*="Send"]',                           // 英文发送按钮
            'button:has(svg path[d*="14.9993V5.41334"])',          // 通过SVG箭头图标检测
            'button#composer-submit-button[aria-label*="发送"]',    // 通过ID和label组合
            'button#composer-submit-button[aria-label*="Send"]'     // 英文版本
        ],
        
        // 语音按钮选择器（语音模式时）
        voiceButtons: [
            'button[data-testid="composer-speech-button"]',         // 主要选择器
            'button[aria-label*="语音"]',                           // 中文语音按钮
            'button[aria-label*="Voice"]',                          // 英文语音按钮
            'button[aria-label*="启动语音模式"]'                    // 具体的语音模式按钮
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