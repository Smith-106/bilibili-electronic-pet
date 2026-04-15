import { createServer } from './server.js';

async function main(): Promise<void> {
  const app = createServer();
  const port = Number.parseInt(process.env.PORT ?? '8080', 10);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ port, host });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
