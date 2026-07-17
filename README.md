# Cropcap

**Cropcap** is a Simple Chrome Extension designed to crop, capture, preview, and compile screen selections into GIF loops.

Featuring an automatic YouTube playback synchronization, a pre-recording countdown, and smart watermarking, Cropcap provides a seamless crop & capture a clip into GIF directly inside your browser.

---

# Features

### Dynamic Snipping Area
Precisely select any region of your screen using an intuitive crosshair selection tool.

### Automated YouTube Integration
- Automatically pauses YouTube before selecting the recording area.
- Resumes playback when recording begins.
- Stops playback immediately when recording ends.

### Pre-Recording Countdown
Configure a countdown of up to **5 seconds** before recording starts, giving you time to prepare.

### Invisible Cursor Engine
Uses CSS injection techniques to hide the mouse cursor during recording, producing clean GIF captures without distractions.

### Smart Watermarking
Optionally adds a modern branded watermark featuring:
- Cropcap logo
- "Captured using Cropcap" typography
- Transparent styling
- Drop shadow effect

---

# Project Structure

```text
cropcap/
├── manifest.json         # Extension configuration & permissions
├── popup.html            # Extension popup interface
├── popup.js              # Popup interactions & settings
├── background.js         # Background service worker
├── content.js            # Snipping overlay & capture engine
├── compiler.html         # GIF compilation workspace
├── compiler.js           # Workspace UI & rendering logic
├── gifshot.js            # GIF generation library
└── main-icon.png         # Extension icon & watermark asset
```

---

# Installation

1. Clone or download this repository.

2. Open Google Chrome.

3. Navigate to:

```
chrome://extensions/
```

4. Enable **Developer Mode**.

5. Click **Load unpacked**.

6. Select the `cropcap` project folder.

7. Pin **Cropcap** to your Chrome toolbar.

---

# Usage

## Step 1 — Configure Recording

Open the Cropcap extension popup.

Choose your preferences:

- Recording Duration
- Countdown Timer
- Countdown Delay
- Hide Cursor

---

## Step 2 — Select Recording Area

Click:

```
Select Area & Record
```

Then:

1. Drag to select the screen region.
2. If a YouTube video is detected, playback pauses automatically.
3. Release the mouse.
4. The countdown appears.
5. Recording begins automatically.
6. When the timer finishes, recording stops and playback pauses again.

---

## Step 3 — Preview & Export

Inside the preview window you can:

- Preview the captured loop
- Enter a custom filename
- Enable or disable the Cropcap watermark

Click **Download GIF**.

Cropcap opens a dedicated rendering workspace that:

- Processes the captured frames
- Displays rendering progress
- Generates the optimized GIF
- Downloads the finished file
- Automatically closes the rendering tab
- [ This Bypasses Youtube Legally ]
---

# Technology Stack

| Component | Technology |
|-----------|------------|
| Extension Architecture | Chrome Extension Manifest V3 |
| Language | Vanilla JavaScript |
| UI | HTML5 & CSS3 |
| Graphics | HTML5 Canvas |
| Video Capture | HTML5 Media Streams |
| GIF Encoding | gifshot.js |
| Background Effects | Native Canvas ShapeGrid |

---

# Libraries

- **gifshot.js** (Yahoo Inc.)
- HTML5 Canvas API
- Chrome Extension APIs
- HTML5 MediaStream APIs

---

# License

This project is licensed under the **MIT License**.

Third-party copyright notices for **gifshot.js** remain the property of **Yahoo Inc.**

---

## Cropcap

Crop and Capture a clip into GIF in seconds.