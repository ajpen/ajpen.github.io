import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'src', 'public', 'manifest.webmanifest', 'sw.js']) await cp(file, `dist/${file}`, { recursive: true });
console.log('Built static PWA in dist/. Serve over HTTPS to install on iOS.');
