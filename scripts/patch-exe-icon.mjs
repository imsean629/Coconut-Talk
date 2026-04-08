import { rcedit } from 'rcedit';

const exePath = 'release/win-unpacked/Coconut Talk.exe';
const iconPath = 'build/icon.ico';

await rcedit(exePath, {
  icon: iconPath,
  'product-version': '0.1.0',
  'file-version': '0.1.0',
  'version-string': {
    ProductName: 'Coconut Talk',
    FileDescription: 'Coconut Talk Desktop Messenger',
    InternalName: 'Coconut Talk',
    OriginalFilename: 'Coconut Talk.exe'
  }
});

console.log('Patched executable icon:', exePath);
