import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import pngToIco from 'png-to-ico';

await new Promise((resolve, reject) => {
  const child = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', 'build/make-icon.ps1'], {
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) {
      resolve(undefined);
      return;
    }

    reject(new Error(`Icon PNG generation failed with exit code ${code ?? 'unknown'}`));
  });
});

const buffer = await pngToIco('build/icon.png');
await writeFile('build/icon.ico', buffer);
console.log('Generated build/icon.ico');
