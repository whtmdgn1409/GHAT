import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createGame,
  createRealtimeSocket,
  createRoom,
  fetchParticipants,
  fetchRoomState,
  finishGame,
  guessWord,
  joinRoom,
  leaveRoom,
  requestHint,
  startGame
} from '../lib/api';
import { clearAuthSession, loadAuthSession } from '../lib/auth';
import { createRtcController } from '../lib/webrtc';

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
  const [participants, setParticipants] = useState([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteStreamsRef = useRef(new Map());
  const session = useMemo(() => loadAuthSession(), []);
  const user = session?.user;

  const rtcRef = useRef(
    createRtcController({
      onRemoteStream: (userId, stream) => {
        remoteStreamsRef.current.set(userId, stream);
      },
      onSignal: (message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message));
      }
    })
  );

  useEffect(() => {
    if (!session?.accessToken) navigate('/login');
  }, [navigate, session]);

  useEffect(() => {
    if (!room?.roomId || !user) return undefined;
    const ws = createRealtimeSocket();
    wsRef.current = ws;

    ws.onopen = async () => {
      ws.send(JSON.stringify({ type: 'subscribe', roomId: room.roomId, userId: user.userId, displayName: user.name }));
      try {
        const snapshot = await fetchRoomState(room.roomId);
        if (snapshot?.games?.[0]) setGame(snapshot.games[0]);
        const presence = await fetchParticipants(room.roomId);
        setParticipants(presence.participants || []);
      } catch {
        setToast('재접속 복구 상태를 불러오지 못했습니다.');
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'subscribed') {
          setParticipants(message.participants || []);
          const stream = await rtcRef.current.ensureLocalStream();
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }

        if (message.type === 'participant.joined' || message.type === 'participant.updated' || message.type === 'participant.left') {
          setParticipants(message.payload?.participants || []);
          if (message.type === 'participant.joined' && message.payload.userId !== user.userId) {
            rtcRef.current.createPeer(message.payload.userId, true);
          }
          if (message.type === 'participant.left') {
            rtcRef.current.removePeer(message.payload.userId);
          }
        }

        if (message.type === 'signal.offer') await rtcRef.current.onSignalOffer(message.fromUserId, message.payload);
        if (message.type === 'signal.answer') await rtcRef.current.onSignalAnswer(message.fromUserId, message.payload);
        if (message.type === 'signal.ice') await rtcRef.current.onSignalIce(message.fromUserId, message.payload);

        if (message.type === 'round.updated') {
          setGame((prev) => ({
            ...prev,
            score: message.payload.score,
            status: message.payload.status,
            currentRound: message.payload.nextRound
          }));
          setToast(message.payload.correct ? '정답입니다!' : '오답입니다. 다시 시도해보세요.');
        }
        if (message.type === 'hint.revealed') setHint(message.payload.hint);
      } catch {
        // noop
      }
    };

    const qualityTimer = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: 'quality.report',
          rttMs: Math.floor(20 + Math.random() * 80),
          packetLossPct: Number((Math.random() * 3).toFixed(2))
        })
      );
    }, 3000);

    ws.onclose = () => setToast('실시간 연결이 종료되었습니다.');

    return () => {
      clearInterval(qualityTimer);
      ws.close();
      rtcRef.current.closeAll();
    };
  }, [room?.roomId, user]);

  if (!user) return null;

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

  const toggleMedia = (type) => {
    const next = type === 'camera' ? !cameraOn : !micOn;
    rtcRef.current.setTrackEnabled(type === 'camera' ? 'video' : 'audio', next);

    if (type === 'camera') setCameraOn(next);
    if (type === 'mic') setMicOn(next);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'participant.state',
          cameraOn: type === 'camera' ? next : cameraOn,
          micOn: type === 'mic' ? next : micOn
        })
      );
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
          <button onClick={() => toggleMedia('camera')}>{cameraOn ? '카메라 OFF' : '카메라 ON'}</button>
          <button onClick={() => toggleMedia('mic')}>{micOn ? '마이크 OFF' : '마이크 ON'}</button>
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
          <article className="video-tile">
            <video ref={localVideoRef} autoPlay muted playsInline className="video-el" />
            <strong>{user.name} (You)</strong>
            <span>
              cam:{cameraOn ? 'on' : 'off'} · mic:{micOn ? 'on' : 'off'}
            </span>
          </article>

          {participants
            .filter((p) => p.userId !== user.userId)
            .map((participant) => (
              <article key={participant.userId} className="video-tile">
                <div className="avatar">{participant.displayName?.[0] || '?'}</div>
                <strong>{participant.displayName}</strong>
                <span>
                  cam:{participant.cameraOn ? 'on' : 'off'} · mic:{participant.micOn ? 'on' : 'off'}
                </span>
                <span>
                  RTT:{participant.quality?.rttMs ?? '-'}ms · Loss:{participant.quality?.packetLossPct ?? '-'}%
                </span>
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
