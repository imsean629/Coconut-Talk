import { readFile } from 'node:fs/promises';
import { rcedit } from 'rcedit';

const exePath = 'release/win-unpacked/Coconut Talk.exe';
const iconPath = 'build/icon.ico';
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version ?? '0.1.1';

await rcedit(exePath, {
  icon: iconPath,
  'product-version': version,
  'file-version': version,
  'version-string': {
    ProductName: 'Coconut Talk',
    FileDescription: 'Coconut Talk Desktop Messenger',
    InternalName: 'Coconut Talk',
    OriginalFilename: 'Coconut Talk.exe'
  }
});

console.log('Patched executable icon:', exePath);
