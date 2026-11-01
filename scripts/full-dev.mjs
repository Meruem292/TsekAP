import { createServer as createHttpServer } from "node:http";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createServer as createViteServer } from "vite";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && process.env.USERPROFILE) {
  const secretDirectory = join(process.env.USERPROFILE, ".tsekap-secrets");
  if (existsSync(secretDirectory)) {
    const credential = readdirSync(secretDirectory).find((name) =>
      /^tsekap-student-health-firebase-adminsdk-.*\.json$/i.test(name)
    );
    if (credential) process.env.FIREBASE_SERVICE_ACCOUNT_PATH = join(secretDirectory, credential);
  }
}

const api = await import("../api/[...path].js");
const vite = await createViteServer({
  appType: "spa",
  server: { middlewareMode: true }
});
const port = Number.parseInt(process.env.PORT || "3000", 10);

const server = createHttpServer(async (incoming, outgoing) => {
  if (!incoming.url?.startsWith("/api/")) {
    vite.middlewares(incoming, outgoing, () => {
      outgoing.statusCode = 404;
      outgoing.end("Not found");
    });
    return;
  }

  try {
    const method = incoming.method || "GET";
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const payload = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
      method,
      headers: incoming.headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : payload
    });
    const handler = api[method];
    const response = handler
      ? await handler(request)
      : Response.json({ error: "Method not allowed." }, { status: 405 });
    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("Local API bridge error", error);
    outgoing.statusCode = 500;
    outgoing.setHeader("content-type", "application/json");
    outgoing.end(JSON.stringify({ error: "The local service could not complete this request." }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`TsekAP ready at http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => {
  await vite.close();
  server.close(() => process.exit(0));
});
