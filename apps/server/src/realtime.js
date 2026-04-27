import { createHash } from 'node:crypto';

function createAcceptKey(key) {
  return createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');
}

function encodeTextFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  if (len < 126) {
    return Buffer.concat([Buffer.from([0x81, len]), payload]);
  }
  if (len < 65536) {
    const header = Buffer.from([0x81, 126, (len >> 8) & 255, len & 255]);
    return Buffer.concat([header, payload]);
  }
  return null;
}

function decodeTextFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const b1 = buffer[offset];
    const b2 = buffer[offset + 1];
    const opcode = b1 & 0x0f;
    if (opcode === 0x8) return { messages, closed: true, rest: Buffer.alloc(0) };
    if (opcode !== 0x1) break;

    let payloadLen = b2 & 0x7f;
    let headerLen = 2;
    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = (buffer[offset + 2] << 8) | buffer[offset + 3];
      headerLen = 4;
    }

    const masked = (b2 & 0x80) === 0x80;
    const maskLen = masked ? 4 : 0;
    const totalLen = headerLen + maskLen + payloadLen;
    if (offset + totalLen > buffer.length) break;

    let payload = buffer.subarray(offset + headerLen + maskLen, offset + totalLen);
    if (masked) {
      const mask = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      const out = Buffer.alloc(payloadLen);
      for (let i = 0; i < payloadLen; i += 1) out[i] = payload[i] ^ mask[i % 4];
      payload = out;
    }

    messages.push(payload.toString('utf8'));
    offset += totalLen;
  }

  return { messages, closed: false, rest: buffer.subarray(offset) };
}

export function createRealtimeHub() {
  const roomClients = new Map();
  const socketMeta = new Map();

  function attachToRoom(socket, roomId, userId) {
    const prev = socketMeta.get(socket);
    if (prev?.roomId && roomClients.has(prev.roomId)) {
      roomClients.get(prev.roomId).delete(socket);
    }

    if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
    roomClients.get(roomId).add(socket);
    socketMeta.set(socket, { roomId, userId });
  }

  function broadcastRoom(roomId, event) {
    const clients = roomClients.get(roomId);
    if (!clients) return;

    const payload = encodeTextFrame(JSON.stringify(event));
    if (!payload) return;

    for (const client of clients) {
      if (!client.destroyed) client.write(payload);
    }
  }

  function handleUpgrade(req, socket) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const accept = createAcceptKey(key);
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n'
    ];
    socket.write(headers.join('\r\n'));

    let chunkBuffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      chunkBuffer = Buffer.concat([chunkBuffer, chunk]);
      const { messages, closed, rest } = decodeTextFrames(chunkBuffer);
      chunkBuffer = rest;
      if (closed) {
        socket.end();
        return;
      }

      for (const messageText of messages) {
        try {
          const message = JSON.parse(messageText);
          if (message.type === 'subscribe' && message.roomId) {
            attachToRoom(socket, message.roomId, message.userId || 'unknown');
            const ack = encodeTextFrame(JSON.stringify({ type: 'subscribed', roomId: message.roomId }));
            if (ack) socket.write(ack);
          }
        } catch {
          // ignore malformed client frame
        }
      }
    });

    socket.on('close', () => {
      const meta = socketMeta.get(socket);
      if (meta?.roomId && roomClients.has(meta.roomId)) roomClients.get(meta.roomId).delete(socket);
      socketMeta.delete(socket);
    });
  }

  return {
    handleUpgrade,
    broadcastRoom
  };
}
