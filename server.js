const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { execFile } = require("child_process");

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

const OUT = path.join(__dirname, "output");
fs.mkdirSync(OUT, { recursive: true });
app.use("/output", express.static(OUT));

function cleanupOutputs(maxAgeMs = 60 * 60 * 1000) {
  const now = Date.now();
  if (!fs.existsSync(OUT)) return;
  for (const name of fs.readdirSync(OUT)) {
    const full = path.join(OUT, name);
    if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) continue;
    const created = Number(name);
    const age = Number.isFinite(created) ? now - created : maxAgeMs + 1;
    if (age > maxAgeMs) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log("Deleted old output:", name);
    }
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

function download(url, dest, attempt = 1) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return download(res.headers.location, dest, attempt).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (attempt < 3) return download(url, dest, attempt + 1).then(resolve).catch(reject);
        return reject(new Error("Download failed: " + res.statusCode));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.setTimeout(120000, () => {
      req.destroy(); file.close();
      if (attempt < 3) return download(url, dest, attempt + 1).then(resolve).catch(reject);
      reject(new Error("Download timeout"));
    });
    req.on("error", err => {
      file.close();
      if (attempt < 3) return download(url, dest, attempt + 1).then(resolve).catch(reject);
      reject(err);
    });
  });
}

function cleanScript(script) {
  return script
    .replace(/\r/g, "\n")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join("\n");
}

function detectCategory(script) {
  const s = script.toLowerCase();
  const signals = {
    crime:      (s.match(/murder|police|case|crime|laash|hatya|khoon|inspector|court|arrest|jail|goli|weapon|knife|chori|robbery|criminal|suspect|evidence/g) || []).length,
    horror:     (s.match(/bhoot|haveli|aatma|dar|horror|shraap|ghost|raat|andhera|awaz|darwaza|shadow|spirit|haunted|curse|darawana|khauf/g) || []).length,
    scam:       (s.match(/scam|fraud|paise|bank|loan|dhokha|upi|otp|qr|cyber|thagi|fake|online|account|transfer|invest|scheme|ponzi/g) || []).length,
    history:    (s.match(/raja|yudh|history|purana|samrajya|empire|war|ancient|mughal|british|independence|revolt|king|queen|maharaja|battle|itihas/g) || []).length,
    psychology: (s.match(/psychology|mind|insaan|soch|aadat|habit|brain|emotion|behavior|mental|stress|anxiety|confidence|personality|thought/g) || []).length,
    mystery:    (s.match(/raaz|mystery|secret|hidden|unknown|strange|weird|ajib|rahasy|khoj|discover|research|science|space|ocean|deep|clue|puzzle|unsolved/g) || []).length,
    comedy:     (s.match(/funny|haha|joke|mazak|hansi|comedy|hasna|pagal|bakwas|ullu|bewakoof|meme|viral|entertainment/g) || []).length,
    motivation: (s.match(/inspire|motivat|success|zindagi|dream|sapna|mehnat|hardwork|achieve|goal|winner|champion|struggle|koshish|himmat/g) || []).length,
    technology: (s.match(/tech|ai|robot|computer|software|app|phone|internet|digital|machine|algorithm|data|code|hack|startup|innovation|future|gadget/g) || []).length,
    health:     (s.match(/health|sehat|bimari|doctor|hospital|medicine|diet|exercise|yoga|weight|disease|virus|cancer|cure/g) || []).length,
  };
  const top = Object.entries(signals).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : "story";
}

function detectMood(script, category) {
  const moodMap = {
    crime:      { lighting: "dark dramatic noir lighting", mood: "tense thriller atmosphere", env: "urban Indian street or police station" },
    horror:     { lighting: "eerie moonlight shadow lighting", mood: "terrifying haunted atmosphere", env: "dark haveli old Indian house or forest" },
    scam:       { lighting: "cold blue digital lighting", mood: "cyber fraud warning atmosphere", env: "modern office or phone screen environment" },
    history:    { lighting: "golden warm ancient lighting", mood: "epic historical atmosphere", env: "ancient Indian fort palace battlefield" },
    psychology: { lighting: "soft thoughtful studio lighting", mood: "deep introspective atmosphere", env: "minimal modern Indian interior" },
    mystery:    { lighting: "deep dramatic contrast lighting", mood: "mysterious suspenseful atmosphere", env: "unknown dark surreal environment" },
    comedy:     { lighting: "bright cheerful colorful lighting", mood: "fun energetic atmosphere", env: "vibrant Indian street market or home" },
    motivation: { lighting: "golden sunrise warm lighting", mood: "powerful inspiring atmosphere", env: "open sky mountain or stadium crowd" },
    technology: { lighting: "cool futuristic blue glow", mood: "innovative tech atmosphere", env: "modern tech lab or digital city" },
    health:     { lighting: "clean fresh natural lighting", mood: "calm wellness atmosphere", env: "hospital garden yoga studio" },
    story:      { lighting: "warm cinematic lighting", mood: "emotional storytelling atmosphere", env: "Indian household or street" },
  };
  return moodMap[category] || moodMap["story"];
}

function detectVoice(category) {
  const voices = {
    "hi-IN-SwaraNeural":  { rate: "+5%", pitch: "+2Hz", best: ["mystery", "story", "health", "psychology", "comedy", "horror"] },
    "hi-IN-MadhurNeural": { rate: "+5%", pitch: "+0Hz", best: ["crime", "scam", "history", "motivation", "technology"] },
  };
  for (const [voice, config] of Object.entries(voices)) {
    if (config.best.includes(category)) return { voice, rate: config.rate, pitch: config.pitch };
  }
  return { voice: "hi-IN-SwaraNeural", rate: "+5%", pitch: "+2Hz" };
}

function getBgMusic(category) {
  const musicMap = {
    horror:     "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749397c.mp3",
    crime:      "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946f0a8b2c.mp3",
    mystery:    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749397c.mp3",
    scam:       "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946f0a8b2c.mp3",
    motivation: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    history:    "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    psychology: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    comedy:     "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    technology: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    health:     "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    story:      "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  };
  return musicMap[category] || musicMap["story"];
}

function splitScenes(script) {
  return script
    .split(/[।.!?\n]+/)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => x.length > 8);
}

function safeFileText(text) {
  const clean = text.replace(/\n/g, " ").trim();
  const words = clean.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > 28) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 3).join("\n");
}

function visualPrompt(scene, category, mood, index) {
  const shots = ["wide establishing shot", "cinematic closeup", "medium documentary shot", "over the shoulder shot", "low angle dramatic shot", "dramatic object closeup"];
  const shot = shots[index % shots.length];
  const prompt = [scene, category + " story", mood.env, shot, "cinematic realistic photography", "vertical 9:16 composition", mood.lighting, mood.mood, "high detail sharp focus", "no text no watermark no logo", "no distorted face no extra fingers"].join(", ");
  return encodeURIComponent(prompt);
}

// ─── Ken Burns zoom patterns — variety for each clip ──────────────────────
function getZoomPan(index, totalFrames) {
  const patterns = [
    // Zoom in from center
    { z: `min(zoom+0.0008,1.10)`, x: `iw/2-(iw/zoom/2)`, y: `ih/2-(ih/zoom/2)` },
    // Zoom in from top-center (sky/face)
    { z: `min(zoom+0.0008,1.10)`, x: `iw/2-(iw/zoom/2)`, y: `0` },
    // Zoom in from bottom-center (ground/feet)
    { z: `min(zoom+0.0008,1.10)`, x: `iw/2-(iw/zoom/2)`, y: `ih-(ih/zoom)` },
    // Slow pan left to right
    { z: `1.08`, x: `(iw-iw/zoom)*on/${totalFrames}`, y: `ih/2-(ih/zoom/2)` },
    // Slow pan right to left
    { z: `1.08`, x: `(iw-iw/zoom)*(1-on/${totalFrames})`, y: `ih/2-(ih/zoom/2)` },
    // Zoom out from center
    { z: `if(lte(zoom,1.0),1.10,max(zoom-0.0008,1.0))`, x: `iw/2-(iw/zoom/2)`, y: `ih/2-(ih/zoom/2)` },
  ];
  return patterns[index % patterns.length];
}

async function makeFallbackImage(img, scene) {
  await run("ffmpeg", [
    "-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=1",
    "-vf", `drawtext=text='${scene.replace(/'/g, "").slice(0, 60)}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=850:box=1:boxcolor=black@0.6:boxborderw=25`,
    "-frames:v", "1", img
  ]);
}

// ─── Add fade in/out to a clip ─────────────────────────────────────────────
async function addFade(inputClip, outputClip, duration, fps) {
  const fadeDur = 0.4; // 0.4 sec fade
  const fadeOutStart = duration - fadeDur;
  await run("ffmpeg", [
    "-y", "-i", inputClip,
    "-vf", `fade=t=in:st=0:d=${fadeDur},fade=t=out:st=${fadeOutStart}:d=${fadeDur}`,
    "-c:v", "libx264",
    "-crf", "18",
    "-preset", "fast",
    "-pix_fmt", "yuv420p",
    "-r", String(fps),
    outputClip
  ]);
}

// ─── MAIN API ──────────────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  try {
    cleanupOutputs();
    const rawScript = String(req.body.script || "").trim();
    if (!rawScript) return res.json({ success: false, error: "Script missing" });

    const script   = cleanScript(rawScript);
    const scenes   = splitScenes(script);
    if (!scenes.length) return res.json({ success: false, error: "No scenes found" });

    const category = detectCategory(script);
    const mood     = detectMood(script, category);
    const voiceCfg = detectVoice(category);
    const musicUrl = getBgMusic(category);

    const id  = Date.now().toString();
    const dir = path.join(OUT, id);
    fs.mkdirSync(dir, { recursive: true });

    const audio       = path.join(dir, "audio.mp3");
    const bgMusic     = path.join(dir, "bgmusic.mp3");
    const list        = path.join(dir, "clips.txt");
    const silent      = path.join(dir, "silent.mp4");
    const video       = path.join(dir, "video.mp4");
    const summaryFile = path.join(dir, "summary.json");

    fs.writeFileSync(path.join(dir, "script.txt"), script, "utf8");

    console.log("═══════════════════════════════════");
    console.log("Category :", category);
    console.log("Mood     :", mood.mood);
    console.log("Voice    :", voiceCfg.voice);
    console.log("Scenes   :", scenes.length);
    console.log("═══════════════════════════════════");

    // ── Audio ──
    console.log("Generating Hindi audio...");
    const ttsText = script.replace(/\n/g, ". ");
    await run("python3", ["-m", "edge_tts", "--voice", voiceCfg.voice, "--rate", voiceCfg.rate, "--pitch", voiceCfg.pitch, "--text", ttsText, "--write-media", audio]);
    console.log("Audio done ✓");

    // ── BG Music ──
    console.log("Downloading bg music...");
    try { await download(musicUrl, bgMusic); console.log("BG music ready ✓"); }
    catch(e) { console.log("BG music skipped:", e.message); }

    const FPS = 25;
    const sceneDuration = Math.max(4, Math.min(7, Math.ceil(60 / scenes.length)));
    const totalFrames   = sceneDuration * FPS;
    let clipList = "";

    for (let i = 0; i < scenes.length; i++) {
      const img        = path.join(dir, `img_${i}.jpg`);
      const imgResized = path.join(dir, `img_${i}_r.jpg`);
      const clipRaw    = path.join(dir, `clip_${i}_raw.mp4`);
      const clip       = path.join(dir, `clip_${i}.mp4`);
      const sub        = path.join(dir, `sub_${i}.txt`);
      const url        = `https://image.pollinations.ai/prompt/${visualPrompt(scenes[i], category, mood, i)}?width=1080&height=1920&seed=${id}${i}&nologo=true`;

      fs.writeFileSync(sub, safeFileText(scenes[i]), "utf8");

      console.log(`Downloading image ${i + 1}/${scenes.length}...`);
      try { await download(url, img); }
      catch (e) { console.log(`Fallback image ${i + 1}`); await makeFallbackImage(img, scenes[i]); }
      console.log(`Image ${i + 1} ready ✓`);

      // Resize to exact 1080x1920
      await run("ffmpeg", [
        "-y", "-i", img,
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        imgResized
      ]);

      // Ken Burns zoom/pan pattern
      const kb = getZoomPan(i, totalFrames);

      console.log(`Making clip ${i + 1} (pattern ${i % 6})...`);

      // Outline caption style: dark border around text, no box
      await run("ffmpeg", [
        "-y",
        "-loop", "1",
        "-i", imgResized,
        "-t", String(sceneDuration),
        "-vf",
          `zoompan=z='${kb.z}':x='${kb.x}':y='${kb.y}':d=${totalFrames}:s=1080x1920:fps=${FPS},` +
          // Outline effect: draw text 4x with black offset, then white on top
          `drawtext=textfile=${sub}:fontcolor=black:fontsize=52:x=(w-text_w)/2+2:y=1442:line_spacing=12,` +
          `drawtext=textfile=${sub}:fontcolor=black:fontsize=52:x=(w-text_w)/2-2:y=1442:line_spacing=12,` +
          `drawtext=textfile=${sub}:fontcolor=black:fontsize=52:x=(w-text_w)/2:y=1444:line_spacing=12,` +
          `drawtext=textfile=${sub}:fontcolor=black:fontsize=52:x=(w-text_w)/2:y=1440:line_spacing=12,` +
          `drawtext=textfile=${sub}:fontcolor=white:fontsize=52:x=(w-text_w)/2:y=1442:line_spacing=12,` +
          `format=yuv420p`,
        "-r", String(FPS),
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        clipRaw
      ]);

      // Add fade in/out
      await addFade(clipRaw, clip, sceneDuration, FPS);

      clipList += `file '${clip}'\n`;
    }

    fs.writeFileSync(list, clipList, "utf8");

    console.log("Concatenating clips...");
    await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);

    console.log("Mixing audio + bg music...");
    const hasBgMusic = fs.existsSync(bgMusic) && fs.statSync(bgMusic).size > 1000;

    if (hasBgMusic) {
      await run("ffmpeg", [
        "-y",
        "-stream_loop", "-1", "-i", silent,
        "-stream_loop", "-1", "-i", audio,
        "-stream_loop", "-1", "-i", bgMusic,
        "-filter_complex",
          "[1:a]volume=1.0[voice];[2:a]volume=0.15[bg];[voice][bg]amix=inputs=2:duration=first[aout]",
        "-map", "0:v",
        "-map", "[aout]",
        "-shortest",
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        video
      ]);
    } else {
      await run("ffmpeg", [
        "-y",
        "-stream_loop", "-1", "-i", silent,
        "-i", audio,
        "-shortest",
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        video
      ]);
    }

    const summary = {
      success: true, jobId: id, category,
      mood: mood.mood, voice: voiceCfg.voice,
      bgMusic: hasBgMusic ? "added" : "skipped",
      scenes: scenes.length, sceneDuration,
      videoUrl:    "/output/" + id + "/video.mp4",
      downloadUrl: "/output/" + id + "/video.mp4",
      expiresIn: "1 hour"
    };

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), "utf8");
    console.log("═══════════════════════════════════");
    console.log("Video done ✓ :", summary.videoUrl);
    console.log("═══════════════════════════════════");
    res.json(summary);

  } catch (e) {
    console.error("ERROR:", e.message);
    res.json({ success: false, error: e.message });
  }
});

app.post("/generate", (req, res) => {
  req.url = "/api/generate";
  app._router.handle(req, res);
});

const server = require("http").createServer(app);
server.timeout = 600000;
server.listen(3000, () => console.log("Server running on port 3000"));

app.get("/api/status/:jobId", (req, res) => {
  const jobDir = path.join(OUT, req.params.jobId);
  const summaryFile = path.join(jobDir, "summary.json");
  const scriptFile = path.join(jobDir, "script.txt");

  if (!fs.existsSync(jobDir)) return res.json({ status: "not_found" });
  if (!fs.existsSync(scriptFile)) return res.json({ status: "not_found" });
  if (fs.existsSync(summaryFile)) {
    const summary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
    return res.json({ status: "done", ...summary });
  }
  return res.json({ status: "processing" });
});
