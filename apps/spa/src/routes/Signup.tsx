import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { signup } from '../signupApi';

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await signup(email, password, name);
      localStorage.setItem('accessToken', res.accessToken);
      nav('/documents', { replace: true });
    } catch (e: any) {
      setError(e.message || '회원가입 실패');
    } finally { setBusy(false); }
  }

  return (
    <div>
      <Header />
      <main className="container">
        <section>
          <h2>회원가입</h2>
          <form onSubmit={onSubmit}>
            <label>이메일 <input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>비밀번호 <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} /></label>
            <label>이름 <input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <button disabled={busy} type="submit">가입</button>
          </form>
          {error && <div className="muted">{error}</div>}
          <div className="muted">이미 계정이 있으신가요? <Link to="/auth/login">로그인</Link></div>
        </section>
      </main>
    </div>
  );
}

