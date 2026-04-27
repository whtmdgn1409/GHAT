import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DB_PATH = path.resolve(process.cwd(), '.data/ghat-db.json');

const defaultWordPacks = [
  { id: 'wp-en-easy-1', targetLang: 'en', difficulty: 'easy', topic: 'daily', words: ['apple', 'window', 'school', 'friend', 'market'] },
  { id: 'wp-en-medium-1', targetLang: 'en', difficulty: 'medium', topic: 'work', words: ['meeting', 'deadline', 'proposal', 'strategy', 'budget'] },
  { id: 'wp-es-easy-1', targetLang: 'es', difficulty: 'easy', topic: 'daily', words: ['hola', 'gracias', 'amigo', 'comida', 'escuela'] },
  { id: 'wp-ko-hard-1', targetLang: 'ko', difficulty: 'hard', topic: 'culture', words: ['정체성', '연결성', '협업성', '문해력', '추론력'] }
];

function initialState() {
  return {
    schemaVersion: 1,
    users: [],
    sessions: [],
    rooms: [],
    games: [],
    analyticsEvents: [],
    analyticsQueue: [],
    wordPacks: defaultWordPacks
  };
}

export function createDatabase(dbFilePath = process.env.GHAT_DB_FILE || DEFAULT_DB_PATH) {
  const filePath = dbFilePath;
  let state = initialState();

  function load() {
    if (!fs.existsSync(filePath)) {
      persist();
      return;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    state = raw ? JSON.parse(raw) : initialState();
  }

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  load();

  return {
    filePath,
    getState: () => state,
    persist,
    reset: () => {
      state = initialState();
      persist();
    }
  };
}
