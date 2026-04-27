import { randomUUID } from 'node:crypto';
import {
  createStore,
  issueGuestUser,
  createRoom,
  createGame
} from './store.js';
import { validateAnalyticsEvents } from './analytics.js';

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function ok(res, requestId, data, status = 200) {
  return json(res, status, {
    success: true,
    data,
    meta: { requestId, timestamp: new Date().toISOString() },
    error: null
  });
}

function fail(res, requestId, code, message, status = 400, details = null) {
  return json(res, status, {
    success: false,
    data: null,
    meta: { requestId, timestamp: new Date().toISOString() },
    error: { code, message, details }
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function matchPath(pathname, pattern) {
  const p1 = pathname.split('/').filter(Boolean);
  const p2 = pattern.split('/').filter(Boolean);
  if (p1.length !== p2.length) return null;
  const params = {};
  for (let i = 0; i < p2.length; i += 1) {
    if (p2[i].startsWith(':')) {
      params[p2[i].slice(1)] = p1[i];
      continue;
    }
    if (p1[i] !== p2[i]) return null;
  }
  return params;
}

export function createApp(customStore) {
  const store = customStore ?? createStore();

  return async function handler(req, res) {
    const requestId = `req_${randomUUID()}`;
    const method = req.method;
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (method === 'GET' && pathname === '/health') {
      return ok(res, requestId, { status: 'ok' });
    }

    if (method === 'POST' && pathname === '/api/v1/auth/guest') {
      return ok(res, requestId, issueGuestUser(store));
    }

    if (method === 'POST' && pathname === '/api/v1/rooms') {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
      const room = createRoom(store, body);
      return ok(res, requestId, room, 201);
    }

    const roomGetParams = matchPath(pathname, '/api/v1/rooms/:roomId');
    if (method === 'GET' && roomGetParams) {
      const room = store.rooms.get(roomGetParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      return ok(res, requestId, room);
    }

    const joinParams = matchPath(pathname, '/api/v1/rooms/:roomId/join');
    if (method === 'POST' && joinParams) {
      const room = store.rooms.get(joinParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      const body = await readBody(req);
      if (!body?.userId) return fail(res, requestId, 'INVALID_REQUEST', 'userId is required', 400);
      if (room.participants.length >= room.maxParticipants) {
        return fail(res, requestId, 'ROOM_FULL', 'Room is full', 409);
      }
      if (!room.participants.includes(body.userId)) room.participants.push(body.userId);
      return ok(res, requestId, room);
    }

    const leaveParams = matchPath(pathname, '/api/v1/rooms/:roomId/leave');
    if (method === 'POST' && leaveParams) {
      const room = store.rooms.get(leaveParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      const body = await readBody(req);
      if (!body?.userId) return fail(res, requestId, 'INVALID_REQUEST', 'userId is required', 400);
      room.participants = room.participants.filter((userId) => userId !== body.userId);
      return ok(res, requestId, room);
    }

    const gameCreateParams = matchPath(pathname, '/api/v1/rooms/:roomId/games');
    if (method === 'POST' && gameCreateParams) {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
      const result = createGame(store, gameCreateParams.roomId, body);
      if (result.error === 'ROOM_NOT_FOUND') return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      if (result.error === 'WORD_PACK_NOT_AVAILABLE') {
        return fail(res, requestId, 'WORD_PACK_NOT_AVAILABLE', 'No matching word pack', 404);
      }
      return ok(res, requestId, result.game, 201);
    }

    const gameGetParams = matchPath(pathname, '/api/v1/games/:gameId');
    if (method === 'GET' && gameGetParams) {
      const game = store.games.get(gameGetParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not found', 404);
      return ok(res, requestId, game);
    }

    const gameStartParams = matchPath(pathname, '/api/v1/games/:gameId/start');
    if (method === 'POST' && gameStartParams) {
      const game = store.games.get(gameStartParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not found', 404);
      game.status = 'started';
      return ok(res, requestId, game);
    }

    const guessParams = matchPath(pathname, '/api/v1/games/:gameId/guess');
    if (method === 'POST' && guessParams) {
      const game = store.games.get(guessParams.gameId);
      if (!game || game.status === 'finished') return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not active', 404);
      const body = await readBody(req);
      if (!body?.guess || !body?.userId) {
        return fail(res, requestId, 'INVALID_GUESS', 'guess and userId are required', 400);
      }

      const round = game.rounds.find((r) => r.roundNo === game.currentRound);
      if (!round) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'No current round', 409);

      const normalized = String(body.guess).trim().toLowerCase();
      const correct = normalized === round.answer.toLowerCase();
      round.attempts.push({ userId: body.userId, guess: normalized, correct, at: Date.now() });

      if (correct && round.status !== 'correct') {
        round.status = 'correct';
        game.score += 10;
        game.currentRound += 1;
        if (game.currentRound > game.rounds.length) game.status = 'finished';
      }

      return ok(res, requestId, {
        gameId: game.gameId,
        roundNo: round.roundNo,
        correct,
        nextRound: game.currentRound,
        score: game.score,
        status: game.status
      });
    }

    const hintParams = matchPath(pathname, '/api/v1/games/:gameId/hint');
    if (method === 'POST' && hintParams) {
      const game = store.games.get(hintParams.gameId);
      if (!game || game.status === 'finished') return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not active', 404);
      const round = game.rounds.find((r) => r.roundNo === game.currentRound);
      if (!round) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'No current round', 409);
      const hint = `${round.answer[0]}${'*'.repeat(Math.max(round.answer.length - 2, 0))}${round.answer.slice(-1)}`;
      return ok(res, requestId, { roundNo: round.roundNo, hint });
    }

    const finishParams = matchPath(pathname, '/api/v1/games/:gameId/finish');
    if (method === 'POST' && finishParams) {
      const game = store.games.get(finishParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not found', 404);
      game.status = 'finished';
      return ok(res, requestId, game);
    }

    if (method === 'GET' && pathname === '/api/v1/word-packs') {
      const targetLang = url.searchParams.get('targetLang');
      const difficulty = url.searchParams.get('difficulty');
      const packs = store.wordPacks.filter((pack) => {
        if (targetLang && pack.targetLang !== targetLang) return false;
        if (difficulty && pack.difficulty !== difficulty) return false;
        return true;
      });
      return ok(res, requestId, packs);
    }

    const packParams = matchPath(pathname, '/api/v1/word-packs/:wordPackId');
    if (method === 'GET' && packParams) {
      const pack = store.wordPacks.find((p) => p.id === packParams.wordPackId);
      if (!pack) return fail(res, requestId, 'WORD_PACK_NOT_AVAILABLE', 'Word pack not found', 404);
      return ok(res, requestId, pack);
    }

    if (method === 'POST' && pathname === '/api/v1/analytics/events') {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
      const verdict = validateAnalyticsEvents(body.events);
      if (!verdict.ok) {
        return fail(res, requestId, verdict.reason, 'Analytics validation failed', 400, verdict.details);
      }
      const stored = body.events.map((event) => ({ ...event, requestId, receivedAt: Date.now() }));
      store.analytics.push(...stored);
      return ok(res, requestId, { accepted: stored.length }, 202);
    }

    const summaryParams = matchPath(pathname, '/api/v1/analytics/summary/rooms/:roomId');
    if (method === 'GET' && summaryParams) {
      const roomEvents = store.analytics.filter((event) => event.params?.room_id === summaryParams.roomId);
      const byEvent = {};
      for (const event of roomEvents) {
        byEvent[event.eventName] = (byEvent[event.eventName] || 0) + 1;
      }
      return ok(res, requestId, {
        roomId: summaryParams.roomId,
        totalEvents: roomEvents.length,
        byEvent
      });
    }

    return fail(res, requestId, 'NOT_FOUND', 'Route not found', 404);
  };
}
