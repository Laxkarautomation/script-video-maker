const express = require("express");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const https = require("https");

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

const OUT = path.join(__dirname, "output");
fs.mkdirSync(OUT, { recursive: true });
app.use("/output", express.static(OUT));

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

function scenesFromScript(script) {
  return script
    .split(/[।.!?\n]+/)
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function promptForScene(scene) {
  return encodeURIComponent(
    "cinematic realistic vertical 9:16 scene, dramatic lighting, detailed environment, emotional storytelling, no text, no watermark. Scene: " + scene
  );
}

app.post("/generate", async (req, res) => {
  try {
    const script = String(req.body.script || "").trim();
    if (!script) return res.json({ success:false, error:"Script missing" });

    const id = Date.now().toString();
    const dir = path.join(OUT, id);
    fs.mkdirSync(dir, { recursive:true });

    const audio = path.join(dir, "audio.mp3");
    const list = path.join(dir, "list.txt");
    const silent = path.join(dir, "silent.mp4");
    const video = path.join(dir, "video.mp4");

    const scenes = scenesFromScript(script);
    fs.writeFileSync(path.join(dir, "script.txt"), script, "utf8");

    console.log("Generating audio");
    await run("python3", ["-m", "edge_tts", "--voice", "hi-IN-MadhurNeural", "--text", script, "--write-media", audio]);
    console.log("Audio done");

    let imageList = "";

    for (let i = 0; i < scenes.length; i++) {
      const img = path.join(dir, `img_${i}.jpg`);
      const url = `https://image.pollinations.ai/prompt/${promptForScene(scenes[i])}?width=1080&height=1920&seed=${id}${i}&nologo=true`;
      console.log("Downloading image", i + 1);
      await download(url, img);
      console.log("Image done", i + 1);
      imageList += `file '${img}'\n`;
      imageList += `duration 4\n`;
    }

    imageList += `file '${path.join(dir, `img_${scenes.length - 1}.jpg`)}'\n`;
    fs.writeFileSync(list, imageList, "utf8");

    console.log("Making slideshow");
    await run("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", list,
      "-vf", "scale=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=100:s=1080x1920,format=yuv420p",
      "-r", "25",
      silent
    ]);
    console.log("Slideshow done");

    console.log("Adding audio");
    await run("ffmpeg", ["-y", "-stream_loop", "-1", "-i", silent, "-i", audio, "-shortest", "-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p", video]);
    console.log("Video done");

    res.json({ success:true, video:"/output/" + id + "/video.mp4" });
  } catch(e) {
    console.error(e.message);
    res.json({ success:false, error:e.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
