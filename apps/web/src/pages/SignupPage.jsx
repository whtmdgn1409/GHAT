import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { saveAuthUser } from '../lib/auth';

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (event) => {
    event.preventDefault();

    const user = {
      id: `usr_${crypto.randomUUID()}`,
      email,
      displayName: name
    };
    saveAuthUser(user);
    navigate('/video');
  };

  return (
    <AuthCard
      title="회원가입"
      subtitle="학습 언어를 선택하고 팀 플레이를 시작하세요."
      footer={
        <p>
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          이름
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="홍길동"
            required
          />
        </label>
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
        <button type="submit">회원가입</button>
      </form>
    </AuthCard>
  );
}

export default SignupPage;
