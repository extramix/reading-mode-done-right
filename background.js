function toggleReaderOnTab(tabId) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type: "RM_TOGGLE" });
}

chrome.action.onClicked.addListener((tab) => {
  toggleReaderOnTab(tab?.id);
});
