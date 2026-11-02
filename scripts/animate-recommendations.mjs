import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assetDir = join(root, "dist", "assets", "recommendations");
const videoDir = join(assetDir, "video");
mkdirSync(videoDir, { recursive: true });

function run(args) {
  const result = spawnSync(ffmpegPath, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`FFmpeg failed with exit code ${result.status}.`);
}

const sources = readdirSync(assetDir).filter((name) => name.endsWith(".jpg")).sort();
for (const sourceName of sources) {
  const stem = basename(sourceName, ".jpg");
  const source = join(assetDir, sourceName);
  const video = join(videoDir, `${stem}.mp4`);
  const motion = "scale=420:315:force_original_aspect_ratio=increase,crop=420:315,zoompan=z='1.04+0.015*sin(2*PI*on/39)':x='iw/2-(iw/zoom/2)+3*sin(2*PI*on/39)':y='ih/2-(ih/zoom/2)+2*cos(2*PI*on/39)':d=1:s=360x270:fps=8,format=yuv420p";

  run(["-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", source, "-t", "5", "-vf", motion, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "25", "-movflags", "+faststart", video]);
  console.log(`Created ${stem}: five-second looping MP4.`);
}
