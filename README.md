# JankExt

This extension injects JS to perform busy main thread activity, helping to simulate the potential "jank" of a a low-end device.

![Image of the extension showing a textbox with "INACTIVE", a range slider with a label of "Jank Time (ms)" set to 200ms, a range slider with a label of "Interval (ms) set to 400ms, a "Start Jank" button, and a disabled "Stop Jank" button. Below that is a section that says "Long Tasks" with a refesh button that shows the number and distribution of long tasks on the page](image.png)

## Installation

1. Download the latest release.
1. Unzip the folder.
1. Open edge://extensions.
1. Turn on "Developer mode" on the left side.
1. Click "Load unpacked" in the top-right corner.
1. Choose the folder you unzipped.

## Usage

The extension injects a script that runs a task taking X milliseconds every Y milliseconds. Click the extension and choose the settings, then hit "Start Jank"! "Jank Time" input sets X, "Interval" sets Y.

You can use the "Long Tasks" section to see how many long tasks have run on the current page to get a feeling for how long the normal long tasks are on your site. (note that this represents long tasks your current device and might not represent low-end devices)

You can try it out at on this [animation comparison page](https://aluhrs13.github.io/animation-comparison/) where you should see a few of the loading animations lag while jank is enabled.
