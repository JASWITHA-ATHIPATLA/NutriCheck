import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { startNodeApiFallback } from './api-fallback.mjs';

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

function findPythonWithUvicorn() {
  const candidates = [
    path.resolve(process.cwd(), '.venv/Scripts/python.exe'),
    path.resolve(process.cwd(), '.venv/bin/python'),
    'py',
    'python',
    'python3',
  ];

  for (const cmd of candidates) {
    if (cmd.includes(path.sep) && !existsSync(cmd)) {
      continue;
    }
    const check = spawnSync(cmd, ['-c', 'import uvicorn'], {
      stdio: 'ignore',
    });
    if (!check.error && check.status === 0) {
      return cmd;
    }
  }
  return null;
}

async function main() {
  const children = [];
  let fallbackServer = null;

  const apiAlreadyRunning = await isPortOpen(API_HOST, API_PORT);
  if (!apiAlreadyRunning) {
    const pythonCmd = findPythonWithUvicorn();
    if (pythonCmd) {
      const apiProc = spawn(
        pythonCmd,
        ['-m', 'uvicorn', 'backend.main:app', '--host', API_HOST, '--port', String(API_PORT)],
        { stdio: 'inherit' }
      );
      apiProc.on('error', (err) => {
        console.error(`[HealthGuard] Failed to start FastAPI (${pythonCmd}): ${err.message}`);
      });
      apiProc.on('exit', (code) => {
        if (code && code !== 0) {
          console.error(`[HealthGuard] FastAPI exited with code ${code}`);
        }
      });
      children.push(apiProc);
    } else {
      fallbackServer = startNodeApiFallback({ host: API_HOST, port: API_PORT });
    }
  }

  const viteEntry = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
  if (!existsSync(viteEntry)) {
    console.error('[HealthGuard] Vite not found in node_modules. Run `npm install` first.');
    process.exit(1);
  }

  const viteProc = spawn(process.execPath, [viteEntry, '--port=3000', '--host=0.0.0.0'], {
    stdio: 'inherit',
  });
  viteProc.on('error', (err) => {
    console.error(`[HealthGuard] Failed to start Vite: ${err.message}`);
  });
  children.push(viteProc);

  const shutdown = () => {
    if (fallbackServer) {
      fallbackServer.close();
    }
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
