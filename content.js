function doJank(time = 200) {
  let start = performance.now();
  let now = performance.now();
  performance.mark('Start Jank');
  while (now - start < time) {
    now = performance.now();
  }
  performance.mark('End Jank');
  performance.measure('Jank', 'Start Jank', 'End Jank');

  // Send status update to popup
  sendStatusToPopup();
}

let interval;
let isActive = false;
let currentSettings = null; // Store current interval settings

// Long task tracking data
let longTasksData = {
  tasks: [],
  count: 0,
};

// Initialize performance observer for long tasks
function initPerformanceObserver() {
  // Observer for long tasks
  const longTaskObserver = new PerformanceObserver((entries) => {
    entries.getEntries().forEach((entry) => {
      longTasksData.count++;
      longTasksData.tasks.push({
        duration: entry.duration,
        startTime: entry.startTime,
      });
    });
  });

  // Start observing
  try {
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    console.error('PerformanceObserver error:', e);
  }
}

// Call this when page loads
initPerformanceObserver();

// Restore interval state on page load
function restoreIntervalState() {
  chrome.storage.local.get(['jankSettings'], (result) => {
    if (result.jankSettings && result.jankSettings.isActive) {
      const settings = result.jankSettings;
      startJankInterval(settings.time, settings.interval);
    }
  });
}

// Start the jank interval
function startJankInterval(time, intervalTime) {
  doJank(time);
  clearInterval(interval);
  isActive = true;
  currentSettings = { time, interval: intervalTime };

  interval = setInterval(function () {
    doJank(time);
  }, intervalTime);

  // Save settings to storage
  chrome.storage.local.set({
    jankSettings: {
      isActive: true,
      time: time,
      interval: intervalTime,
    },
  });

  sendStatusToPopup();
}

// Stop the jank interval
function stopJankInterval() {
  clearInterval(interval);
  isActive = false;
  currentSettings = null;

  // Clear settings from storage
  chrome.storage.local.set({
    jankSettings: {
      isActive: false,
    },
  });

  sendStatusToPopup();
}

// Restore state when content script loads
restoreIntervalState();

// Group long tasks by duration range
function analyzeLongTaskDistribution() {
  const distribution = {
    '0-50ms': 0,
    '50-100ms': 0,
    '100-200ms': 0,
    '200-500ms': 0,
    '500ms+': 0,
  };

  longTasksData.tasks.forEach((task) => {
    if (task.duration < 50) distribution['0-50ms']++;
    else if (task.duration < 100) distribution['50-100ms']++;
    else if (task.duration < 200) distribution['100-200ms']++;
    else if (task.duration < 500) distribution['200-500ms']++;
    else distribution['500ms+']++;
  });

  return distribution;
}

// Send long task data to popup
function sendLongTaskData() {
  const distribution = analyzeLongTaskDistribution();
  try {
    chrome.runtime.sendMessage(
      {
        type: 'longTaskData',
        data: {
          count: longTasksData.count,
          distribution: distribution,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log(
            'Extension context invalidated:',
            chrome.runtime.lastError.message
          );
        }
      }
    );
  } catch (e) {
    console.log('Error sending long task data to popup:', e);
  }
}

// Send current status to the popup
function sendStatusToPopup() {
  try {
    chrome.runtime.sendMessage(
      {
        type: 'jankStatus',
        isActive: isActive,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log(
            'Extension context invalidated:',
            chrome.runtime.lastError.message
          );
        }
      }
    );
  } catch (e) {
    console.log('Error sending message to popup:', e);
  }
}

// Handle messages from the popup
addEventListener('message', (event) => {
  const data = event.data;

  if (data && data.action === 'doJank') {
    startJankInterval(data.time, data.interval);
  } else if (data && data.action === 'stopJank') {
    stopJankInterval();
  } else if (data && data.action === 'getStatus') {
    sendStatusToPopup();
  } else if (data && data.action === 'getLongTaskData') {
    sendLongTaskData();
  }
});
