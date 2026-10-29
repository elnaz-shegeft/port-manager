
import http from "node:http";
import { scanOccupiedPorts } from "./port-scanner.js";

function readPortArgument(flag: string, defaultPort: number): number {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);

  if (index === -1) {
    return defaultPort;
  }

  const value = args[index + 1];

  if (!value || !/^\d+$/.test(value)) {
    throw new Error(`${flag} must be followed by a port number.`);
  }

  const port = Number(value);

  if (port < 1 || port > 65535) {
    throw new Error(`${flag} must be between 1 and 65535.`);
  }

  return port;
}

function startServer(port: number, endPort: number): void {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`This port is available and ready to use! Port: ${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && port < endPort) {
      console.log(`Port ${port} is occupied. Trying ${port + 1}...`);
      startServer(port + 1, endPort);
      return;
    }

    console.error("Could not start server:", error.message);
    process.exitCode = 1;
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Port: ${port}`);
    console.log(`PID: ${process.pid}`);
  });
}

async function main(): Promise<void> {
  const startPort = readPortArgument("--start-port", 3000);
  const endPort = readPortArgument("--end-port", 3010);

  if (startPort > endPort) {
    throw new Error("The start port cannot be greater than the end port.");
  }

  const occupiedPorts = await scanOccupiedPorts(startPort, endPort);

  console.log("Occupied ports:");

  const occupiedPortNumbers = new Set<number>();

  for (const { port, pid } of occupiedPorts) {
    console.log(`Port ${port} — PID ${pid}`);
    occupiedPortNumbers.add(port);
  }

  let selectedPort = startPort;

  while (
    selectedPort <= endPort &&
    occupiedPortNumbers.has(selectedPort)
  ) {
    selectedPort++;
  }

  if (selectedPort > endPort) {
    throw new Error(
      `No available ports found between ${startPort} and ${endPort}.`
    );
  }

  startServer(selectedPort, endPort);
}

main().catch((error: unknown) => {
  console.error(
    "Failed to start port manager:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
