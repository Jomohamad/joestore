import './server/types/express.d.ts';
import { startServer } from './server/bootstrap/startServer.js';

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
