const fs = require('fs');
const path = require('path');

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const src = path.join(process.cwd(), 'api');
  const dest = path.join(process.cwd(), 'dist', 'api');
  try {
    const stat = await fs.promises.stat(src);
    if (!stat.isDirectory()) return;
  } catch (e) {
    // no api dir — nothing to copy
    return;
  }
  await copyDir(src, dest);
  console.log('Copied api/ -> dist/api');
}

main().catch((err) => {
  console.error('Failed to copy api directory:', err);
  process.exit(1);
});
