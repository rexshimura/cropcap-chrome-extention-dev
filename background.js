chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_html_compiler") {
    chrome.tabs.create({ url: message.dataUri });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "trigger-snippet") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, { action: "start_selection", duration: 3 }).catch(() => {});
  }
});