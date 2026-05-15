const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function launch(name, cwd, args) {
  const logPath = path.resolve(__dirname, `${name}.log`);
  const out = fs.openSync(logPath, 'a');
  
  const child = spawn('cmd', ['/c', ...args], {
    cwd: path.resolve(__dirname, cwd),
    detached: true,
    stdio: ['ignore', out, out],
    windowsHide: true
  });
  
  child.unref();
  fs.closeSync(out);
  console.log(`${name} launched, PID:`, child.pid);
  return child;
}

// Clear old logs
try { fs.unlinkSync('api.log'); } catch(e) {}
try { fs.unlinkSync('web.log'); } catch(e) {}

const api = launch('api', 'apps/api', ['pnpm', 'dev']);
setTimeout(() => {
  const web = launch('web', 'apps/web', ['pnpm', 'dev']);
}, 4000);

setTimeout(() => {
  console.log('Launcher done. Check api.log and web.log');
  process.exit(0);
}, 8000);
