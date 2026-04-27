import { randomUUID } from 'node:crypto';
import { validateAnalyticsEvents } from './analytics.js';
import { getBearerToken, hashPassword, issueAuthTokens, verifyJWT, verifyPassword } from './auth.js';
import { createAnalyticsPipeline } from './analytics-pipeline.js';
import { createDatabase } from './db/database.js';
import { createGameEngineState, judgeGuess, revealHint, selectWords, skipCurrentRound, startGame } from './game-engine/rules.js';
import { createRepositories } from './repositories/index.js';

function json(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
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

function authUserFromRequest(repositories, req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const payload = verifyJWT(token);
  if (!payload || payload.scope !== 'access' || !payload.sub) return null;
  return repositories.users.findById(payload.sub);
}

function sanitizeUser(user) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function emitRoomEvent(realtimeHub, roomId, type, payload) {
  if (!realtimeHub || !roomId) return;
  realtimeHub.broadcastRoom(roomId, { type, roomId, payload, emittedAt: new Date().toISOString() });
}

export function createApp(options = {}) {
  const db = options.db ?? createDatabase();
  const repositories = options.repositories ?? createRepositories(db);
  const realtimeHub = options.realtimeHub ?? null;
  const analyticsPipeline = options.analyticsPipeline ?? createAnalyticsPipeline(repositories);

  return async function handler(req, res) {
    const requestId = `req_${randomUUID()}`;
    const method = req.method;
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-allow-methods': 'GET,POST,OPTIONS'
      });
      res.end();
      return;
    }

    if (method === 'GET' && pathname === '/health') {
      return ok(res, requestId, { status: 'ok', dbFile: db.filePath });
    }

    if (method === 'POST' && pathname === '/api/v1/auth/signup') {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
      if (!body.email || !body.password) return fail(res, requestId, 'INVALID_REQUEST', 'email and password are required', 400);
      if (String(body.password).length < 8) return fail(res, requestId, 'INVALID_REQUEST', 'password must be at least 8 chars', 400);

      const { salt, hash } = hashPassword(body.password);
      const created = repositories.users.create({ name: body.name, email: body.email, passwordHash: hash, passwordSalt: salt });
      if (created.error === 'EMAIL_ALREADY_USED') return fail(res, requestId, 'EMAIL_ALREADY_USED', 'email already exists', 409);

      const tokens = issueAuthTokens(created.user.userId);
      repositories.sessions.create(tokens.refreshToken, created.user.userId);
      return ok(res, requestId, { user: sanitizeUser(created.user), ...tokens }, 201);
    }

    if (method === 'POST' && pathname === '/api/v1/auth/login') {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
      const user = repositories.users.findByEmail(body.email);
      if (!user || !verifyPassword(body.password, user.passwordSalt, user.passwordHash)) {
        return fail(res, requestId, 'AUTH_INVALID', 'invalid email or password', 401);
      }
      const tokens = issueAuthTokens(user.userId);
      repositories.sessions.create(tokens.refreshToken, user.userId);
      return ok(res, requestId, { user: sanitizeUser(user), ...tokens });
    }

    if (method === 'POST' && pathname === '/api/v1/auth/refresh') {
      const body = await readBody(req);
      if (!body?.refreshToken) return fail(res, requestId, 'INVALID_REQUEST', 'refreshToken is required', 400);
      const payload = verifyJWT(body.refreshToken);
      const user = repositories.sessions.findUserByRefreshToken(body.refreshToken);
      if (!payload || payload.scope !== 'refresh' || !user) return fail(res, requestId, 'AUTH_INVALID', 'invalid refresh token', 401);
      const tokens = issueAuthTokens(user.userId);
      repositories.sessions.create(tokens.refreshToken, user.userId);
      return ok(res, requestId, { user: sanitizeUser(user), ...tokens });
    }

    const authUser = authUserFromRequest(repositories, req);
    if (pathname.startsWith('/api/v1/rooms') || pathname.startsWith('/api/v1/games') || pathname.startsWith('/api/v1/analytics')) {
      if (!authUser) return fail(res, requestId, 'AUTH_REQUIRED', 'valid bearer token is required', 401);
    }

    if (method === 'POST' && pathname === '/api/v1/rooms') {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
      const room = repositories.rooms.create({ ...body, hostUserId: authUser.userId });
      emitRoomEvent(realtimeHub, room.roomId, 'room.created', { room });
      return ok(res, requestId, room, 201);
    }

    const roomGetParams = matchPath(pathname, '/api/v1/rooms/:roomId');
    if (method === 'GET' && roomGetParams) {
      const room = repositories.rooms.findById(roomGetParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      return ok(res, requestId, room);
    }

    const joinParams = matchPath(pathname, '/api/v1/rooms/:roomId/join');
    if (method === 'POST' && joinParams) {
      const room = repositories.rooms.findById(joinParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      if (room.participants.length >= room.maxParticipants) return fail(res, requestId, 'ROOM_FULL', 'Room is full', 409);
      if (!room.participants.includes(authUser.userId)) room.participants.push(authUser.userId);
      repositories.rooms.save(room);
      emitRoomEvent(realtimeHub, room.roomId, 'room.joined', { userId: authUser.userId, participants: room.participants });
      return ok(res, requestId, room);
    }

    const leaveParams = matchPath(pathname, '/api/v1/rooms/:roomId/leave');
    if (method === 'POST' && leaveParams) {
      const room = repositories.rooms.findById(leaveParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      room.participants = room.participants.filter((userId) => userId !== authUser.userId);
      repositories.rooms.save(room);
      emitRoomEvent(realtimeHub, room.roomId, 'room.left', { userId: authUser.userId, participants: room.participants });
      return ok(res, requestId, room);
    }

    const roomStateParams = matchPath(pathname, '/api/v1/rooms/:roomId/state');
    if (method === 'GET' && roomStateParams) {
      const room = repositories.rooms.findById(roomStateParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);
      return ok(res, requestId, { room, games: repositories.games.listByRoom(room.roomId) });
    }

    const gameCreateParams = matchPath(pathname, '/api/v1/rooms/:roomId/games');
    if (method === 'POST' && gameCreateParams) {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);

      const room = repositories.rooms.findById(gameCreateParams.roomId);
      if (!room) return fail(res, requestId, 'ROOM_NOT_FOUND', 'Room not found', 404);

      const targetLang = body.targetLang || 'en';
      const difficulty = body.difficulty || 'easy';
      const roundCount = body.roundCount || 3;
      const selected = selectWords(repositories.wordPacks.findByFilters({ targetLang, difficulty }), {
        targetLang,
        difficulty,
        roundCount
      });
      if (selected.error) return fail(res, requestId, 'WORD_PACK_NOT_AVAILABLE', 'No matching word pack', 404);

      const game = createGameEngineState({
        roomId: room.roomId,
        targetLang,
        difficulty,
        roundCount,
        selectedWords: selected.selected
      });

      repositories.games.create(game);
      emitRoomEvent(realtimeHub, room.roomId, 'game.created', { game });
      return ok(res, requestId, game, 201);
    }

    const gameGetParams = matchPath(pathname, '/api/v1/games/:gameId');
    if (method === 'GET' && gameGetParams) {
      const game = repositories.games.findById(gameGetParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not found', 404);
      return ok(res, requestId, game);
    }

    const gameStartParams = matchPath(pathname, '/api/v1/games/:gameId/start');
    if (method === 'POST' && gameStartParams) {
      const game = repositories.games.findById(gameStartParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not found', 404);
      startGame(game);
      repositories.games.save(game);
      emitRoomEvent(realtimeHub, game.roomId, 'game.started', { gameId: game.gameId });
      return ok(res, requestId, game);
    }

    const guessParams = matchPath(pathname, '/api/v1/games/:gameId/guess');
    if (method === 'POST' && guessParams) {
      const body = await readBody(req);
      if (!body?.guess) return fail(res, requestId, 'INVALID_GUESS', 'guess is required', 400);
      const game = repositories.games.findById(guessParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not active', 404);

      const result = judgeGuess(game, { userId: authUser.userId, guess: body.guess });
      if (result.error) return fail(res, requestId, result.error, 'Guess could not be processed', 409, result.details || null);
      repositories.games.save(game);
      emitRoomEvent(realtimeHub, game.roomId, 'round.updated', result);
      return ok(res, requestId, result);
    }

    const hintParams = matchPath(pathname, '/api/v1/games/:gameId/hint');
    if (method === 'POST' && hintParams) {
      const game = repositories.games.findById(hintParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not active', 404);
      const result = revealHint(game);
      if (result.error) return fail(res, requestId, result.error, 'Hint could not be generated', 409);
      repositories.games.save(game);
      emitRoomEvent(realtimeHub, game.roomId, 'hint.revealed', result);
      return ok(res, requestId, result);
    }

    const skipParams = matchPath(pathname, '/api/v1/games/:gameId/skip');
    if (method === 'POST' && skipParams) {
      const game = repositories.games.findById(skipParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not active', 404);
      const result = skipCurrentRound(game);
      if (result.error) return fail(res, requestId, result.error, 'Round skip failed', 409);
      repositories.games.save(game);
      emitRoomEvent(realtimeHub, game.roomId, 'round.skipped', result);
      return ok(res, requestId, result);
    }

    const finishParams = matchPath(pathname, '/api/v1/games/:gameId/finish');
    if (method === 'POST' && finishParams) {
      const game = repositories.games.findById(finishParams.gameId);
      if (!game) return fail(res, requestId, 'GAME_NOT_ACTIVE', 'Game not found', 404);
      game.status = 'finished';
      repositories.games.save(game);
      emitRoomEvent(realtimeHub, game.roomId, 'game.finished', { gameId: game.gameId, score: game.score });
      return ok(res, requestId, game);
    }

    if (method === 'GET' && pathname === '/api/v1/word-packs') {
      const packs = repositories.wordPacks.findByFilters({
        targetLang: url.searchParams.get('targetLang'),
        difficulty: url.searchParams.get('difficulty')
      });
      return ok(res, requestId, packs);
    }

    const packParams = matchPath(pathname, '/api/v1/word-packs/:wordPackId');
    if (method === 'GET' && packParams) {
      const pack = repositories.wordPacks.findById(packParams.wordPackId);
      if (!pack) return fail(res, requestId, 'WORD_PACK_NOT_AVAILABLE', 'Word pack not found', 404);
      return ok(res, requestId, pack);
    }

    if (method === 'POST' && pathname === '/api/v1/analytics/events') {
      const body = await readBody(req);
      if (!body) return fail(res, requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
      const verdict = validateAnalyticsEvents(body.events);
      if (!verdict.ok) return fail(res, requestId, verdict.reason, 'Analytics validation failed', 400, verdict.details);

      const enriched = body.events.map((event) => ({ ...event, userId: authUser.userId, requestId, receivedAt: Date.now() }));
      analyticsPipeline.enqueueEvents(enriched);
      return ok(res, requestId, { accepted: enriched.length }, 202);
    }

    const summaryParams = matchPath(pathname, '/api/v1/analytics/summary/rooms/:roomId');
    if (method === 'GET' && summaryParams) {
      return ok(res, requestId, analyticsPipeline.getDashboardSummary(summaryParams.roomId));
    }

    if (method === 'GET' && pathname === '/api/v1/analytics/mapping/verify') {
      return ok(res, requestId, analyticsPipeline.verifyGa4Mapping());
    }

    return fail(res, requestId, 'NOT_FOUND', 'Route not found', 404);
  };
}
