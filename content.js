const links = Array.from(document.querySelectorAll('a'));

const tosLinks = links.filter(link => {
    const text = link.textContent.toLowerCase();
    return text.includes('terms') || text.includes('privacy') || text.includes('conditions');
  });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_TOS') {
      if (tosLinks.length > 0) {

        sendResponse({ type: 'links', links: tosLinks.map(link => link.href) });
      } else {

        const pageText = document.body.innerText || '';
        sendResponse({ type: 'bodyText', text: pageText.slice(0, 3000) });
      }
    }
  });