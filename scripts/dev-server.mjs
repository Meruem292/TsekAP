import { createServer } from "vite";

const requestedPort = Number.parseInt(process.env.PORT || "5173", 10);
const port = Number.isFinite(requestedPort) ? requestedPort : 5173;

const server = await createServer({
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true
  }
});

await server.listen();
server.printUrls();
