function toggleReaderOnTab(tabId?: number): void {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type: "RM_TOGGLE" });
}

chrome.action.onClicked.addListener((tab: { id?: number } | undefined) => {
  toggleReaderOnTab(tab?.id);
});
