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

async function signup(baseUrl, email = 'tester@example.com') {
  const res = await fetch(`${baseUrl}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Tester', email, password: 'password1234' })
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  return body.data;
}

test('signup/login/refresh lifecycle works', async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const created = await signup(baseUrl, 'member@example.com');
  assert.ok(created.accessToken);

  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.com', password: 'password1234' })
  });
  assert.equal(loginRes.status, 200);
  const loginBody = await loginRes.json();
  assert.ok(loginBody.data.accessToken);

  const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: loginBody.data.refreshToken })
  });
  assert.equal(refreshRes.status, 200);
  const refreshBody = await refreshRes.json();
  assert.ok(refreshBody.data.accessToken);
});

test('authorized room/game lifecycle works', async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const auth = await signup(baseUrl, 'roomer@example.com');
  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${auth.accessToken}`
  };

  const roomRes = await fetch(`${baseUrl}/api/v1/rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Study Room', maxParticipants: 4 })
  });
  assert.equal(roomRes.status, 201);
  const roomBody = await roomRes.json();
  const roomId = roomBody.data.roomId;

  const joinRes = await fetch(`${baseUrl}/api/v1/rooms/${roomId}/join`, { method: 'POST', headers });
  assert.equal(joinRes.status, 200);

  const gameRes = await fetch(`${baseUrl}/api/v1/rooms/${roomId}/games`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetLang: 'en', difficulty: 'easy', roundCount: 1 })
  });
  assert.equal(gameRes.status, 201);
  const gameBody = await gameRes.json();
  const gameId = gameBody.data.gameId;

  const startRes = await fetch(`${baseUrl}/api/v1/games/${gameId}/start`, { method: 'POST', headers });
  assert.equal(startRes.status, 200);

  const guessRes = await fetch(`${baseUrl}/api/v1/games/${gameId}/guess`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ guess: 'apple' })
  });
  assert.equal(guessRes.status, 200);
  const guessBody = await guessRes.json();
  assert.equal(guessBody.data.correct, true);
});

test('analytics validation blocks pii', async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const auth = await signup(baseUrl, 'analytics@example.com');
  const res = await fetch(`${baseUrl}/api/v1/analytics/events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${auth.accessToken}`
    },
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
