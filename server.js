import http from "node:http";
import process from "node:process";

import { createRequestHandler } from "./app-handler.js";
import { SocialSystemStore } from "./social-system-store.js";

const port = Number(process.env.PORT || 3030);
const store = new SocialSystemStore(process.env.SOCIAL_SYSTEM_DATA_FILE);

await store.init();

const server = http.createServer(createRequestHandler(store));

server.listen(port, () => {
  console.log(`Lobster social HQ listening on http://localhost:${port}`);
});
