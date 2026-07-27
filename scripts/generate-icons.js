// scripts/generate-icons.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE = path.join(__dirname, '../public/favicon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

const ICONS = [
  { size: 192, name: 'shortcut-search.png' },
  { size: 192, name: 'shortcut-requests.png' },
  { size: 192, name: 'shortcut-profile.png' },
];

async function generateIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(SOURCE)) {
    console.error(`❌ Source non trouvée: ${SOURCE}`);
    console.log('ℹ️  Utilisation de pwa-192.png comme source de remplacement...');
    
    // Fallback: utiliser pwa-192.png si favicon n'existe pas
    const fallbackSource = path.join(__dirname, '../public/pwa-192.png');
    if (fs.existsSync(fallbackSource)) {
      for (const icon of ICONS) {
        const outputPath = path.join(OUTPUT_DIR, icon.name);
        console.log(`📝 Génération de ${icon.name}...`);
        await sharp(fallbackSource)
          .resize(icon.size, icon.size)
          .png()
          .toFile(outputPath);
      }
    }
    return;
  }

  for (const icon of ICONS) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    console.log(`📝 Génération de ${icon.name}...`);
    await sharp(SOURCE)
      .resize(icon.size, icon.size)
      .png()
      .toFile(outputPath);
  }

  console.log('✅ Toutes les icônes ont été générées !');
}

generateIcons().catch(console.error);