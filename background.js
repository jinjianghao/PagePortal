chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  chrome.contextMenus.create({
    id: "addLink",
    title: "Add this page to extension",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addLink") {
    const link = { name: tab.title, url: tab.url };
    chrome.storage.sync.get(['links'], (result) => {
      const links = result.links || [];
      links.push(link);
      chrome.storage.sync.set({ links }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error adding link:', chrome.runtime.lastError);
        } else {
          console.log('Link added successfully');
        }
      });
    });
  }
});
