import { AlertTriangle, Search, User } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-shell home-shell">
      <section className="home-hero-card" aria-label="NutriCheck Overview">
        <div className="home-hero-copy">
          <p className="home-hero-kicker">PERSONALIZED FOOD CHECKER</p>
          <h1 className="home-hero-title">
            Understand what&apos;s inside your food.
          </h1>
          <p className="home-hero-desc">
            Check packaged food against your saved health profile and see a LOW,
            MODERATE or HIGH risk screening result with clear reasons
          </p>

          <div className="home-hero-actions">
            <button
              type="button"
              className="nc-btn-primary"
              onClick={() => navigate('/register')}
            >
              Create account
            </button>

            <button
              type="button"
              className="nc-btn-secondary-hero"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-hero-oval">
            <svg
              viewBox="0 0 240 160"
              className="home-food-svg"
              role="presentation"
            >
              {/* Top Center: Avocado */}
              <g transform="translate(98, 12)">
                <path
                  d="M22 4C14 4 8 15 6 26C4 37 11 48 22 48C33 48 40 37 38 26C36 15 30 4 22 4Z"
                  fill="#2f6f3e"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
                <path
                  d="M22 9C16 9 11.5 17 10 26C8.5 34.5 14 43 22 43C30 43 35.5 34.5 34 26C32.5 17 28 9 22 9Z"
                  fill="#a3d977"
                />
                <circle
                  cx="22"
                  cy="31"
                  r="7.5"
                  fill="#6b4423"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <circle cx="20" cy="29" r="2" fill="#8b5e34" />
              </g>

              {/* Bottom Left: Red Apple */}
              <g transform="translate(26, 78)">
                <path
                  d="M24 14C17 11 9 15 8 25C7 36 14 48 21 48C23.5 48 25 46.5 27 46.5C29 46.5 30.5 48 33 48C40 48 47 36 46 25C45 15 37 11 30 14C28 15 26 15 24 14Z"
                  fill="#dc2626"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
                <path
                  d="M27 14C27 9 29 5 32 3"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M28 8C33 4 38 5 39 9C35 12 31 11 28 8Z"
                  fill="#22c55e"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <path
                  d="M15 22C14 25 14 29 15.5 32"
                  fill="none"
                  stroke="#fca5a5"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>

              {/* Bottom Center: Green Broccoli */}
              <g transform="translate(96, 80)">
                <path
                  d="M20 28L18 46H30L28 28Z"
                  fill="#a3d977"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 28C8 28 5 22 8 16C9 10 16 7 22 10C26 6 35 7 38 14C43 17 42 26 35 28Z"
                  fill="#16a34a"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="17" cy="18" r="2.2" fill="#4ade80" />
                <circle cx="29" cy="16" r="2.5" fill="#4ade80" />
              </g>

              {/* Bottom Right: Sliced Bread */}
              <g transform="translate(164, 80)">
                <path
                  d="M12 10C6 10 3 16 6 22L8 44C8 46 10 48 12 48H36C38 48 40 46 40 44L42 22C45 16 42 10 36 10C31 7 17 7 12 10Z"
                  fill="#eab308"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 14C10 14 8 18 10 22L12 43H36L38 22C40 18 38 14 34 14C29 12 19 12 14 14Z"
                  fill="#fef08a"
                />
              </g>
            </svg>
          </div>
        </div>
      </section>

      <section className="home-features-strip" aria-label="Key capabilities">
        <div className="home-pillars-grid">
          <div className="home-pillar-card">
            <div className="home-pillar-head">
              <span className="home-pillar-icon" aria-hidden="true">
                <User size={16} />
              </span>
              <h3>Personal profile</h3>
            </div>
            <p>
              Set age group, health conditions and allergies
            </p>
          </div>

          <div className="home-pillar-card">
            <div className="home-pillar-head">
              <span className="home-pillar-icon" aria-hidden="true">
                <Search size={16} />
              </span>
              <h3>Product checker</h3>
            </div>
            <p>
              Search a sample catalogue or add a packaged food label
            </p>
          </div>

          <div className="home-pillar-card">
            <div className="home-pillar-head">
              <span className="home-pillar-icon is-warn" aria-hidden="true">
                <AlertTriangle size={16} />
              </span>
              <h3>Clear explanations</h3>
            </div>
            <p>
              See which nutrition values triggered a caution
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
