import type { Recipe } from "./core";
export function seed(text: string) {
  let n = 0;
  for (const c of text) n = (Math.imul(n, 31) + c.charCodeAt(0)) | 0;
  return Math.abs(n);
}
export function draw(canvas: HTMLCanvasElement, recipe: Recipe, time: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height,
    s = seed(recipe.prompt),
    hue = s % 360;
  ctx.fillStyle = "#101419";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  const t = time / 1000;
  let x = 0,
    y = 0,
    z = 1,
    a = 0;
  switch (recipe.cameraPresetId) {
    case "push":
      z = 1 + t * 0.045;
      break;
    case "pull":
      z = 1.3 - t * 0.025;
      break;
    case "orbit":
      x = Math.sin(t * 0.65) * w * 0.12;
      a = Math.sin(t * 0.4) * 0.06;
      break;
    case "left":
      x = t * w * 0.025;
      break;
    case "right":
      x = -t * w * 0.025;
      break;
    case "tilt":
      y = t * h * 0.035;
      break;
    case "handheld":
      x = Math.sin(t * 4) * 8;
      y = Math.cos(t * 3) * 5;
      break;
    case "crane":
      y = t * h * 0.07;
      break;
    case "whip":
      x = Math.sin(t * 2) * w * 0.2;
      break;
  }
  ctx.translate(w / 2 + x, h / 2 + y);
  ctx.scale(z, z);
  ctx.rotate(a);
  ctx.translate(-w / 2, -h / 2);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, `hsl(${hue},32%,12%)`);
  sky.addColorStop(0.6, `hsl(${(hue + 35) % 360},42%,35%)`);
  sky.addColorStop(1, "#0d171b");
  ctx.fillStyle = sky;
  ctx.fillRect(-w, -h, w * 3, h * 3);
  const glow = ctx.createRadialGradient(
    w * 0.64,
    h * 0.35,
    0,
    w * 0.64,
    h * 0.35,
    w * 0.35,
  );
  glow.addColorStop(0, `hsla(${(hue + 70) % 360},75%,80%,.65)`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `hsl(${(hue + 55) % 360},55%,77%)`;
  ctx.beginPath();
  ctx.arc(w * 0.64, h * 0.35, h * 0.09, 0, Math.PI * 2);
  ctx.fill();
  for (let layer = 0; layer < 5; layer++) {
    ctx.fillStyle = `hsl(${(hue + 10) % 360},${20 - layer * 2}%,${24 - layer * 4}%)`;
    ctx.beginPath();
    ctx.moveTo(-w, h * 2);
    for (let i = -10; i <= 30; i++) {
      const xx = (i * w) / 20;
      const yy =
        h * (0.5 + layer * 0.1) +
        Math.sin(i * 0.7 + s + layer * 2) * h * 0.09 +
        Math.cos(i * 1.3 + layer) * h * 0.04;
      ctx.lineTo(xx, yy);
    }
    ctx.lineTo(w * 2, h * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.15)";
  for (let i = 0; i < 45; i++) {
    ctx.fillRect((i * 137 + s) % w, (i * 79 + s) % h, 1, 1);
  }
}
export function recordingType() {
  if (
    typeof MediaRecorder === "undefined" ||
    !HTMLCanvasElement.prototype.captureStream
  )
    return "";
  return (
    ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) =>
      MediaRecorder.isTypeSupported(t),
    ) ?? ""
  );
}
export async function record(recipe: Recipe): Promise<Blob> {
  const type = recordingType();
  if (!type) throw new Error("WebM recording is unavailable in this browser.");
  const c = document.createElement("canvas");
  const width = recipe.resolution === "1080p" ? 1920 : 1280;
  [c.width, c.height] =
    recipe.aspect === "9:16"
      ? [Math.round((width * 9) / 16), width]
      : recipe.aspect === "1:1"
        ? [width, width]
        : [width, Math.round((width * 9) / 16)];
  draw(c, recipe, 0);
  const stream = c.captureStream(30),
    recorder = new MediaRecorder(stream, {
      mimeType: type,
      videoBitsPerSecond: 2500000,
    });
  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    let frame = 0;
    const start = performance.now();
    const cleanup = () => {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error("Recording failed. Please try again."));
    };
    recorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type }));
    };
    recorder.start();
    const tick = () => {
      const elapsed = performance.now() - start;
      draw(c, recipe, elapsed);
      if (elapsed >= recipe.durationSec * 1000) {
        recorder.stop();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
  });
}
