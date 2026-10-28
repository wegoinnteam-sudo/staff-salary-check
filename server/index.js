import path from 'node:path';
import { spawn } from 'node:child_process';
import { createApp } from './app.js';

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || (dev ? 3001 : 3000));
const server = createApp({ dataDir: path.resolve(process.env.PAYROLL_DATA_DIR || '.data') });
server.listen(port, '0.0.0.0', () => console.log(`급여 앱 서버: http://localhost:${port}`));
if (dev) {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '3000'], { stdio: 'inherit' });
  const stop = () => { vite.kill(); server.close(); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  vite.on('exit', () => server.close());
}
