const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, 'apps/api');
const tsx = path.resolve(__dirname, 'apps/api/node_modules/.bin/tsx.CMD');

const proc = spawn('cmd', ['/c', tsx, 'watch', 'src/server.ts'], {
  cwd: root,
  detached: true,
  windowsHide: true,
  stdio: 'ignore'
});
proc.unref();
console.log('API server detached, PID:', proc.pid);
setTimeout(() => process.exit(0), 3000);
