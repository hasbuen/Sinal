import { appConfig } from "./config/app.config";
import { createHttpServer } from "./server";

async function bootstrap() {
  const server = await createHttpServer();
  server.listen(appConfig.port, "0.0.0.0");
}

void bootstrap();
