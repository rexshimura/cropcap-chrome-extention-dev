document.getElementById('snapBtn').addEventListener('click', async () => {
  const duration = parseInt(document.getElementById('duration').value) || 3;
  const hideCursor = document.getElementById('hideCursor').checked;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.includes('chromewebstore.google.com')) {
    alert("For security reasons, Chrome extensions cannot run on system settings or web store pages. Please try a regular website!");
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: "start_selection", duration: duration, hideCursor: hideCursor });
    window.close();
  } catch (err) {
    try {
      await chrome.scripting.executeScript({ 
        target: { tabId: tab.id }, 
        files: ['gifshot.js', 'content.js'] 
      });
      
      setTimeout(async () => {
        await chrome.tabs.sendMessage(tab.id, { action: "start_selection", duration: duration, hideCursor: hideCursor });
        window.close();
      }, 150);
    } catch (injectErr) {
      console.error("Script mapping setup execution failed:", injectErr);
    }
  }
});