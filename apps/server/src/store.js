import { randomUUID } from 'node:crypto';

const WORD_PACKS = [
  {
    id: 'wp-en-basic',
    targetLang: 'en',
    difficulty: 'easy',
    topic: 'daily',
    words: ['apple', 'window', 'school', 'friend', 'market']
  },
  {
    id: 'wp-es-basic',
    targetLang: 'es',
    difficulty: 'easy',
    topic: 'daily',
    words: ['hola', 'gracias', 'amigo', 'comida', 'escuela']
  },
  {
    id: 'wp-en-intermediate',
    targetLang: 'en',
    difficulty: 'medium',
    topic: 'work',
    words: ['meeting', 'deadline', 'proposal', 'strategy', 'budget']
  }
];

export function createStore() {
  return {
    users: new Map(),
    usersByEmail: new Map(),
    sessions: new Map(),
    rooms: new Map(),
    games: new Map(),
    analytics: [],
    wordPacks: WORD_PACKS
  };
}

export function createUser(store, { name, email, passwordHash, passwordSalt }) {
  const normalized = String(email).trim().toLowerCase();
  if (store.usersByEmail.has(normalized)) return { error: 'EMAIL_ALREADY_USED' };

  const userId = `usr_${randomUUID()}`;
  const user = {
    userId,
    name: name?.trim() || normalized.split('@')[0],
    email: normalized,
    passwordHash,
    passwordSalt,
    createdAt: Date.now()
  };

  store.users.set(userId, user);
  store.usersByEmail.set(normalized, userId);
  return { user };
}

export function getUserByEmail(store, email) {
  const userId = store.usersByEmail.get(String(email).trim().toLowerCase());
  if (!userId) return null;
  return store.users.get(userId) || null;
}

export function saveRefreshToken(store, refreshToken, userId) {
  store.sessions.set(refreshToken, { userId, issuedAt: Date.now() });
}

export function getUserByRefreshToken(store, refreshToken) {
  const session = store.sessions.get(refreshToken);
  if (!session) return null;
  return store.users.get(session.userId) || null;
}

export function createRoom(store, { hostUserId, name = 'Untitled Room', maxParticipants = 6 }) {
  const roomId = `room_${randomUUID()}`;
  const room = {
    roomId,
    name,
    hostUserId,
    maxParticipants,
    participants: hostUserId ? [hostUserId] : [],
    createdAt: Date.now()
  };
  store.rooms.set(roomId, room);
  return room;
}

export function createGame(store, roomId, payload) {
  const room = store.rooms.get(roomId);
  if (!room) return { error: 'ROOM_NOT_FOUND' };

  const { targetLang = 'en', difficulty = 'easy', roundCount = 3 } = payload;
  const wordPack = store.wordPacks.find(
    (pack) => pack.targetLang === targetLang && pack.difficulty === difficulty
  );
  if (!wordPack) return { error: 'WORD_PACK_NOT_AVAILABLE' };

  const gameId = `game_${randomUUID()}`;
  const rounds = wordPack.words.slice(0, roundCount).map((answer, i) => ({
    roundNo: i + 1,
    answer,
    status: 'pending',
    attempts: []
  }));

  const game = {
    gameId,
    roomId,
    wordPackId: wordPack.id,
    targetLang,
    difficulty,
    status: 'created',
    currentRound: 1,
    score: 0,
    rounds,
    createdAt: Date.now()
  };

  store.games.set(gameId, game);
  return { game };
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}
