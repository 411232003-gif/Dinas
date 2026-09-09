import { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { auth } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import './Auth.css';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(userCredential.user, { displayName: name.trim() });
        }
      }
      onLogin();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="login-wrapper">
        <div className={`flip-scene ${!isLogin ? 'flipped' : ''}`}>
          <div className="flip-card">
            {/* Front - Login */}
            <div className="glass-circle front">
              <form className="login-form" onSubmit={handleAuth}>
                <h1>Login</h1>
                <div className="subtitle">Sign in to your account</div>

                {error && <div className="error-message">{error}</div>}

                <div className="input-box">
                  <Mail className="icon" />
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-box">
                  <Lock className="icon" />
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="forgot">
                  <div className="remember" onClick={() => setRemember(!remember)}>
                    <div className={`switch ${remember ? 'on' : ''}`}></div>
                    Remember me
                  </div>
                  <a onClick={() => alert('Fitur lupa password belum tersedia')}>Forgot password?</a>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? 'Loading...' : 'Sign In'}
                </button>

                <button
                  type="button"
                  className="google-button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Lanjutkan dengan Google
                </button>

                <div className="signup-text">
                  Belum punya akun?{' '}
                  <button type="button" onClick={switchMode}>
                    Sign up
                  </button>
                </div>
              </form>
            </div>

            {/* Back - Sign Up */}
            <div className="glass-circle back">
              <form className="login-form" onSubmit={handleAuth}>
                <h1>Sign Up</h1>
                <div className="subtitle">Create your account</div>

                {error && <div className="error-message">{error}</div>}

                <div className="input-box">
                  <User className="icon" />
                  <input
                    type="text"
                    placeholder="Full name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>

                <div className="input-box">
                  <Mail className="icon" />
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-box">
                  <Lock className="icon" />
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? 'Loading...' : 'Create Account'}
                </button>

                <div className="signup-text">
                  Sudah punya akun?{' '}
                  <button type="button" onClick={switchMode}>
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
