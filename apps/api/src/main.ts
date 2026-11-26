import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // Local only by default: the API holds the team's personal details. Set HOST to expose it deliberately.
  await app.listen(Number(process.env.PORT ?? 4000), process.env.HOST ?? "127.0.0.1");
}
void bootstrap();
