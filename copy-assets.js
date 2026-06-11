import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('./dist');
const destDir = path.resolve('./android/app/src/main/assets');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

try {
  console.log('[Assets Copier] Cleaning up old Android assets...');
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  
  console.log('[Assets Copier] Copying new dist build to Android assets...');
  copyRecursiveSync(srcDir, destDir);
  console.log('[Assets Copier] Assets synchronized successfully!');
} catch (error) {
  console.error('[Assets Copier] Error during assets sync:', error);
}
