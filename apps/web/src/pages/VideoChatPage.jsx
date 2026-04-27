import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createGame,
  createRealtimeSocket,
  createRoom,
  fetchRoomState,
  finishGame,
  guessWord,
  joinRoom,
  leaveRoom,
  requestHint,
  startGame
} from '../lib/api';
import { clearAuthSession, loadAuthSession } from '../lib/auth';

function VideoChatPage() {
  const navigate = useNavigate();
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [guessInput, setGuessInput] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const wsRef = useRef(null);

  const session = useMemo(() => loadAuthSession(), []);
  const user = session?.user;

  useEffect(() => {
    if (!session?.accessToken) {
      navigate('/login');
    }
  }, [navigate, session]);

  useEffect(() => {
    if (!room?.roomId) return undefined;

    const ws = createRealtimeSocket();
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', roomId: room.roomId, userId: user.userId }));
      fetchRoomState(room.roomId)
        .then((snapshot) => {
          if (snapshot?.games?.[0]) setGame(snapshot.games[0]);
        })
        .catch(() => {
          setToast('재접속 복구 상태를 불러오지 못했습니다.');
        });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'round.updated') {
          setGame((prev) => ({ ...prev, score: message.payload.score, status: message.payload.status, currentRound: message.payload.nextRound }));
          setToast(message.payload.correct ? '정답입니다!' : '오답입니다. 다시 시도해보세요.');
        }
        if (message.type === 'hint.revealed') {
          setHint(message.payload.hint);
        }
      } catch {
        // noop
      }
    };

    ws.onclose = () => {
      setToast('실시간 연결이 종료되었습니다.');
    };

    return () => ws.close();
  }, [room?.roomId, user?.userId]);

  if (!user) return null;

  const participants = [
    { id: user.userId, name: `${user.name} (You)` },
    { id: 'demo1', name: 'Mina' },
    { id: 'demo2', name: 'Carlos' },
    { id: 'demo3', name: 'Yuki' }
  ];

  const onLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const beginSession = async () => {
    setLoading(true);
    setError('');
    setToast('');
    try {
      const createdRoom = await createRoom({ name: `${user.name}의 스터디룸`, maxParticipants: 6 });
      setRoom(createdRoom);
      await joinRoom(createdRoom.roomId);
      const createdGame = await createGame(createdRoom.roomId, { targetLang: 'en', difficulty: 'easy', roundCount: 5 });
      const started = await startGame(createdGame.gameId);
      setGame(started);
      setIsGameOpen(true);
      setToast('게임이 시작되었습니다!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onHint = async () => {
    if (!game?.gameId) return;
    setError('');
    try {
      const result = await requestHint(game.gameId);
      setHint(result.hint);
    } catch (err) {
      setError(err.message);
    }
  };

  const onGuess = async (event) => {
    event.preventDefault();
    if (!game?.gameId || !guessInput.trim()) return;
    setError('');

    try {
      const result = await guessWord(game.gameId, guessInput);
      setToast(result.correct ? '정답!' : '오답, 힌트를 확인해보세요.');
      setGuessInput('');
    } catch (err) {
      setError(err.message);
    }
  };

  const onFinishGame = async () => {
    if (!game?.gameId) return;
    try {
      const finished = await finishGame(game.gameId);
      setGame(finished);
      if (room?.roomId) await leaveRoom(room.roomId);
      setToast('게임을 종료했습니다.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="video-page">
      <header className="top-bar">
        <div>
          <h1>GHAT Video Room</h1>
          <p>협동 단어게임으로 함께 언어를 학습하세요.</p>
        </div>
        <div className="top-actions">
          <button disabled={loading} onClick={beginSession}>
            {loading ? '세션 준비중...' : '세션 시작'}
          </button>
          <button onClick={() => setIsGameOpen((prev) => !prev)}>{isGameOpen ? '게임 닫기' : '게임 열기'}</button>
          <button className="outline" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

      {error && <div className="toast error">{error}</div>}
      {toast && <div className="toast">{toast}</div>}

      <main className={`video-layout ${isGameOpen ? 'with-game' : ''}`}>
        <section className="video-grid">
          {participants.map((participant) => (
            <article key={participant.id} className="video-tile">
              <div className="avatar">{participant.name[0]}</div>
              <strong>{participant.name}</strong>
              <span>Camera Preview</span>
            </article>
          ))}
        </section>

        {isGameOpen && (
          <aside className="game-panel">
            <h2>협동 단어 맞추기</h2>
            <p className="meta">
              언어: {game?.targetLang || 'en'} · 난이도: {game?.difficulty || 'easy'} · 라운드: {game?.currentRound || 1}
            </p>
            <div className="word-box">_ _ _ _ _</div>
            <p className="hint">힌트: {hint || '아직 힌트가 없습니다.'}</p>
            <form className="guess-form" onSubmit={onGuess}>
              <input type="text" value={guessInput} onChange={(event) => setGuessInput(event.target.value)} placeholder="정답 단어 입력" />
              <button type="submit">제출</button>
            </form>
            <div className="panel-actions">
              <button className="outline" onClick={onHint}>
                힌트 요청
              </button>
              <button className="outline" onClick={onFinishGame}>
                게임 종료
              </button>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

export default VideoChatPage;
