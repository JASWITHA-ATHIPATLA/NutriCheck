import React, { useState } from 'react';
import { AlertCircle, LogIn } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const targetAfterLogin =
    ((location.state as { from?: string } | null)?.from) || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = login(email, password);
    if (!res.ok) {
      setError(res.error || 'Sign in failed.');
      return;
    }
    navigate(targetAfterLogin, { replace: true });
  }

  function handleQuickDemoLogin() {
    setError(null);
    const demoEmail = 'demo@nutricheck.app';
    const demoPass = 'demo1234';
    const firstTry = login(demoEmail, demoPass);
    if (!firstTry.ok) {
      register({
        fullName: 'Haribabu Demo',
        email: demoEmail,
        password: demoPass,
        age: 40,
        conditions: ['diabetes', 'kidney_disease', 'obesity'],
        allergies: ['milk'],
        dietaryNotes: 'Watch added sugars and excess sodium.',
      });
    }
    navigate(targetAfterLogin, { replace: true });
  }

  return (
    <div className="page-shell auth-shell">
      <div className="card auth-card auth-card-narrow">
        <div className="auth-header">
          <h1 className="page-title">Sign in to NutriCheck</h1>
          <p className="page-subtitle">
            Access your saved health conditions and allergens to screen packaged foods.
          </p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email" className="field-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="field-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-password" className="field-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="field-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn-primary auth-submit-btn">
            <LogIn size={16} />
            <span>Sign in</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleQuickDemoLogin}
          >
            Try Sample Profile (Diabetes, Kidney Care &amp; Milk Allergy)
          </button>
        </form>

        <div className="auth-footer-note">
          New to NutriCheck?{' '}
          <Link to="/register" className="text-action-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
