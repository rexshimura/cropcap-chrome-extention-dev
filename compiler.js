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

window.addEventListener('load', () => {
  const favicon = document.getElementById('favicon');
  if (favicon) favicon.href = chrome.runtime.getURL('main-icon.png');

  const pBar = document.getElementById('progressBar');
  const percentLabel = document.getElementById('percentLabel');
  const phaseLabel = document.getElementById('phaseLabel');
  const status = document.getElementById('status');
  const titleLabel = document.getElementById('titleLabel');
  const iconBox = document.getElementById('iconBox');

  initShapeGrid();

  chrome.storage.local.get(["pendingFrames", "targetW", "targetH", "fileName", "withWatermark"], async (data) => {
    if (data.pendingFrames && data.pendingFrames.length > 0) {
      
      setTimeout(() => {
        pBar.style.width = "45%";
        percentLabel.innerText = "45%";
        phaseLabel.innerText = "COMPILING LOOP";
        titleLabel.innerText = "Stitching Frames";
        status.innerText = "Assembling the recorded frame arrays using hardware-accelerated thread workers...";
        
        iconBox.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.76 2.76M16.24 16.24l2.76 2.76M2 12h4M18 12h4M4.93 19.07l2.76-2.76M16.24 7.76l2.76-2.76"/></svg>`;
        iconBox.firstElementChild.classList.add('spinning');
      }, 400);

      let processedFrames = data.pendingFrames;

      // 🎯 WATERMARK PIPELINE: Stamp the raw icon + branding text on the bottom-left corner
      if (data.withWatermark) {
        phaseLabel.innerText = "WATERMARKING";
        processedFrames = await applyWatermarkToFrames(
          data.pendingFrames, 
          data.targetW || 400, 
          data.targetH || 400, 
          chrome.runtime.getURL('main-icon.png')
        );
      }

      gifshot.createGIF({
        images: processedFrames,
        interval: 0.1,
        gifWidth: data.targetW || 400,
        gifHeight: data.targetH || 400,
        numFrames: processedFrames.length,
        sampleInterval: 5,
        numWorkers: 2 
      }, function(obj) {
        if(!obj.error) {
          pBar.style.width = "100%";
          pBar.style.background = "linear-gradient(90deg, #10b981, #34d399)";
          percentLabel.innerText = "100%";
          percentLabel.style.color = "#34d399";
          phaseLabel.innerText = "SUCCESS";
          phaseLabel.style.color = "#34d399";
          
          titleLabel.innerText = "Download Ready";
          status.style.color = "#a1a1aa";
          status.innerText = "Your loop has been generated and saved! Closing layout tab workspace...";
          
          iconBox.style.background = "rgba(16, 185, 129, 0.1)";
          iconBox.style.borderColor = "rgba(16, 185, 129, 0.2)";
          iconBox.style.color = "#10b981";
          iconBox.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

          const dl = document.createElement('a');
          dl.download = `${data.fileName || 'cropcap-clip'}.gif`;
          dl.href = obj.image;
          dl.click();
          
          chrome.storage.local.remove(["pendingFrames", "targetW", "targetH", "fileName", "withWatermark"]);
          setTimeout(() => window.close(), 1500);
        } else {
          alert("Error compiling: " + obj.error);
        }
      });

    } else {
      status.innerText = "No asset buffers found in storage.";
    }
  });
});

// 🎯 COMPILER WATERMARK CALCULATOR ENGINE (Raw Icon + Text)
async function applyWatermarkToFrames(framesArray, targetW, targetH, iconUrl) {
  const logo = new Image();
  logo.src = iconUrl;
  await new Promise(resolve => logo.onload = resolve);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const processed = [];

  for (let i = 0; i < framesArray.length; i++) {
    const frameImg = new Image();
    frameImg.src = framesArray[i];
    await new Promise(resolve => frameImg.onload = resolve);

    ctx.clearRect(0, 0, targetW, targetH);
    // Draw the original capture frame background
    ctx.drawImage(frameImg, 0, 0, targetW, targetH);

    // 🎯 DYNAMIC SCALING GEOMETRICS (Bottom-Left Corner Placement)
    const padding = 12;
    const iconSize = Math.max(12, Math.floor(targetW * 0.045)); // Small, subtle icon footprint
    const rx = padding;
    const ry = targetH - iconSize - padding;

    // Set up high-end typography rules (Responsive font sizing)
    const fontSize = Math.max(9, Math.floor(targetW * 0.03));
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = "middle";

    // 🎯 TRANSPARENT SHADOW ENGINE
    // Injected behind BOTH icon and text so they pop on any background color
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // 1. Stamp raw transparent icon (no circle background background-color patch)
    ctx.drawImage(logo, rx, ry, iconSize, iconSize);

    // 2. Draw branded label text beside the icon
    ctx.fillStyle = "#ffffff";
    const textGap = 6; // Spacing between icon edge and text start
    ctx.fillText("Captured using Cropcap", rx + iconSize + textGap, ry + iconSize / 2);

    // Reset rendering pipeline shadow variables to prevent bleeding into other components
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    processed.push(canvas.toDataURL('image/jpeg', 0.8));
  }

  return processed;
}

// -------------------------------------------------------------
// 🚀 SHAPEGRID BACKGROUND RENDERING ENGINE (React Bits Port)
// -------------------------------------------------------------
function initShapeGrid() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const direction = 'diagonal'; 
  const speed = 0.3;
  const borderColor = '#1f1f23'; 
  const squareSize = 45;
  const hoverFillColor = 'rgba(99, 102, 241, 0.08)'; 
  const shape = 'hexagon'; 
  const hoverTrailAmount = 4;

  const isHex = shape === 'hexagon';
  const isTri = shape === 'triangle';
  const hexHoriz = squareSize * 1.5;
  const hexVert = squareSize * Math.sqrt(3);

  let numSquaresX = 0;
  let numSquaresY = 0;
  let gridOffset = { x: 0, y: 0 };
  let hoveredSquare = null;
  let trailCells = [];
  let cellOpacities = new Map();

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    numSquaresX = Math.ceil(canvas.width / squareSize) + 1;
    numSquaresY = Math.ceil(canvas.height / squareSize) + 1;
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const drawHex = (cx, cy, size) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const vx = cx + size * Math.cos(angle);
      const vy = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
  };

  const drawCircle = (cx, cy, size) => {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
  };

  const drawTriangle = (cx, cy, size, flip) => {
    ctx.beginPath();
    if (flip) {
      ctx.moveTo(cx, cy + size / 2);
      ctx.lineTo(cx + size / 2, cy - size / 2);
      ctx.lineTo(cx - size / 2, cy - size / 2);
    } else {
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy + size / 2);
      ctx.lineTo(cx - size / 2, cy + size / 2);
    }
    ctx.closePath();
  };

  const drawGrid = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isHex) {
      const colShift = Math.floor(gridOffset.x / hexHoriz);
      const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
      const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;

      const cols = Math.ceil(canvas.width / hexHoriz) + 3;
      const rows = Math.ceil(canvas.height / hexVert) + 3;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const cx = col * hexHoriz + offsetX;
          const cy = row * hexVert + ((col + colShift) % 2 !== 0 ? hexVert / 2 : 0) + offsetY;

          const cellKey = `${col},${row}`;
          const alpha = cellOpacities.get(cellKey);
          if (alpha) {
            ctx.globalAlpha = alpha;
            drawHex(cx, cy, squareSize);
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          drawHex(cx, cy, squareSize);
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        }
      }
    } else if (isTri) {
      const halfW = squareSize / 2;
      const colShift = Math.floor(gridOffset.x / halfW);
      const rowShift = Math.floor(gridOffset.y / squareSize);
      const offsetX = ((gridOffset.x % halfW) + halfW) % halfW;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const cols = Math.ceil(canvas.width / halfW) + 4;
      const rows = Math.ceil(canvas.height / squareSize) + 4;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const cx = col * halfW + offsetX;
          const cy = row * squareSize + squareSize / 2 + offsetY;
          const flip = ((col + colShift + row + rowShift) % 2 + 2) % 2 !== 0;

          const cellKey = `${col},${row}`;
          const alpha = cellOpacities.get(cellKey);
          if (alpha) {
            ctx.globalAlpha = alpha;
            drawTriangle(cx, cy, squareSize, flip);
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          drawTriangle(cx, cy, squareSize, flip);
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        }
      }
    } else if (shape === 'circle') {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      const col = Math.round(adjustedX / squareSize);
      const row = Math.round(adjustedY / squareSize);

      if (!hoveredSquare || hoveredSquare.x !== col || hoveredSquare.y !== row) {
        if (hoveredSquare && hoverTrailAmount > 0) {
          trailCells.unshift({ ...hoveredSquare });
          if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
        }
        hoveredSquare = { x: col, y: row };
      }
    } else {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

      const cols = Math.ceil(canvas.width / squareSize) + 3;
      const rows = Math.ceil(canvas.height / squareSize) + 3;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const sx = col * squareSize + offsetX;
          const sy = row * squareSize + offsetY;

          const cellKey = `${col},${row}`;
          const alpha = cellOpacities.get(cellKey);
          if (alpha) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(sx, sy, squareSize, squareSize);
            ctx.globalAlpha = 1;
          }

          ctx.strokeStyle = borderColor;
          ctx.strokeRect(sx, sy, squareSize, squareSize);
        }
      }
    }

    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2,
      Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, '#09090b'); 

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const updateAnimation = () => {
    const effectiveSpeed = Math.max(speed, 0.1);
    const wrapX = isHex ? hexHoriz * 2 : squareSize;
    const wrapY = isHex ? hexVert : isTri ? squareSize * 2 : squareSize;

    switch (direction) {
      case 'right':
        gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
        break;
      case 'left':
        gridOffset.x = (gridOffset.x + effectiveSpeed + wrapX) % wrapX;
        break;
      case 'up':
        gridOffset.y = (gridOffset.y + effectiveSpeed + wrapY) % wrapY;
        break;
      case 'down':
        gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
        break;
      case 'diagonal':
        gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
        gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
        break;
    }

    updateCellOpacities();
    drawGrid();
    requestAnimationFrame(updateAnimation);
  };

  const updateCellOpacities = () => {
    const targets = new Map();

    if (hoveredSquare) {
      targets.set(`${hoveredSquare.x},${hoveredSquare.y}`, 1);
    }

    if (hoverTrailAmount > 0) {
      for (let i = 0; i < trailCells.length; i++) {
        const t = trailCells[i];
        const key = `${t.x},${t.y}`;
        if (!targets.has(key)) {
          targets.set(key, (trailCells.length - i) / (trailCells.length + 1));
        }
      }
    }

    for (const [key] of targets) {
      if (!cellOpacities.has(key)) {
        cellOpacities.set(key, 0);
      }
    }

    for (const [key, opacity] of cellOpacities) {
      const target = targets.get(key) || 0;
      const next = opacity + (target - opacity) * 0.15;
      if (next < 0.005) {
        cellOpacities.delete(key);
      } else {
        cellOpacities.set(key, next);
      }
    }
  };

  const handleMouseMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isHex) {
      const colShift = Math.floor(gridOffset.x / hexHoriz);
      const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
      const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      const col = Math.round(adjustedX / hexHoriz);
      const rowOffset = (col + colShift) % 2 !== 0 ? hexVert / 2 : 0;
      const row = Math.round((adjustedY - rowOffset) / hexVert);

      if (!hoveredSquare || hoveredSquare.x !== col || hoveredSquare.y !== row) {
        if (hoveredSquare && hoverTrailAmount > 0) {
          trailCells.unshift({ ...hoveredSquare });
          if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
        }
        hoveredSquare = { x: col, y: row };
      }
    } else if (isTri) {
      const halfW = squareSize / 2;
      const offsetX = ((gridOffset.x % halfW) + halfW) % halfW;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      const col = Math.round(adjustedX / halfW);
      const row = Math.floor(adjustedY / squareSize);

      if (!hoveredSquare || hoveredSquare.x !== col || hoveredSquare.y !== row) {
        if (hoveredSquare && hoverTrailAmount > 0) {
          trailCells.unshift({ ...hoveredSquare });
          if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
        }
        hoveredSquare = { x: col, y: row };
      }
    } else if (shape === 'circle') {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      const col = Math.round(adjustedX / squareSize);
      const row = Math.round(adjustedY / squareSize);

      if (!hoveredSquare || hoveredSquare.x !== col || hoveredSquare.y !== row) {
        if (hoveredSquare && hoverTrailAmount > 0) {
          trailCells.unshift({ ...hoveredSquare });
          if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
        }
        hoveredSquare = { x: col, y: row };
      }
    } else {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;

      const col = Math.floor(adjustedX / squareSize);
      const row = Math.floor(adjustedY / squareSize);

      if (!hoveredSquare || hoveredSquare.x !== col || hoveredSquare.y !== row) {
        if (hoveredSquare && hoverTrailAmount > 0) {
          trailCells.unshift({ ...hoveredSquare });
          if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
        }
        hoveredSquare = { x: col, y: row };
      }
    }
  };

  const handleMouseLeave = () => {
    if (hoveredSquare && hoverTrailAmount > 0) {
      trailCells.unshift({ ...hoveredSquare });
      if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
    }
    hoveredSquare = null;
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', handleMouseLeave);
  requestAnimationFrame(updateAnimation);
}