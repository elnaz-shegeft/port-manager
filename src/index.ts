
import http from "node:http";
import { scanOccupiedPorts } from "./port-scanner.js";

const START_PORT = 3000;
const END_PORT = 3010;

function startServer(port: number): void {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`This port is available and ready to use! Port: ${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && port < END_PORT) {
      console.log(`Port ${port} is occupied. Trying ${port + 1}...`);
      startServer(port + 1);
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
  const occupiedPorts = await scanOccupiedPorts(3000, 3010);

  console.log("Occupied ports:");

  for (const { port, pid } of occupiedPorts) {
    console.log(`Port ${port} — PID ${pid}`);
  }

  startServer(START_PORT);
}

main().catch((error: unknown) => {
  console.error("Failed to start port manager:", error);
  process.exitCode = 1;
});