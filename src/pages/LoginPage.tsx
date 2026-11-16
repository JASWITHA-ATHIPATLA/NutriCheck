import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, LogIn } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { HealthCondition } from '../types';
import {
  HEALTH_CONDITION_OPTIONS,
  parseCustomConditionsInput,
} from '../utils/healthProfileEngine';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const targetAfterLogin =
    ((location.state as { from?: string } | null)?.from) || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showHealthOptions, setShowHealthOptions] = useState(true);
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [hasOtherDisease, setHasOtherDisease] = useState(false);
  const [otherDiseaseInput, setOtherDiseaseInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleCondition(key: HealthCondition) {
    setConditions((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  function buildLoginOverrides() {
    const parsedOther = hasOtherDisease
      ? parseCustomConditionsInput(otherDiseaseInput)
      : [];
    const overrides: {
      conditions?: HealthCondition[];
      otherConditions?: string[];
    } = {};
    if (conditions.length > 0) {
      overrides.conditions = conditions;
    }
    if (parsedOther.length > 0) {
      overrides.otherConditions = parsedOther;
    }
    return overrides;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (hasOtherDisease && !otherDiseaseInput.trim()) {
      setError('Please enter your other disease name(s) or uncheck "Other disease".');
      return;
    }
    const res = login(email, password, buildLoginOverrides());
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
    const overrides = buildLoginOverrides();
    const firstTry = login(demoEmail, demoPass, overrides);
    if (!firstTry.ok) {
      register({
        fullName: 'Haribabu Demo',
        email: demoEmail,
        password: demoPass,
        age: 40,
        conditions:
          conditions.length > 0
            ? conditions
            : ['diabetes', 'kidney_disease', 'obesity'],
        otherConditions: overrides.otherConditions || [],
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
            Access your saved health conditions, custom diseases, and allergens to screen foods.
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

          <div className="login-disease-panel">
            <button
              type="button"
              className="login-disease-toggle"
              aria-expanded={showHealthOptions}
              onClick={() => setShowHealthOptions((prev) => !prev)}
            >
              <span>Health conditions &amp; other disease (optional)</span>
              {showHealthOptions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showHealthOptions && (
              <div className="login-disease-body">
                <p className="card-subtitle" style={{ fontSize: '12.5px', marginBottom: '8px' }}>
                  Optional: update or attach conditions on sign in. Leave unchecked to keep your saved settings.
                </p>
                <div className="condition-grid login-condition-grid">
                  {HEALTH_CONDITION_OPTIONS.map((opt) => {
                    const checked = conditions.includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`condition-option ${checked ? 'is-checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCondition(opt.key)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}

                  <label
                    className={`condition-option ${hasOtherDisease ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={hasOtherDisease}
                      onChange={(e) => setHasOtherDisease(e.target.checked)}
                    />
                    <span>Other disease</span>
                  </label>
                </div>

                {hasOtherDisease && (
                  <div className="field" style={{ marginTop: '10px' }}>
                    <label htmlFor="login-other-disease" className="field-label">
                      Specify other disease (comma-separated)
                    </label>
                    <input
                      id="login-other-disease"
                      type="text"
                      className="field-input"
                      placeholder="e.g., High Cholesterol, PCOS, Thyroid, Celiac, Gout"
                      value={otherDiseaseInput}
                      onChange={(e) => setOtherDiseaseInput(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
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
