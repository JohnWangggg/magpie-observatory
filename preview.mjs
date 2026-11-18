// Standalone preview, outside Magpie: node preview.mjs
import { startServer } from "./server.mjs";

const port = Number(process.env.PORT) || 8777;
startServer({ port }).then(({ url }) => {
  console.log(`Magpie Observatory preview → ${url}`);
  console.log("Open it. A local Magpie is detected automatically; ?demo=1 forces demo data.");
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
