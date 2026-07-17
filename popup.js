// Toggle input visibility dynamically based on user preferences
document.getElementById('useDelayTimer').addEventListener('change', (e) => {
  const row = document.getElementById('delayRow');
  const input = document.getElementById('delayDuration');
  if (e.target.checked) {
    row.classList.add('active');
    input.disabled = false;
  } else {
    row.classList.remove('active');
    input.disabled = true;
  }
});

document.getElementById('snapBtn').addEventListener('click', async () => {
  const duration = parseInt(document.getElementById('duration').value) || 3;
  const hideCursor = document.getElementById('hideCursor').checked;
  
  // 🎯 Extract Countdown configuration markers
  const useTimer = document.getElementById('useDelayTimer').checked;
  const timerSeconds = useTimer ? (parseInt(document.getElementById('delayDuration').value) || 3) : 0;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.includes('chromewebstore.google.com')) {
    alert("For security reasons, Chrome extensions cannot run on system settings or web store pages. Please try a regular website!");
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { 
      action: "start_selection", 
      duration: duration, 
      hideCursor: hideCursor,
      timerSeconds: timerSeconds 
    });
    window.close();
  } catch (err) {
    try {
      await chrome.scripting.executeScript({ 
        target: { tabId: tab.id }, 
        files: ['gifshot.js', 'content.js'] 
      });
      
      setTimeout(async () => {
        await chrome.tabs.sendMessage(tab.id, { 
          action: "start_selection", 
          duration: duration, 
          hideCursor: hideCursor,
          timerSeconds: timerSeconds 
        });
        window.close();
      }, 150);
    } catch (injectErr) {
      console.error(injectErr);
    }
  }
});