import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthUser, loadAuthUser } from '../lib/auth';

function VideoChatPage() {
  const navigate = useNavigate();
  const [isGameOpen, setIsGameOpen] = useState(false);

  const user = useMemo(() => loadAuthUser(), []);

  if (!user) {
    navigate('/login');
    return null;
  }

  const participants = [
    { id: user.id, name: `${user.displayName} (You)` },
    { id: 'demo1', name: 'Mina' },
    { id: 'demo2', name: 'Carlos' },
    { id: 'demo3', name: 'Yuki' }
  ];

  const onLogout = () => {
    clearAuthUser();
    navigate('/login');
  };

  return (
    <div className="video-page">
      <header className="top-bar">
        <div>
          <h1>GHAT Video Room</h1>
          <p>협동 단어게임으로 함께 언어를 학습하세요.</p>
        </div>
        <div className="top-actions">
          <button onClick={() => setIsGameOpen((prev) => !prev)}>
            {isGameOpen ? '게임 닫기' : '게임 열기'}
          </button>
          <button className="outline" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

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
            <p className="meta">언어: English · 난이도: Easy · 라운드: 1 / 5</p>
            <div className="word-box">_ _ _ _ _</div>
            <p className="hint">힌트: 과일이며 빨간색일 수 있어요.</p>
            <form className="guess-form" onSubmit={(event) => event.preventDefault()}>
              <input type="text" placeholder="정답 단어 입력" />
              <button type="submit">제출</button>
            </form>
          </aside>
        )}
      </main>
    </div>
  );
}

export default VideoChatPage;
