import { execSync } from 'child_process';

const port = process.argv[2] ?? '3001';

function freePortWindows(targetPort) {
  try {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: 'utf8' });
    const pids = [
      ...new Set(
        output
          .split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => /^\d+$/.test(pid))
      ),
    ];

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`Освобождён порт ${targetPort}: завершён процесс ${pid}`);
      } catch {
        // process may already be gone
      }
    }
  } catch {
    // nothing listening
  }
}

function freePortUnix(targetPort) {
  try {
    execSync(`lsof -ti tcp:${targetPort} | xargs -r kill -9`, { stdio: 'ignore', shell: true });
    console.log(`Освобождён порт ${targetPort}`);
  } catch {
    // nothing listening
  }
}

if (process.platform === 'win32') {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
