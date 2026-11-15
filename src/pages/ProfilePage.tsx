import React, { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { HealthCondition } from '../types';
import {
  HEALTH_CONDITION_OPTIONS,
  getAgeGroupLabel,
  parseAllergiesInput,
} from '../utils/healthProfileEngine';

export function ProfilePage() {
  const { currentUser, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [age, setAge] = useState(currentUser ? String(currentUser.age) : '');
  const [conditions, setConditions] = useState<HealthCondition[]>(
    currentUser?.conditions || []
  );
  const [allergiesInput, setAllergiesInput] = useState(
    currentUser?.allergies.join(', ') || ''
  );
  const [dietaryNotes, setDietaryNotes] = useState(currentUser?.dietaryNotes || '');
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setAge(String(currentUser.age));
      setConditions(currentUser.conditions);
      setAllergiesInput(currentUser.allergies.join(', '));
      setDietaryNotes(currentUser.dietaryNotes);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="page-shell auth-shell">
        <div className="card empty-state auth-card-narrow">
          <div className="empty-icon">
            <UserCheck size={22} />
          </div>
          <h1 className="empty-title">No Health Profile Signed In</h1>
          <p className="empty-desc">
            Create an account or sign in so NutriCheck can personalize food verdicts
            for your age, medical conditions, and allergies.
          </p>
          <div className="nc-hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="nc-btn-primary" style={{ textDecoration: 'none' }}>
              Create account
            </Link>
            <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function toggleCondition(key: HealthCondition) {
    setSavedBanner(false);
    setConditions((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    const numericAge = Number(age);
    updateProfile({
      fullName: fullName.trim() || currentUser.fullName,
      age: Number.isFinite(numericAge) && numericAge > 0 ? numericAge : currentUser.age,
      conditions,
      allergies: parseAllergiesInput(allergiesInput),
      dietaryNotes,
    });
    setSavedBanner(true);
  }

  return (
    <div className="page-shell auth-shell">
      <div className="card auth-card">
        <div className="card-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '24px' }}>
              Health profile
            </h1>
            <p className="card-subtitle">
              Update these details to personalize product checks ({getAgeGroupLabel(Number(age) || currentUser.age)} profile).
            </p>
          </div>

          <div className="profile-header-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {savedBanner && (
          <div className="amazon-live-banner level-success" style={{ marginBottom: '18px' }} role="status">
            <div className="cart-alert-body">
              <CheckCircle2 size={18} />
              <div>
                <div className="cart-alert-title">Profile updated</div>
                <p className="cart-alert-msg">
                  All products in your Food Dashboard and packet scans now reflect your updated health profile.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={() => navigate('/dashboard')}
            >
              View Dashboard
            </button>
          </div>
        )}

        <form className="form-stack" onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="prof-name" className="field-label">
              Name
            </label>
            <input
              id="prof-name"
              type="text"
              className="field-input"
              value={fullName}
              onChange={(e) => {
                setSavedBanner(false);
                setFullName(e.target.value);
              }}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="prof-age" className="field-label">
              Age
            </label>
            <input
              id="prof-age"
              type="number"
              min={1}
              max={120}
              className="field-input is-numeric"
              value={age}
              onChange={(e) => {
                setSavedBanner(false);
                setAge(e.target.value);
              }}
              required
            />
          </div>

          <fieldset className="condition-fieldset">
            <legend className="field-label">Health conditions</legend>
            <div className="condition-grid">
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
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="prof-allergies" className="field-label">
              Food allergies (comma separated)
            </label>
            <input
              id="prof-allergies"
              type="text"
              className="field-input"
              placeholder="e.g., milk, peanuts, wheat"
              value={allergiesInput}
              onChange={(e) => {
                setSavedBanner(false);
                setAllergiesInput(e.target.value);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="prof-notes" className="field-label">
              Other dietary notes
            </label>
            <textarea
              id="prof-notes"
              className="field-input field-textarea"
              value={dietaryNotes}
              onChange={(e) => {
                setSavedBanner(false);
                setDietaryNotes(e.target.value);
              }}
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn">
            Save profile
          </button>
        </form>
      </div>
    </div>
  );
}
