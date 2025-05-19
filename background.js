import ollamaService from './ollama-service.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYZE_TEXT') {
        analyzeAndNotify(message.text, sender.tab.id);
    }
});

async function analyzeAndNotify(text, tabId) {
    try {
        const analysis = await ollamaService.analyzeText(text);
        
        // Show notification based on risk level
        if (analysis.risk_level === 'high') {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '⚠️ High Risk Privacy Concerns Detected',
                message: analysis.summary,
                priority: 2
            });
        }

        // Send analysis results back to the popup
        chrome.tabs.sendMessage(tabId, {
            type: 'ANALYSIS_RESULTS',
            results: analysis
        });
    } catch (error) {
        console.error('Error in background script:', error);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Error',
            message: 'Failed to analyze privacy terms',
            priority: 2
        });
    }
}
