import { randomUUID } from 'node:crypto';

const DIFFICULTY_POLICY = {
  easy: { roundDurationSec: 45, pointsCorrect: 10, hintRevealCount: 2 },
  medium: { roundDurationSec: 30, pointsCorrect: 15, hintRevealCount: 1 },
  hard: { roundDurationSec: 20, pointsCorrect: 20, hintRevealCount: 1 }
};

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectWords(wordPacks, { targetLang, difficulty, roundCount }) {
  const filtered = wordPacks.filter((pack) => pack.targetLang === targetLang && pack.difficulty === difficulty);
  if (filtered.length === 0) return { error: 'WORD_PACK_NOT_AVAILABLE' };

  const merged = filtered.flatMap((pack) => pack.words.map((word) => ({ word, wordPackId: pack.id })));
  const selected = shuffle(merged).slice(0, roundCount);
  if (selected.length === 0) return { error: 'WORD_PACK_NOT_AVAILABLE' };
  return { selected };
}

export function createGameEngineState({ roomId, targetLang, difficulty, roundCount, selectedWords }) {
  const policy = DIFFICULTY_POLICY[difficulty] || DIFFICULTY_POLICY.easy;
  const gameId = `game_${randomUUID()}`;
  const rounds = selectedWords.map((item, index) => ({
    roundNo: index + 1,
    wordPackId: item.wordPackId,
    answer: item.word,
    status: 'pending',
    attempts: [],
    hintsUsed: 0,
    startedAt: null,
    expiresAt: null,
    skipped: false,
    timedOut: false
  }));

  return {
    gameId,
    roomId,
    targetLang,
    difficulty,
    policy,
    roundCount,
    status: 'created',
    score: 0,
    currentRound: 1,
    rounds,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function getCurrentRound(game) {
  return game.rounds.find((round) => round.roundNo === game.currentRound) || null;
}

export function startGame(game, now = Date.now()) {
  game.status = 'started';
  const round = getCurrentRound(game);
  if (round && !round.startedAt) {
    round.startedAt = now;
    round.expiresAt = now + game.policy.roundDurationSec * 1000;
  }
  game.updatedAt = now;
  return game;
}

function advanceRound(game, now) {
  game.currentRound += 1;
  const nextRound = getCurrentRound(game);
  if (!nextRound) {
    game.status = 'finished';
    game.updatedAt = now;
    return;
  }

  nextRound.startedAt = now;
  nextRound.expiresAt = now + game.policy.roundDurationSec * 1000;
  game.updatedAt = now;
}

export function applyRoundTimeout(game, now = Date.now()) {
  if (game.status !== 'started') return { changed: false, reason: 'GAME_NOT_STARTED' };
  const round = getCurrentRound(game);
  if (!round) return { changed: false, reason: 'ROUND_NOT_FOUND' };
  if (!round.expiresAt || round.expiresAt > now || round.status !== 'pending') return { changed: false, reason: 'NOT_EXPIRED' };

  round.status = 'timeout';
  round.timedOut = true;
  advanceRound(game, now);
  return { changed: true, roundNo: round.roundNo, status: game.status };
}

export function judgeGuess(game, { userId, guess, now = Date.now() }) {
  const timeoutApplied = applyRoundTimeout(game, now);
  if (timeoutApplied.changed && game.status === 'finished') {
    return { error: 'GAME_NOT_ACTIVE', details: 'game finished by timeout' };
  }

  if (game.status !== 'started') return { error: 'GAME_NOT_ACTIVE' };

  const round = getCurrentRound(game);
  if (!round) return { error: 'ROUND_NOT_FOUND' };

  const normalized = String(guess).trim().toLowerCase();
  const isCorrect = normalized === round.answer.toLowerCase();
  round.attempts.push({ userId, guess: normalized, isCorrect, at: now });

  if (isCorrect && round.status === 'pending') {
    round.status = 'correct';
    game.score += game.policy.pointsCorrect;
    advanceRound(game, now);
  }

  game.updatedAt = now;
  return {
    correct: isCorrect,
    roundNo: round.roundNo,
    score: game.score,
    nextRound: game.currentRound,
    status: game.status
  };
}

export function revealHint(game, now = Date.now()) {
  const timeoutApplied = applyRoundTimeout(game, now);
  if (timeoutApplied.changed && game.status === 'finished') return { error: 'GAME_NOT_ACTIVE' };

  const round = getCurrentRound(game);
  if (!round || round.status !== 'pending') return { error: 'ROUND_NOT_FOUND' };
  if (round.hintsUsed >= game.policy.hintRevealCount) return { error: 'HINT_LIMIT_REACHED' };

  round.hintsUsed += 1;
  const answer = round.answer;
  const revealCount = Math.min(round.hintsUsed, Math.max(answer.length - 2, 1));
  const visible = answer.slice(0, revealCount);
  const hint = `${visible}${'*'.repeat(Math.max(answer.length - revealCount, 0))}`;

  return { roundNo: round.roundNo, hint, hintsUsed: round.hintsUsed };
}

export function skipCurrentRound(game, now = Date.now()) {
  if (game.status !== 'started') return { error: 'GAME_NOT_ACTIVE' };
  const round = getCurrentRound(game);
  if (!round || round.status !== 'pending') return { error: 'ROUND_NOT_FOUND' };

  round.status = 'skipped';
  round.skipped = true;
  advanceRound(game, now);
  return { roundNo: round.roundNo, status: game.status, nextRound: game.currentRound };
}
