import http from 'node:http';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 4000);
const server = http.createServer(createApp());

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ghat-server] listening on :${port}`);
});
