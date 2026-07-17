async function generateVideo() {
  const script  = document.getElementById("script").value.trim();
  const btn     = document.getElementById("generateBtn");
  const box     = document.getElementById("statusBox");
  const dlBtn   = document.getElementById("download");
  const vidWrap = document.getElementById("videoWrap");
  const video   = document.getElementById("video");

  if (!script) {
    box.className = "status-error";
    box.textContent = "Pehle script paste karo!";
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");
  btn.textContent = "Ban raha hai...";
  dlBtn.style.display = "none";
  vidWrap.style.display = "none";

  const messages = [
    "Script analyze ho rahi hai...",
    "Hindi audio generate ho raha hai...",
    "Images download ho rahi hain...",
    "Clips ban rahe hain...",
    "Video assemble ho raha hai...",
    "Final touches lag rahe hain..."
  ];
  let msgIdx = 0;

  function setLoading(msg) {
    box.className = "status-loading";
    box.innerHTML = '<div class="spinner"></div><div class="status-text">' + msg + '</div>';
  }

  setLoading(messages[0]);
  const msgTimer = setInterval(function() {
    msgIdx = (msgIdx + 1) % messages.length;
    setLoading(messages[msgIdx]);
  }, 8000);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: script })
    });

    const text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      throw new Error("Server response parse nahi hua. Terminal check karo.");
    }

    clearInterval(msgTimer);

    if (!data.success) {
      box.className = "status-error";
      box.textContent = "Error: " + data.error;
    } else {
      box.className = "status-success";
      box.innerHTML =
        '<div class="label">Video Ready</div>' +
        '<div class="info">Job: ' + data.jobId + ' &bull; ' + data.scenes + ' scenes &bull; BG Music: ' + (data.bgMusic || 'skipped') + '</div>' +
        '<div class="meta-tags">' +
          '<div class="meta-tag">Category <span>' + data.category + '</span></div>' +
          '<div class="meta-tag">Mood <span>' + (data.mood || '') + '</span></div>' +
          '<div class="meta-tag">Voice <span>' + (data.voice || '').replace('hi-IN-','').replace('Neural','') + '</span></div>' +
        '</div>';

      video.src = data.videoUrl + "?t=" + Date.now();
      vidWrap.style.display = "block";
      dlBtn.href = data.downloadUrl + "?t=" + Date.now();
      dlBtn.style.display = "block";
    }
  } catch(e) {
    clearInterval(msgTimer);
    box.className = "status-error";
    box.textContent = "Error: " + e.message;
  }

  btn.disabled = false;
  btn.classList.remove("loading");
  btn.textContent = "Video Banao";
}
