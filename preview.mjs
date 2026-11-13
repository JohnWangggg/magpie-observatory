// Standalone preview, outside Magpie: node preview.mjs
import { startServer } from "./server.mjs";

const port = Number(process.env.PORT) || 8777;
startServer({ port }).then(({ url }) => {
  console.log(`Magpie Observatory preview → ${url}`);
  console.log("Open it, click 演示数据 / 实时连接 to try a local Magpie gateway.");
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
