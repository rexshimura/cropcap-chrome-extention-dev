// 🎯 GLOBAL CONTEXT OVERRIDE (Warning Cleaner)
(function() {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attributes) {
    if (type === '2d') {
      attributes = attributes || {};
      attributes.willReadFrequently = true;
    }
    return originalGetContext.call(this, type, attributes);
  };
})();

let isSelecting = false;
let startX, startY;
let startScreenX, startScreenY;
let overlayCanvas = null;
let ctxOverlay = null;
let recordDuration = 3;
let hideCursorPreference = false;
let countdownDelaySeconds = 0; 

// 🎯 HELPER: Controls YouTube Video Elements in the current tab context
function controlYouTubeVideo(action) {
  try {
    const videoElement = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (!videoElement) return;
    
    if (action === 'play') {
      videoElement.play();
    } else if (action === 'pause') {
      videoElement.pause();
    }
  } catch (err) {
    console.log("Not a YouTube/HTML5 video node context or element missing.");
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start_selection") {
    recordDuration = request.duration;
    hideCursorPreference = request.hideCursor || false;
    countdownDelaySeconds = request.timerSeconds || 0; 
    
    // 🎯 YouTube Automation Stage 1: Pause instantly when user initiates selection loop
    controlYouTubeVideo('pause');
    
    createSnippingOverlay();
  }
});

function createSnippingOverlay() {
  if (overlayCanvas) return;

  overlayCanvas = document.createElement('canvas');
  overlayCanvas.style.position = 'fixed';
  overlayCanvas.style.top = '0';
  overlayCanvas.style.left = '0';
  overlayCanvas.style.width = '100vw';
  overlayCanvas.style.height = '100vh';
  overlayCanvas.style.zIndex = '9999999';
  overlayCanvas.style.cursor = 'crosshair';
  
  overlayCanvas.width = window.innerWidth;
  overlayCanvas.height = window.innerHeight;
  
  ctxOverlay = overlayCanvas.getContext('2d');
  drawMask(0, 0, 0, 0);

  document.body.appendChild(overlayCanvas);
  overlayCanvas.addEventListener('mousedown', startSnipping);
}

function drawMask(x, y, w, h) {
  ctxOverlay.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  ctxOverlay.fillStyle = 'rgba(10, 10, 12, 0.65)';
  ctxOverlay.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  
  if (w > 0 && h > 0) {
    ctxOverlay.globalCompositeOperation = 'destination-out';
    ctxOverlay.fillRect(x, y, w, h);
    ctxOverlay.globalCompositeOperation = 'source-over';
    
    ctxOverlay.strokeStyle = '#6366f1';
    ctxOverlay.lineWidth = 2;
    ctxOverlay.strokeRect(x, y, w, h);
  }
}

function startSnipping(e) {
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  startScreenX = e.screenX;
  startScreenY = e.screenY;
  overlayCanvas.addEventListener('mousemove', updateSnipping);
  overlayCanvas.addEventListener('mouseup', endSnipping);
}

function updateSnipping(e) {
  if (!isSelecting) return;
  const currentX = e.clientX;
  const currentY = e.clientY;
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(startX - currentX);
  const h = Math.abs(startY - currentY);
  drawMask(x, y, w, h);
}

async function endSnipping(e) {
  isSelecting = false;
  overlayCanvas.removeEventListener('mousemove', updateSnipping);
  overlayCanvas.removeEventListener('mouseup', endSnipping);

  const finalScreenX = Math.min(startScreenX, e.screenX);
  const finalScreenY = Math.min(startScreenY, e.screenY);
  const finalScreenW = Math.abs(startScreenX - e.screenX);
  const finalScreenH = Math.abs(startScreenY - e.screenY);

  const visualX = Math.min(startX, e.clientX);
  const visualY = Math.min(startY, e.clientY);
  const visualW = Math.abs(startX - e.clientX);
  const visualH = Math.abs(startY - e.clientY);

  overlayCanvas.remove();
  overlayCanvas = null;

  if (finalScreenW > 15 && finalScreenH > 15) {
    await captureAbsoluteMonitorSnippet(finalScreenX, finalScreenY, finalScreenW, finalScreenH, visualX, visualY, visualW, visualH);
  } else {
    // If capture area selection was cancelled/invalid, resume the video element state natively
    controlYouTubeVideo('play');
  }
}

async function captureAbsoluteMonitorSnippet(scrX, scrY, scrW, scrH, visX, visY, visW, visH) {
  try {
    const displayMediaOptions = {
      video: { displaySurface: "monitor" },
      audio: false
    };

    const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;

    video.onloadedmetadata = () => {
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const scaleX = (settings.width || 1920) / window.screen.width;
      const scaleY = (settings.height || 1080) / window.screen.height;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = scrW * scaleX;
      canvas.height = scrH * scaleY;

      const frames = [];
      const intervalTime = 100; 
      const maxFrames = (recordDuration * 1000) / intervalTime;

      let cursorSilencerSheet = null;
      if (hideCursorPreference) {
        cursorSilencerSheet = document.createElement("style");
        cursorSilencerSheet.innerText = `* { cursor: none !important; }`;
        document.head.appendChild(cursorSilencerSheet);
      }

      const recordFrame = document.createElement('div');
      recordFrame.style.position = 'fixed';
      recordFrame.style.left = `${visX - 3}px`;
      recordFrame.style.top = `${visY - 3}px`;
      recordFrame.style.width = `${visW + 6}px`;
      recordFrame.style.height = `${visH + 6}px`;
      recordFrame.style.border = '1px dashed rgba(239, 68, 68, 0.4)';
      recordFrame.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.25), 0 0 0 9999px rgba(10, 10, 12, 0.4)'; 
      recordFrame.style.pointerEvents = 'none'; 
      recordFrame.style.zIndex = '9999999';
      
      const cornerStyle = document.createElement("style");
      cornerStyle.innerText = `
        .cropcap-bracket { position: absolute; width: 12px; height: 12px; border: 2px solid #ef4444; }
        @keyframes cropcap-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `;
      document.head.appendChild(cornerStyle);

      const positions = [
        { top: '-2px', left: '-2px', borderRight: 'none', borderBottom: 'none' },
        { top: '-2px', right: '-2px', borderLeft: 'none', borderBottom: 'none' },
        { bottom: '-2px', left: '-2px', borderRight: 'none', borderTop: 'none' },
        { bottom: '-2px', right: '-2px', borderLeft: 'none', borderTop: 'none' }
      ];

      positions.forEach(pos => {
        const bracket = document.createElement('div');
        bracket.className = 'cropcap-bracket';
        Object.assign(bracket.style, pos);
        recordFrame.appendChild(bracket);
      });

      const timerLabel = document.createElement('div');
      timerLabel.style.position = 'absolute';
      timerLabel.style.top = '-32px';
      timerLabel.style.left = '-2px';
      timerLabel.style.color = '#ffffff';
      timerLabel.style.padding = '4px 10px';
      timerLabel.style.fontSize = '11px';
      timerLabel.style.borderRadius = '6px';
      
      if (countdownDelaySeconds > 0) {
        timerLabel.style.background = '#f59e0b'; 
        timerLabel.innerHTML = `STARTING IN | ${countdownDelaySeconds}s`;
        recordFrame.style.border = '1px dashed rgba(245, 158, 11, 0.5)';
      } else {
        timerLabel.style.background = '#ef4444';
        timerLabel.innerHTML = `REC | ${recordDuration.toFixed(1)}s`;
        // If countdown timer isn't checked, fire up video immediately
        controlYouTubeVideo('play');
      }
      
      recordFrame.appendChild(timerLabel);
      document.body.appendChild(recordFrame);

      let countdownLeft = countdownDelaySeconds;
      let timeLeft = recordDuration;

      const runRecordingLoop = () => {
        // 🎯 YouTube Automation Stage 2: Resume playback instantly when countdown hits 0
        controlYouTubeVideo('play');

        timerLabel.style.background = '#ef4444';
        recordFrame.style.border = '1px dashed rgba(239, 68, 68, 0.4)';
        timerLabel.innerHTML = `REC | ${timeLeft.toFixed(1)}s`;

        const recordInterval = setInterval(() => {
          ctx.drawImage(video, scrX * scaleX, scrY * scaleY, scrW * scaleX, scrH * scaleY, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/jpeg', 0.6));

          timeLeft -= (intervalTime / 1000);
          if (timeLeft < 0) timeLeft = 0;
          timerLabel.innerHTML = `REC | ${timeLeft.toFixed(1)}s`;

          if (frames.length >= maxFrames) {
            clearInterval(recordInterval);
            videoTrack.stop();
            
            // 🎯 YouTube Automation Stage 3: Halt video exactly when capture limits end
            controlYouTubeVideo('pause');

            if (cursorSilencerSheet) cursorSilencerSheet.remove();

            setTimeout(() => {
              recordFrame.remove();
              cornerStyle.remove();
              showCropcapPreview(frames, canvas.width, canvas.height);
            }, 200);
          }
        }, intervalTime);
      };

      if (countdownLeft > 0) {
        const countdownInterval = setInterval(() => {
          countdownLeft -= 1;
          if (countdownLeft <= 0) {
            clearInterval(countdownInterval);
            runRecordingLoop();
          } else {
            timerLabel.innerHTML = `STARTING IN | ${countdownLeft}s`;
          }
        }, 1000);
      } else {
        runRecordingLoop();
      }
    };
  } catch (err) {
    console.error(err);
    // Safety backup to make sure video keeps playing if tab request triggers window prompt errors
    controlYouTubeVideo('play');
  }
}

function showCropcapPreview(frames, physicalW, physicalH) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(9, 9, 11, 0.85)'; modal.style.backdropFilter = 'blur(10px)';
  modal.style.display = 'flex'; modal.style.justifyContent = 'center'; modal.style.alignItems = 'center';
  modal.style.zIndex = '10000000'; modal.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const container = document.createElement('div');
  container.style.backgroundColor = '#18181b'; 
  container.style.border = '1px solid #27272a';
  container.style.padding = '24px'; 
  container.style.borderRadius = '14px'; 
  container.style.width = '460px';
  container.style.maxWidth = '92vw';
  container.style.display = 'flex'; 
  container.style.flexDirection = 'column'; 
  container.style.alignItems = 'center';
  container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.6)';
  container.style.boxSizing = 'border-box';

  const headerWrapper = document.createElement('div');
  headerWrapper.style.display = 'flex';
  headerWrapper.style.alignItems = 'center';
  headerWrapper.style.gap = '10px';
  headerWrapper.style.alignSelf = 'flex-start';
  headerWrapper.style.marginBottom = '16px';

  const logoIcon = document.createElement('img');
  logoIcon.src = chrome.runtime.getURL('main-icon.png');
  logoIcon.style.width = '20px';
  logoIcon.style.height = '20px';
  logoIcon.style.objectFit = 'contain';

  const title = document.createElement('h3');
  title.innerText = 'Capture Preview'; 
  title.style.color = '#f4f4f5'; 
  title.style.fontSize = '16px';
  title.style.fontWeight = '600';
  title.style.margin = '0';

  headerWrapper.appendChild(logoIcon);
  headerWrapper.appendChild(title);
  container.appendChild(headerWrapper);

  const previewBox = document.createElement('div');
  previewBox.style.width = '100%';
  previewBox.style.height = '240px';
  previewBox.style.backgroundColor = '#09090b';
  previewBox.style.border = '1px solid #27272a';
  previewBox.style.borderRadius = '8px';
  previewBox.style.marginBottom = '20px';
  previewBox.style.display = 'flex';
  previewBox.style.justifyContent = 'center';
  previewBox.style.alignItems = 'center';
  previewBox.style.overflow = 'hidden';
  previewBox.style.boxSizing = 'border-box';

  const previewImg = document.createElement('img');
  previewImg.src = frames[0]; 
  previewImg.style.maxWidth = '100%'; 
  previewImg.style.maxHeight = '100%';
  previewImg.style.objectFit = 'contain';
  
  previewBox.appendChild(previewImg);
  container.appendChild(previewBox);

  let currentFrameIdx = 0;
  const animationInterval = setInterval(() => {
    currentFrameIdx = (currentFrameIdx + 1) % frames.length;
    previewImg.src = frames[currentFrameIdx];
  }, 100);

  const today = new Date();
  const defaultFileName = `cc-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const inputGroup = document.createElement('div');
  inputGroup.style.width = '100%'; 
  inputGroup.style.marginBottom = '16px';
  inputGroup.style.display = 'flex';
  inputGroup.style.flexDirection = 'column';
  inputGroup.style.gap = '8px';
  inputGroup.style.boxSizing = 'border-box';

  const inputLabel = document.createElement('label');
  inputLabel.innerText = 'FILE NAME';
  inputLabel.style.fontSize = '11px';
  inputLabel.style.fontWeight = '600';
  inputLabel.style.color = '#71717a';
  inputLabel.style.letterSpacing = '0.5px';
  inputLabel.style.alignSelf = 'flex-start';

  const fileNameInput = document.createElement('input');
  fileNameInput.type = 'text'; 
  fileNameInput.value = defaultFileName;
  fileNameInput.style.width = '100%'; 
  fileNameInput.style.padding = '10px 12px';
  fileNameInput.style.backgroundColor = '#09090b'; 
  fileNameInput.style.border = '1px solid #27272a';
  fileNameInput.style.borderRadius = '6px'; 
  fileNameInput.style.color = '#ffffff';
  fileNameInput.style.fontSize = '13px';
  fileNameInput.style.boxSizing = 'border-box';
  fileNameInput.style.outline = 'none';
  fileNameInput.style.transition = 'border-color 0.2s, box-shadow 0.2s';
  
  fileNameInput.addEventListener('focus', () => {
    fileNameInput.style.borderColor = '#6366f1';
    fileNameInput.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
  });
  fileNameInput.addEventListener('blur', () => {
    fileNameInput.style.borderColor = '#27272a';
    fileNameInput.style.boxShadow = 'none';
  });

  inputGroup.appendChild(inputLabel);
  inputGroup.appendChild(fileNameInput);
  container.appendChild(inputGroup);

  const watermarkWrapper = document.createElement('label');
  watermarkWrapper.style.display = 'flex';
  watermarkWrapper.style.alignItems = 'center';
  watermarkWrapper.style.gap = '10px';
  watermarkWrapper.style.width = '100%';
  watermarkWrapper.style.marginBottom = '24px';
  watermarkWrapper.style.cursor = 'pointer';
  watermarkWrapper.style.userSelect = 'none';
  watermarkWrapper.style.boxSizing = 'border-box';

  const hiddenCheck = document.createElement('input');
  hiddenCheck.type = 'checkbox';
  hiddenCheck.style.display = 'none';

  const customCheck = document.createElement('div');
  customCheck.style.width = '16px';
  customCheck.style.height = '16px';
  customCheck.style.backgroundColor = '#09090b';
  customCheck.style.border = '1px solid #27272a';
  customCheck.style.borderRadius = '4px';
  customCheck.style.display = 'flex';
  customCheck.style.alignItems = 'center';
  customCheck.style.justifyContent = 'center';
  customCheck.style.transition = 'background-color 0.2s, border-color 0.2s';
  customCheck.style.flexShrink = '0';
  customCheck.innerHTML = `<svg viewBox="0 0 24 24" style="width:10px; height:10px; stroke:white; stroke-width:4px; fill:none; opacity:0; transform:scale(0.6); transition: opacity 0.15s, transform 0.15s;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const watermarkLabel = document.createElement('span');
  watermarkLabel.innerText = 'With Watermark';
  watermarkLabel.style.fontSize = '12px';
  watermarkLabel.style.color = '#a1a1aa';
  watermarkLabel.style.fontWeight = '500';
  watermarkLabel.style.transition = 'color 0.2s';

  hiddenCheck.addEventListener('change', () => {
    if (hiddenCheck.checked) {
      customCheck.style.backgroundColor = '#6366f1';
      customCheck.style.borderColor = '#6366f1';
      customCheck.firstElementChild.style.opacity = '1';
      customCheck.firstElementChild.style.transform = 'scale(1)';
    } else {
      customCheck.style.backgroundColor = '#09090b';
      customCheck.style.borderColor = '#27272a';
      customCheck.firstElementChild.style.opacity = '0';
      customCheck.firstElementChild.style.transform = 'scale(0.6)';
    }
  });

  watermarkWrapper.onmouseenter = () => { 
    watermarkLabel.style.color = '#d4d4d8'; 
    if(!hiddenCheck.checked) customCheck.style.borderColor = '#3f3f46';
  };
  watermarkWrapper.onmouseleave = () => { 
    watermarkLabel.style.color = '#a1a1aa'; 
    if(!hiddenCheck.checked) customCheck.style.borderColor = '#27272a';
  };

  watermarkWrapper.appendChild(hiddenCheck);
  watermarkWrapper.appendChild(customCheck);
  watermarkWrapper.appendChild(watermarkLabel);
  container.appendChild(watermarkWrapper);

  const btnWrapper = document.createElement('div');
  btnWrapper.style.display = 'flex'; 
  btnWrapper.style.gap = '12px'; 
  btnWrapper.style.width = '100%';
  btnWrapper.style.boxSizing = 'border-box';

  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'Cancel'; 
  closeBtn.style.flex = '1'; 
  closeBtn.style.padding = '12px';
  closeBtn.style.background = 'transparent'; 
  closeBtn.style.color = '#a1a1aa'; 
  closeBtn.style.border = '1px solid #3f3f46';
  closeBtn.style.borderRadius = '6px'; 
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '13px';
  closeBtn.style.fontWeight = '500';
  closeBtn.style.transition = 'background 0.2s, color 0.2s';

  const downloadBtn = document.createElement('button');
  downloadBtn.innerText = 'Download GIF'; 
  downloadBtn.style.flex = '2'; 
  downloadBtn.style.padding = '12px';
  downloadBtn.style.background = '#6366f1'; 
  downloadBtn.style.color = '#ffffff'; 
  downloadBtn.style.border = 'none';
  downloadBtn.style.borderRadius = '6px'; 
  downloadBtn.style.cursor = 'pointer';
  downloadBtn.style.fontSize = '13px';
  downloadBtn.style.fontWeight = '500';
  downloadBtn.style.transition = 'background 0.2s';

  closeBtn.onmouseenter = () => { closeBtn.style.background = '#27272a'; closeBtn.style.color = '#f4f4f5'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#a1a1aa'; };
  downloadBtn.onmouseenter = () => { downloadBtn.style.background = '#4f46e5'; };
  downloadBtn.onmouseleave = () => { downloadBtn.style.background = '#6366f1'; };

  btnWrapper.appendChild(closeBtn);
  btnWrapper.appendChild(downloadBtn);
  container.appendChild(btnWrapper);
  modal.appendChild(container);
  document.body.appendChild(modal);

  // If user hits cancel, ensure video state turns back to play cleanly
  closeBtn.addEventListener('click', () => { 
    clearInterval(animationInterval); 
    modal.remove(); 
    controlYouTubeVideo('play');
  });

  downloadBtn.addEventListener('click', () => {
    const customName = fileNameInput.value.trim() || defaultFileName;
    const dpi = window.devicePixelRatio || 1;
    let targetW = Math.max(80, Math.floor(physicalW / dpi));
    let targetH = Math.max(80, Math.floor(physicalH / dpi));

    const maxBound = 600;
    if (targetW > maxBound || targetH > maxBound) {
      const aspect = targetW / targetH;
      if (targetW > targetH) {
        targetW = maxBound;
        targetH = Math.floor(maxBound / aspect);
      } else {
        targetH = maxBound;
        targetW = Math.floor(maxBound * aspect);
      }
    }

    chrome.runtime.sendMessage({
      action: "open_html_compiler",
      frames: frames,
      targetW: targetW,
      targetH: targetH,
      fileName: customName,
      withWatermark: hiddenCheck.checked
    });

    modal.remove();
    clearInterval(animationInterval);
    
    // Resume playback natively once loops hit workspace exports
    controlYouTubeVideo('play');
  });
}