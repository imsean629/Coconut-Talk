import { createRelayServer } from './createRelayServer.js';

createRelayServer().catch((error) => {
  console.error('Failed to start Coconut Talk relay server');
  console.error(error);
  process.exit(1);
});
