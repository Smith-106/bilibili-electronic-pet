import { createServer } from './main.js';

async function start(): Promise<void> {
  const app = createServer();
  const port = Number.parseInt(process.env.PORT ?? '8000', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
