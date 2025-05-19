document.getElementById('scan').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="loading">Scanning page...</div>';

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];

        // Check if we have permission to access the current URL
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.body.innerText
            });
        } catch (error) {
            if (error.message.includes('Cannot access contents of url')) {
                resultsDiv.innerHTML = `
                    <div class="error">
                        <h3>Permission Required</h3>
                        <p>This extension needs permission to access this website. Please:</p>
                        <ol>
                            <li>Click the extension icon in your browser toolbar</li>
                            <li>Click the lock icon or site settings</li>
                            <li>Enable "Allow access to site data"</li>
                            <li>Refresh the page and try again</li>
                        </ol>
                        <p>If the issue persists, you may need to add this site to the extension's permissions in chrome://extensions</p>
                    </div>
                `;
                return;
            }
            throw error;
        }

        // First, ensure content script is injected
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        // Then send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TOS' });
        
        if (!response) {
            resultsDiv.textContent = "No response from content script. Please refresh the page and try again.";
            return;
        }

        if (response.type === 'links') {
            resultsDiv.innerHTML = `<b>Found T&C links:</b><br>${response.links.map(l => `<a href="${l}" target="_blank">${l}</a>`).join('<br>')}`;
            
            // Process links with rate limiting
            for (const link of response.links) {
                try {
                    const res = await fetch(link, {
                        headers: {
                            'Accept': 'text/html',
                            'User-Agent': 'Mozilla/5.0 (Chrome Extension)'
                        }
                    });
                    
                    if (res.status === 429) {
                        resultsDiv.innerHTML += `<br><br>⚠️ Rate limited by ${new URL(link).hostname}. Waiting before next request...`;
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                        continue;
                    }
                    
                    const text = await res.text();
                    chrome.runtime.sendMessage({
                        type: 'ANALYZE_TEXT',
                        text: text
                    });
                } catch (err) {
                    console.error('Error fetching link:', err);
                    resultsDiv.innerHTML += `<br><br>⚠️ Error fetching ${link}: ${err.message}`;
                }
            }
        } else if (response.type === 'bodyText') {
            resultsDiv.textContent = `📄 Analyzing page content...`;
            chrome.runtime.sendMessage({
                type: 'ANALYZE_TEXT',
                text: response.text
            });
        }
    } catch (error) {
        console.error('Error:', error);
        resultsDiv.innerHTML = `
            <div class="error">
                <h3>Error occurred:</h3>
                <p>${error.message}</p>
                <p>Please try refreshing the page and scanning again.</p>
            </div>
        `;
    }
});

// Listen for analysis results
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYSIS_RESULTS') {
        const resultsDiv = document.getElementById('results');
        const { risk_level, concerns, summary } = message.results;
        
        resultsDiv.innerHTML = `
            <div class="analysis-results">
                <h3>Risk Level: ${risk_level.toUpperCase()}</h3>
                <p><strong>Summary:</strong> ${summary}</p>
                <h4>Key Concerns:</h4>
                <ul>
                    ${concerns.map(concern => `<li>${concern}</li>`).join('')}
                </ul>
            </div>
        `;
    }
});
  