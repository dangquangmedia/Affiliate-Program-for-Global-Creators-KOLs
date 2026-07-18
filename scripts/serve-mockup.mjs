import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = normalize(join(process.cwd(), "docs/product/mockup"));
const port = Number(process.env.MOCKUP_PORT ?? 4173);
const types = { ".html": "text/html; charset=utf-8", ".png": "image/png" };

createServer(async (request, response) => {
  const requested = request.url === "/" ? "/creator-prototype.html" : request.url;
  const file = normalize(join(root, requested.split("?")[0]));
  if (!file.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": types[extname(file)] ?? "text/plain" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Creator mockup: http://127.0.0.1:${port}`);
});

