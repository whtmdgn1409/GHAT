import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db/database.js';
import { createRepositories } from '../src/repositories/index.js';

function startServer() {
  const dbFile = path.join(os.tmpdir(), `ghat-test-${Date.now()}-${Math.random()}.json`);
  const db = createDatabase(dbFile);
  const repositories = createRepositories(db);
  const server = http.createServer(createApp({ db, repositories }));
  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}`, dbFile });
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
  const { server, baseUrl, dbFile } = await startServer();
  t.after(() => {
    server.close();
    fs.rmSync(dbFile, { force: true });
  });

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
});

test('game rules: timeout/skip endpoints exist and work', async (t) => {
  const { server, baseUrl, dbFile } = await startServer();
  t.after(() => {
    server.close();
    fs.rmSync(dbFile, { force: true });
  });

  const auth = await signup(baseUrl, 'roomer@example.com');
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${auth.accessToken}` };

  const roomRes = await fetch(`${baseUrl}/api/v1/rooms`, { method: 'POST', headers, body: JSON.stringify({ name: 'Study' }) });
  const room = (await roomRes.json()).data;
  await fetch(`${baseUrl}/api/v1/rooms/${room.roomId}/join`, { method: 'POST', headers });

  const gameRes = await fetch(`${baseUrl}/api/v1/rooms/${room.roomId}/games`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetLang: 'en', difficulty: 'easy', roundCount: 2 })
  });
  const game = (await gameRes.json()).data;

  await fetch(`${baseUrl}/api/v1/games/${game.gameId}/start`, { method: 'POST', headers });
  const skipRes = await fetch(`${baseUrl}/api/v1/games/${game.gameId}/skip`, { method: 'POST', headers });
  assert.equal(skipRes.status, 200);
});

test('analytics pipeline queue + mapping check', async (t) => {
  const { server, baseUrl, dbFile } = await startServer();
  t.after(() => {
    server.close();
    fs.rmSync(dbFile, { force: true });
  });

  const auth = await signup(baseUrl, 'analytics@example.com');
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${auth.accessToken}` };

  const roomRes = await fetch(`${baseUrl}/api/v1/rooms`, { method: 'POST', headers, body: JSON.stringify({ name: 'A' }) });
  const room = (await roomRes.json()).data;

  const ingest = await fetch(`${baseUrl}/api/v1/analytics/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      events: [{ eventName: 'game_panel_opened', eventTime: new Date().toISOString(), params: { room_id: room.roomId } }]
    })
  });
  assert.equal(ingest.status, 202);

  await new Promise((resolve) => setTimeout(resolve, 20));

  const summaryRes = await fetch(`${baseUrl}/api/v1/analytics/summary/rooms/${room.roomId}`, { headers });
  assert.equal(summaryRes.status, 200);

  const mappingRes = await fetch(`${baseUrl}/api/v1/analytics/mapping/verify`, { headers });
  assert.equal(mappingRes.status, 200);
});
