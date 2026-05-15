const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname);

function startServer(name, args, delay = 0) {
  setTimeout(() => {
    const proc = spawn('cmd', ['/c', ...args], {
      cwd: root,
      detached: true,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    proc.stdout.on('data', d => console.log(`[${name}]`, d.toString().trim()));
    proc.stderr.on('data', d => console.error(`[${name} ERR]`, d.toString().trim()));
    proc.unref();
    console.log(`${name} server started, PID:`, proc.pid);
  }, delay);
}

startServer('API', ['pnpm', '--filter', '@saas/api', 'dev'], 0);
startServer('WEB', ['pnpm', '--filter', '@saas/web', 'dev'], 6000);

setTimeout(() => {
  console.log('Launcher exiting. Servers should remain running.');
  process.exit(0);
}, 15000);
