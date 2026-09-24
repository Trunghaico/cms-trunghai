const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'logo.svg');
  
  if (!fs.existsSync(svgPath)) {
    console.error('logo.svg not found!');
    return;
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Render logo SVG to 400x400 PNG with transparent background
  const logoInner = await sharp(svgBuffer)
    .resize(380, 380, { fit: 'inside' })
    .toBuffer();

  // 2. Generate 512x512 Apple Touch Icon with solid clean white background (#ffffff)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: logoInner,
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Created apple-touch-icon.png (512x512 white background)');

  // 3. Generate icon-512.png (PWA Maskable & Any)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: logoInner,
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(publicDir, 'icon-512.png'));

  console.log('Created icon-512.png (512x512 white background)');

  // 4. Generate icon-192.png (PWA 192x192)
  const logoInner192 = await sharp(svgBuffer)
    .resize(145, 145, { fit: 'inside' })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: logoInner192,
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(publicDir, 'icon-192.png'));

  console.log('Created icon-192.png (192x192 white background)');
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
