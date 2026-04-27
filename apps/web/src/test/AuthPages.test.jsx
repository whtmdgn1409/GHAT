import { describe, expect, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';

describe('Auth pages', () => {
  it('renders login page fields', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    expect(screen.getByText('로그인')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('renders signup page fields', () => {
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>
    );
    expect(screen.getByText('회원가입')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('홍길동')).toBeInTheDocument();
  });
});
