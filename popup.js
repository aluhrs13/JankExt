document.addEventListener('DOMContentLoaded', function () {
  const jankTimeSlider = document.getElementById('jank-time');
  const jankIntervalSlider = document.getElementById('jank-interval');
  const timeValueDisplay = document.getElementById('time-value');
  const intervalValueDisplay = document.getElementById('interval-value');
  const startButton = document.getElementById('start-jank');
  const stopButton = document.getElementById('stop-jank');
  const statusIndicator = document.getElementById('status-indicator');
  const refreshButton = document.getElementById('refresh-btn');
  const longTaskCountElement = document.getElementById('long-task-count');
  const longTaskDistributionElement = document.getElementById(
    'long-task-distribution'
  );

  let longTaskData = null;

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

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: checkJankStatus,
    });

    requestLongTaskData();
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
    
    // Notify background script to update icon
    chrome.runtime.sendMessage({
      type: 'jankStatus',
      isActive: active
    });
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
});
