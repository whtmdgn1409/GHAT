import { createHash } from 'node:crypto';

function createAcceptKey(key) {
  return createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');
}

function encodeTextFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  if (len < 126) return Buffer.concat([Buffer.from([0x81, len]), payload]);
  if (len < 65536) return Buffer.concat([Buffer.from([0x81, 126, (len >> 8) & 255, len & 255]), payload]);
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

  function getRoomPresence(roomId) {
    const clients = roomClients.get(roomId) || new Set();
    return [...clients].map((socket) => {
      const meta = socketMeta.get(socket);
      return {
        userId: meta.userId,
        displayName: meta.displayName || meta.userId,
        cameraOn: Boolean(meta.cameraOn),
        micOn: Boolean(meta.micOn),
        quality: meta.quality || { rttMs: null, packetLossPct: null }
      };
    });
  }

  function attachToRoom(socket, roomId, userId, displayName) {
    const prev = socketMeta.get(socket);
    if (prev?.roomId && roomClients.has(prev.roomId)) roomClients.get(prev.roomId).delete(socket);

    if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
    roomClients.get(roomId).add(socket);
    socketMeta.set(socket, {
      roomId,
      userId,
      displayName,
      cameraOn: true,
      micOn: true,
      quality: { rttMs: null, packetLossPct: null }
    });

    broadcastRoom(roomId, {
      type: 'participant.joined',
      roomId,
      payload: { userId, displayName: displayName || userId, participants: getRoomPresence(roomId) },
      emittedAt: new Date().toISOString()
    });
  }

  function sendToSocket(socket, event) {
    const payload = encodeTextFrame(JSON.stringify(event));
    if (payload && !socket.destroyed) socket.write(payload);
  }

  function broadcastRoom(roomId, event) {
    const clients = roomClients.get(roomId);
    if (!clients) return;
    for (const client of clients) sendToSocket(client, event);
  }

  function sendToUser(roomId, targetUserId, event) {
    const clients = roomClients.get(roomId);
    if (!clients) return;
    for (const client of clients) {
      const meta = socketMeta.get(client);
      if (meta?.userId === targetUserId) sendToSocket(client, event);
    }
  }

  function updateParticipantState(socket, updates) {
    const meta = socketMeta.get(socket);
    if (!meta) return;
    Object.assign(meta, updates);

    broadcastRoom(meta.roomId, {
      type: 'participant.updated',
      roomId: meta.roomId,
      payload: {
        userId: meta.userId,
        displayName: meta.displayName,
        cameraOn: meta.cameraOn,
        micOn: meta.micOn,
        quality: meta.quality,
        participants: getRoomPresence(meta.roomId)
      },
      emittedAt: new Date().toISOString()
    });
  }

  function handleUpgrade(req, socket) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const accept = createAcceptKey(key);
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n'
    ].join('\r\n'));

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
          if (message.type === 'subscribe' && message.roomId && message.userId) {
            attachToRoom(socket, message.roomId, message.userId, message.displayName);
            sendToSocket(socket, { type: 'subscribed', roomId: message.roomId, participants: getRoomPresence(message.roomId) });
          }

          if (message.type === 'participant.state') {
            updateParticipantState(socket, {
              cameraOn: message.cameraOn,
              micOn: message.micOn
            });
          }

          if (message.type === 'quality.report') {
            updateParticipantState(socket, {
              quality: {
                rttMs: Number.isFinite(message.rttMs) ? message.rttMs : null,
                packetLossPct: Number.isFinite(message.packetLossPct) ? message.packetLossPct : null
              }
            });
          }

          if (message.type === 'signal.offer' || message.type === 'signal.answer' || message.type === 'signal.ice') {
            const meta = socketMeta.get(socket);
            if (!meta?.roomId || !message.targetUserId) continue;
            sendToUser(meta.roomId, message.targetUserId, {
              type: message.type,
              roomId: meta.roomId,
              fromUserId: meta.userId,
              payload: message.payload,
              emittedAt: new Date().toISOString()
            });
          }
        } catch {
          // ignore malformed frames
        }
      }
    });

    socket.on('close', () => {
      const meta = socketMeta.get(socket);
      if (!meta) return;
      if (roomClients.has(meta.roomId)) roomClients.get(meta.roomId).delete(socket);
      socketMeta.delete(socket);

      broadcastRoom(meta.roomId, {
        type: 'participant.left',
        roomId: meta.roomId,
        payload: { userId: meta.userId, participants: getRoomPresence(meta.roomId) },
        emittedAt: new Date().toISOString()
      });
    });
  }

  return {
    handleUpgrade,
    broadcastRoom,
    getRoomPresence
  };
}
