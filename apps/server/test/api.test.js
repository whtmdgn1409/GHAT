import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

function startServer() {
  const server = http.createServer(createApp());
  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

test('guest -> room -> game lifecycle works', async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const guestRes = await fetch(`${baseUrl}/api/v1/auth/guest`, { method: 'POST' });
  assert.equal(guestRes.status, 200);
  const guestBody = await guestRes.json();
  const userId = guestBody.data.userId;

  const roomRes = await fetch(`${baseUrl}/api/v1/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostUserId: userId, name: 'Study Room', maxParticipants: 4 })
  });
  assert.equal(roomRes.status, 201);
  const roomBody = await roomRes.json();
  const roomId = roomBody.data.roomId;

  const gameRes = await fetch(`${baseUrl}/api/v1/rooms/${roomId}/games`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targetLang: 'en', difficulty: 'easy', roundCount: 1 })
  });
  assert.equal(gameRes.status, 201);
  const gameBody = await gameRes.json();
  const gameId = gameBody.data.gameId;

  const startRes = await fetch(`${baseUrl}/api/v1/games/${gameId}/start`, { method: 'POST' });
  assert.equal(startRes.status, 200);

  const hintRes = await fetch(`${baseUrl}/api/v1/games/${gameId}/hint`, { method: 'POST' });
  assert.equal(hintRes.status, 200);

  const guessRes = await fetch(`${baseUrl}/api/v1/games/${gameId}/guess`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, guess: 'apple' })
  });
  assert.equal(guessRes.status, 200);
  const guessBody = await guessRes.json();
  assert.equal(guessBody.data.correct, true);
});

test('analytics validation blocks pii', async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/api/v1/analytics/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          eventName: 'game_panel_opened',
          eventTime: new Date().toISOString(),
          params: { email: 'test@example.com' }
        }
      ]
    })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'ANALYTICS_EVENT_INVALID');
});
