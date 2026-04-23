import fs from "fs";
import { app } from "./app";
import { env } from "./config/env";

fs.mkdirSync(env.fileUploadDir, { recursive: true });

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`TypeScript backend listening on port ${env.port}`);
});
