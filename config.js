// AI Book Reader 默认配置
const DEFAULT_CONFIG = {
    // 默认解释提示词
    defaultExplainPrompt: '请用中文解释本页内容',
    
    // 默认启动提示词
    defaultStartupPrompt: '你是费曼，我将会逐页的给你上传书籍的截图，请你给我讲解每一页的内容',
    
    // 默认通知设置
    defaultNotificationEnabled: true,
    
    // 默认布局设置
    defaultLeftPanelWidth: 50, // 左侧面板宽度百分比
    
    // 默认颜色模式设置
    defaultColorMode: 'normal', // 默认颜色模式：normal, invert, dark, sepia, grayscale-invert
    
    // 等待时间配置（毫秒）
    waitTimes: {
        imageUploadWait: 3000,     // 图片上传等待时间
        maxSendWait: 30000,        // 最大等待发送按钮时间（30秒）
        sendCheckInterval: 1000,   // 检查发送按钮的间隔（1秒）
        maxMonitorWait: 300000,    // 最大监控AI完成时间（5分钟）
        monitorCheckInterval: 5000 // 检查AI完成状态的间隔（5秒）
    },
    
    // 简化的选择器配置
    selectors: {
        editor: '.ProseMirror[contenteditable="true"]',
        sendButton: 'button[data-testid="send-button"]',
        stopButton: 'button[data-testid="stop-button"]',
        voiceButton: 'button[data-testid="composer-speech-button"]'
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEFAULT_CONFIG;
} else if (typeof window !== 'undefined') {
    window.DEFAULT_CONFIG = DEFAULT_CONFIG;
} 