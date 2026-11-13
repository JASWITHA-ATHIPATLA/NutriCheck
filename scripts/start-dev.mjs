import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const API_HOST = '127.0.0.1';
const API_PORT = 8001;

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  const children = [];

  const apiAlreadyRunning = await isPortOpen(API_HOST, API_PORT);
  if (!apiAlreadyRunning) {
    const venvPython = path.resolve(process.cwd(), '.venv/bin/python');
    const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';

    const apiProc = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'backend.main:app', '--host', API_HOST, '--port', String(API_PORT)],
      { stdio: 'inherit' }
    );
    apiProc.on('exit', (code) => {
      if (code && code !== 0) {
        console.error(`[HealthGuard] FastAPI exited with code ${code}`);
      }
    });
    children.push(apiProc);
  }

  const viteBin = path.resolve(process.cwd(), 'node_modules/.bin/vite');
  const viteProc = spawn(viteBin, ['--port=3000', '--host=0.0.0.0'], {
    stdio: 'inherit',
  });
  children.push(viteProc);

  const shutdown = () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  viteProc.on('exit', (code) => {
    for (const child of children) {
      if (child !== viteProc && !child.killed) {
        child.kill('SIGTERM');
      }
    }
    process.exit(code ?? 0);
  });
}

main();
