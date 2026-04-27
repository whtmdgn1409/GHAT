import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { signup } from '../lib/api';
import { saveAuthSession } from '../lib/auth';

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signup({ name, email, password });
      saveAuthSession(result);
      navigate('/video');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? '가입 중...' : '회원가입'}
        </button>
      </form>
    </AuthCard>
  );
}

export default SignupPage;
