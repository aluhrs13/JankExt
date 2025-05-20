document.addEventListener('DOMContentLoaded', function () {
  const jankTimeSlider = document.getElementById('jank-time');
  const jankIntervalSlider = document.getElementById('jank-interval');
  const timeValueDisplay = document.getElementById('time-value');
  const intervalValueDisplay = document.getElementById('interval-value');
  const startButton = document.getElementById('start-jank');
  const stopButton = document.getElementById('stop-jank');
  const statusIndicator = document.getElementById('status-indicator');
  const refreshButton = document.getElementById('refresh-btn');
  const refreshHistoryButton = document.getElementById('refresh-history-btn');
  const longTaskCountElement = document.getElementById('long-task-count');
  const longTaskDistributionElement = document.getElementById(
    'long-task-distribution'
  );
  const historyItemsContainer = document.getElementById('history-items');
  const historyStatusElement = document.getElementById('history-status');

  let longTaskData = null;
  let historyItems = [];
  let isActive = false;

  jankTimeSlider.addEventListener('input', function () {
    timeValueDisplay.textContent = jankTimeSlider.value;
  });

  jankIntervalSlider.addEventListener('input', function () {
    intervalValueDisplay.textContent = jankIntervalSlider.value;
  });

  // Start jank simulation
  startButton.addEventListener('click', function () {
    const time = parseInt(jankTimeSlider.value);
    const interval = parseInt(jankIntervalSlider.value);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: injectJankStarter,
        args: [time, interval],
      });

      updateStatus(true);
    });
  });

  // Stop jank simulation
  stopButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: injectJankStopper,
      });

      updateStatus(false);
    });
  });

  // Refresh long task data
  refreshButton.addEventListener('click', function () {
    requestLongTaskData();
  });

  // Refresh history data
  refreshHistoryButton.addEventListener('click', function () {
    fetchRecentHistory();
  });

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: checkJankStatus,
    });

    requestLongTaskData();
    fetchRecentHistory();
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'jankStatus') {
      updateStatus(message.isActive);
    } else if (message.type === 'longTaskData') {
      updateLongTaskDisplay(message.data);
    }
  });

  // Request long task data from the content script
  function requestLongTaskData() {
    const statusElement = document.getElementById('longtask-status');
    if (statusElement) {
      statusElement.textContent = 'Fetching long task data...';
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: injectLongTaskDataRequest,
      });
    });
  }

  // Update the long task display with data
  function updateLongTaskDisplay(data) {
    longTaskData = data;

    const statusElement = document.getElementById('longtask-status');
    if (statusElement) {
      statusElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    longTaskCountElement.textContent = `Total long tasks: ${data.count}`;

    // Clear previous chart
    longTaskDistributionElement.innerHTML = '';

    // Get maximum value for scaling
    const maxValue = Math.max(...Object.values(data.distribution));

    // Create bars for distribution
    Object.entries(data.distribution).forEach(([range, count]) => {
      const barContainer = document.createElement('div');
      barContainer.className = 'bar-container';

      const label = document.createElement('div');
      label.className = 'bar-label';
      label.textContent = range;

      const bar = document.createElement('div');
      bar.className = 'bar';
      // Scale bar width with maximum of 200px
      bar.style.width = maxValue > 0 ? `${(count / maxValue) * 200}px` : '0px';

      const value = document.createElement('div');
      value.className = 'bar-value';
      value.textContent = count;

      barContainer.appendChild(label);
      barContainer.appendChild(bar);
      barContainer.appendChild(value);

      longTaskDistributionElement.appendChild(barContainer);
    });
  }

  // Update UI to reflect active status
  function updateStatus(active) {
    isActive = active;
    if (active) {
      statusIndicator.textContent = 'ACTIVE';
      statusIndicator.className = 'status-active';
      startButton.disabled = true;
      stopButton.disabled = false;
      // Disable range sliders when active
      jankTimeSlider.disabled = true;
      jankIntervalSlider.disabled = true;
    } else {
      statusIndicator.textContent = 'INACTIVE';
      statusIndicator.className = 'status-inactive';
      startButton.disabled = false;
      stopButton.disabled = true;
      // Enable range sliders when inactive
      jankTimeSlider.disabled = false;
      jankIntervalSlider.disabled = false;
    }
  }

  // Functions to inject into the page
  function injectJankStarter(time, interval) {
    window.postMessage(
      {
        action: 'doJank',
        time: time,
        interval: interval,
      },
      '*'
    );
  }

  function injectJankStopper() {
    window.postMessage(
      {
        action: 'stopJank',
      },
      '*'
    );
  }

  function checkJankStatus() {
    window.postMessage(
      {
        action: 'getStatus',
      },
      '*'
    );
  }

  function injectLongTaskDataRequest() {
    window.postMessage(
      {
        action: 'getLongTaskData',
      },
      '*'
    );
  }

  // Function to fetch recent history
  function fetchRecentHistory() {
    if (historyStatusElement) {
      historyStatusElement.textContent = 'Fetching recent history...';
    }

    // Get history from the last 24 hours (in milliseconds)
    const startTime = new Date().getTime() - 24 * 60 * 60 * 1000;
    
    chrome.history.search({
      text: '',          // Return all history items
      startTime: startTime,
      maxResults: 10     // Limit to 10 most recent
    }, function(results) {
      historyItems = results;
      updateHistoryDisplay();
    });
  }

  // Update the history display with data
  function updateHistoryDisplay() {
    if (historyStatusElement) {
      historyStatusElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    // Clear previous history items
    historyItemsContainer.innerHTML = '';

    if (historyItems.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.setAttribute('colspan', '2');
      cell.textContent = 'No recent history items';
      row.appendChild(cell);
      historyItemsContainer.appendChild(row);
      return;
    }

    // Sort by most recent first
    historyItems.sort((a, b) => b.lastVisitTime - a.lastVisitTime);
    
    // Process each history item and calculate time spent
    let previousTime = null;
    
    historyItems.forEach((item, index) => {
      const row = document.createElement('tr');
      
      // Title cell
      const titleCell = document.createElement('td');
      titleCell.className = 'history-url';
      titleCell.textContent = item.title || new URL(item.url).hostname;
      titleCell.title = item.url;
      
      // Time spent cell
      const timeCell = document.createElement('td');
      
      // Calculate time spent (time difference between this visit and next newest visit)
      let timeSpent = '';
      if (index < historyItems.length - 1) {
        const currentTime = item.lastVisitTime;
        const nextTime = historyItems[index + 1].lastVisitTime;
        const diffMs = currentTime - nextTime;
        
        // Only show if reasonable (< 30 min)
        if (diffMs < 30 * 60 * 1000) {
          timeSpent = formatTimeSpent(diffMs);
        } else {
          timeSpent = 'N/A';
        }
      } else {
        timeSpent = 'Current';
      }
      
      timeCell.textContent = timeSpent;
      
      row.appendChild(titleCell);
      row.appendChild(timeCell);
      historyItemsContainer.appendChild(row);
    });
  }

  // Format milliseconds as human-readable time
  function formatTimeSpent(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60 * 1000) {
      return `${Math.round(ms / 1000)}s`;
    } else {
      const minutes = Math.floor(ms / (60 * 1000));
      const seconds = Math.round((ms % (60 * 1000)) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  // Listen for history changes
  chrome.history.onVisited.addListener(function(historyItem) {
    // Add to our history items and re-render
    const existingIndex = historyItems.findIndex(item => item.url === historyItem.url);
    
    if (existingIndex !== -1) {
      // Update existing item
      historyItems[existingIndex] = historyItem;
    } else {
      // Add new item
      historyItems.unshift(historyItem);
      // Keep the list at 10 items max
      if (historyItems.length > 10) {
        historyItems.pop();
      }
    }
    
    updateHistoryDisplay();
  });
});
