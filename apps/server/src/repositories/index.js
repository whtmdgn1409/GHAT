import { randomUUID } from 'node:crypto';

export function createRepositories(db) {
  function state() {
    return db.getState();
  }

  const users = {
    create({ name, email, passwordHash, passwordSalt }) {
      const normalized = String(email).trim().toLowerCase();
      const existing = state().users.find((user) => user.email === normalized);
      if (existing) return { error: 'EMAIL_ALREADY_USED' };
      const user = {
        userId: `usr_${randomUUID()}`,
        name: name?.trim() || normalized.split('@')[0],
        email: normalized,
        passwordHash,
        passwordSalt,
        createdAt: Date.now()
      };
      state().users.push(user);
      db.persist();
      return { user };
    },
    findByEmail(email) {
      const normalized = String(email).trim().toLowerCase();
      return state().users.find((user) => user.email === normalized) || null;
    },
    findById(userId) {
      return state().users.find((user) => user.userId === userId) || null;
    }
  };

  const sessions = {
    create(refreshToken, userId) {
      state().sessions.push({ sessionId: `sess_${randomUUID()}`, refreshToken, userId, issuedAt: Date.now() });
      db.persist();
    },
    findUserByRefreshToken(refreshToken) {
      const session = state().sessions.find((item) => item.refreshToken === refreshToken);
      if (!session) return null;
      return users.findById(session.userId);
    }
  };

  const rooms = {
    create({ hostUserId, name, maxParticipants }) {
      const room = {
        roomId: `room_${randomUUID()}`,
        hostUserId,
        name: name || 'Untitled Room',
        maxParticipants: maxParticipants || 6,
        participants: hostUserId ? [hostUserId] : [],
        createdAt: Date.now()
      };
      state().rooms.push(room);
      db.persist();
      return room;
    },
    findById(roomId) {
      return state().rooms.find((room) => room.roomId === roomId) || null;
    },
    save(room) {
      const index = state().rooms.findIndex((item) => item.roomId === room.roomId);
      if (index >= 0) state().rooms[index] = room;
      db.persist();
      return room;
    }
  };

  const games = {
    create(game) {
      state().games.push(game);
      db.persist();
      return game;
    },
    findById(gameId) {
      return state().games.find((game) => game.gameId === gameId) || null;
    },
    listByRoom(roomId) {
      return state().games.filter((game) => game.roomId === roomId);
    },
    save(game) {
      const index = state().games.findIndex((item) => item.gameId === game.gameId);
      if (index >= 0) state().games[index] = game;
      db.persist();
      return game;
    }
  };

  const wordPacks = {
    findByFilters({ targetLang, difficulty }) {
      return state().wordPacks.filter((pack) => {
        if (targetLang && pack.targetLang !== targetLang) return false;
        if (difficulty && pack.difficulty !== difficulty) return false;
        return true;
      });
    },
    findById(id) {
      return state().wordPacks.find((pack) => pack.id === id) || null;
    }
  };

  const analytics = {
    enqueue(event) {
      const queueItem = {
        queueId: `q_${randomUUID()}`,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: Date.now(),
        createdAt: Date.now(),
        event
      };
      state().analyticsQueue.push(queueItem);
      db.persist();
      return queueItem;
    },
    pullPending(limit = 50) {
      const now = Date.now();
      return state().analyticsQueue
        .filter((item) => item.status !== 'done' && item.attempts < 3 && item.nextAttemptAt <= now)
        .slice(0, limit);
    },
    markDone(queueId) {
      const item = state().analyticsQueue.find((entry) => entry.queueId === queueId);
      if (!item) return;
      item.status = 'done';
      state().analyticsEvents.push({ ...item.event, processedAt: Date.now() });
      db.persist();
    },
    markRetry(queueId) {
      const item = state().analyticsQueue.find((entry) => entry.queueId === queueId);
      if (!item) return;
      item.attempts += 1;
      item.status = item.attempts >= 3 ? 'failed' : 'retry';
      item.nextAttemptAt = Date.now() + item.attempts * 1000;
      db.persist();
    },
    summaryByRoom(roomId) {
      const rows = state().analyticsEvents.filter((event) => event.params?.room_id === roomId);
      const byEvent = {};
      for (const row of rows) byEvent[row.eventName] = (byEvent[row.eventName] || 0) + 1;
      return { roomId, totalEvents: rows.length, byEvent };
    },
    mappingCheck(mappingTable) {
      const unknown = [];
      for (const event of state().analyticsEvents) {
        if (!mappingTable[event.eventName]) unknown.push(event.eventName);
      }
      return { unknownEventNames: [...new Set(unknown)] };
    }
  };

  return { users, sessions, rooms, games, wordPacks, analytics, db };
}
