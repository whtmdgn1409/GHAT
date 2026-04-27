import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { saveAuthUser } from '../lib/auth';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (event) => {
    event.preventDefault();

    const user = {
      id: `usr_${crypto.randomUUID()}`,
      email,
      displayName: email.split('@')[0] || 'guest'
    };
    saveAuthUser(user);
    navigate('/video');
  };

  return (
    <AuthCard
      title="로그인"
      subtitle="GHAT 화상채팅과 협동 단어게임을 시작하세요."
      footer={
        <p>
          계정이 없나요? <Link to="/signup">회원가입</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8자 이상"
            minLength={8}
            required
          />
        </label>
        <button type="submit">로그인</button>
      </form>
    </AuthCard>
  );
}

export default LoginPage;
