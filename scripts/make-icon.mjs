import { writeFile } from 'node:fs/promises';
import pngToIco from 'png-to-ico';

const buffer = await pngToIco('build/icon.png');
await writeFile('build/icon.ico', buffer);
console.log('Generated build/icon.ico');
