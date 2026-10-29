
import { execFile } from "node:child_process";

export interface OccupiedPort {
  port: number;
  pid: number;
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8" }, (error, stdout) => {
      if (error) {
        const code = (error as NodeJS.ErrnoException).code;

        if (code === "ENOENT") {
          reject(
            new Error(`Required system command "${command}" was not found.`)
          );
          return;
        }

        reject(new Error(`Command "${command}" failed: ${error.message}`));
        return;
      }

      resolve(stdout);
    });
  });
}

export async function scanOccupiedPorts(
  startPort: number,
  endPort: number
): Promise<OccupiedPort[]> {
  const isWindows = process.platform === "win32";

  const output = isWindows
    ? await runCommand("netstat", ["-ano", "-p", "tcp"])
    : await runCommand("lsof", [
        "-nP",
        "-iTCP",
        "-sTCP:LISTEN",
      ]);

  const occupiedPorts = new Map<string, OccupiedPort>();

  for (const line of output.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);

    let port: number;
    let pid: number;

    if (isWindows) {
      if (columns[3] !== "LISTENING") continue;

      const address = columns[1];
      const pidText = columns[4];

      if (!address || !pidText) continue;

      port = Number(address.slice(address.lastIndexOf(":") + 1));
      pid = Number(pidText);
    } else {
      const pidText = columns[1];
      const address = columns[columns.length - 2];

      if (!pidText || !address) continue;

      const match = address.match(/:(\d+)$/);
      if (!match) continue;

      port = Number(match[1]);
      pid = Number(pidText);
    }

    if (
      Number.isInteger(port) &&
      port >= startPort &&
      port <= endPort &&
      Number.isInteger(pid) &&
      pid > 0
    ) {
      occupiedPorts.set(`${port}:${pid}`, { port, pid });
    }
  }

  return [...occupiedPorts.values()].sort((a, b) => a.port - b.port);
}
