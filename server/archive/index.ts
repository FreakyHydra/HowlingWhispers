import { createServer } from "node:http";
import { archiveHandler, archiveServerConfigPort, initArchive } from "./router.ts";

const port = archiveServerConfigPort();
const host = "127.0.0.1";

await initArchive();

const server = createServer((req, res) => archiveHandler(req, res));

server.listen(port, host, () => {
  console.log(`[archive] The Whispering Archive listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[archive] ${signal} received, shutting down.`);
    server.close(() => process.exit(0));
  });
}