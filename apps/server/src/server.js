import http from 'node:http';
import { createApp } from './app.js';
import { createRealtimeHub } from './realtime.js';

const port = Number(process.env.PORT || 4000);
const realtimeHub = createRealtimeHub();
const server = http.createServer(createApp({ realtimeHub }));

server.on('upgrade', (req, socket) => {
  if (req.url?.startsWith('/ws') || req.url?.startsWith('/ws/signaling')) {
    realtimeHub.handleUpgrade(req, socket);
    return;
  }
  socket.destroy();
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ghat-server] listening on :${port}`);
});
