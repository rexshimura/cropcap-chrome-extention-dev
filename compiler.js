window.addEventListener('load', () => {
  chrome.storage.local.get(["pendingFrames", "targetW", "targetH", "fileName"], (data) => {
    if (data.pendingFrames && data.pendingFrames.length > 0) {
      
      gifshot.createGIF({
        images: data.pendingFrames,
        interval: 0.1,
        gifWidth: data.targetW || 400,
        gifHeight: data.targetH || 400,
        numFrames: data.pendingFrames.length,
        sampleInterval: 5,
        numWorkers: 2 // High-speed processing enabled!
      }, function(obj) {
        if(!obj.error) {
          const dl = document.createElement('a');
          dl.download = `${data.fileName || 'cropcap-clip'}.gif`;
          dl.href = obj.image;
          dl.click();
          
          document.getElementById('status').style.color = "#34d399";
          document.getElementById('status').innerText = "Tada! Your GIF has been compiled and downloaded successfully!";
          
          // Clean up cache parameters
          chrome.storage.local.remove(["pendingFrames", "targetW", "targetH", "fileName"]);
          setTimeout(() => window.close(), 1200);
        } else {
          alert("Error compiling: " + obj.error);
        }
      });

    } else {
      document.getElementById('status').innerText = "No asset buffers found in storage.";
    }
  });
});