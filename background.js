// Background service worker for managing extension icon state

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'jankStatus') {
    updateIcon(message.isActive);
  }
  sendResponse({ received: true });
  return true;
});

// Update the extension icon based on active state
function updateIcon(isActive) {
  if (isActive) {
    // Set icon to green when active
    chrome.action.setIcon({
      path: {
        16: 'icons/icon-green-16.png',
        32: 'icons/icon-green-32.png',
        48: 'icons/icon-green-48.png',
        128: 'icons/icon-green-128.png',
      },
    });
  } else {
    // Reset to default icon when inactive
    chrome.action.setIcon({
      path: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    });
  }
}

// Check storage on startup to restore icon state
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['jankSettings'], (result) => {
    if (result.jankSettings && result.jankSettings.isActive) {
      updateIcon(true);
    } else {
      updateIcon(false);
    }
  });
});

// Also check when the service worker is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['jankSettings'], (result) => {
    if (result.jankSettings && result.jankSettings.isActive) {
      updateIcon(true);
    } else {
      updateIcon(false);
    }
  });
});
