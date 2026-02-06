const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const baseColor = "#34A853";
const paddingRatio = 0.08;
const sizes = [192, 512];

const svgTemplate = (size, pad) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${baseColor}" />
  <rect x="${pad}" y="${pad + 12}" width="${size - pad * 2}" height="${size * 0.55}" rx="${Math.floor(size * 0.06)}" fill="#fff"/>
  <rect x="${pad}" y="${pad + 12 + size * 0.55 - size * 0.35}" width="${size - pad * 2}" height="${size * 0.2}" fill="${baseColor}"/>
  <rect x="${pad + (size - pad * 2) * 0.15}" y="${pad + 12 + size * 0.4}" width="${Math.floor(size * 0.04)}" height="${Math.floor(size * 0.14)}" fill="${baseColor}"/>
  <circle cx="${pad + (size - pad * 2) * 0.15}" cy="${pad + 12 + size * 0.45}" r="${Math.floor(size * 0.04)}" stroke="${baseColor}" stroke-width="${Math.max(2, Math.floor(size * 0.02))}" fill="none"/>
  <text x="${pad + (size - pad * 2) * 0.7}" y="${pad + 12 + size * 0.55 * 0.9}" font-size="${Math.floor(size * 0.18)}" font-family="Inter, Arial, sans-serif" font-weight="600" fill="${baseColor}" text-anchor="middle" dominant-baseline="middle">$</text>
</svg>`;

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const renderSvg = async (size) => {
  const pad = Math.floor(size * paddingRatio);
  const svg = svgTemplate(size, pad);
  return sharp(Buffer.from(svg)).png().toBuffer();
};

const run = async () => {
  for (const size of sizes) {
    const buffer = await renderSvg(size);
    const file = path.join("public", "icons", `icon-${size}.png`);
    ensureDir(file);
    fs.writeFileSync(file, buffer);
    const maskableFile = path.join("public", "icons", `icon-${size}-maskable.png`);
    fs.writeFileSync(maskableFile, buffer);
  }
  const favicon = await renderSvg(64);
  const faviconPath = path.join("public", "icons", "favicon.png");
  ensureDir(faviconPath);
  fs.writeFileSync(faviconPath, favicon);
};

run().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
