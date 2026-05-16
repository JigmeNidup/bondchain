import { getConfig } from "./config.js";
import { createApp } from "./app.js";
import { ndiService } from "./services/ndi.js";

const config = getConfig();
const app = createApp();

try {
  await ndiService.startSubscriber();
  console.log("NDI NATS subscriber connected");
} catch (error) {
  console.error("NDI NATS subscriber failed to start", error);
}

app.listen(config.port, () => {
  console.log(`BondChain backend listening on http://localhost:${config.port}`);
});
