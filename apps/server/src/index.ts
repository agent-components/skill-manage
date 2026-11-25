import "dotenv/config";
import { config } from "./config/env.js";
import { buildServer } from "./server.js";

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`skill-manage server listening on http://${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
