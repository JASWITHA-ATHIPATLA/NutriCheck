import { useEffect, useState } from 'react';
import { Leaf, LogOut, Menu, UserCircle2, X } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isStoreConnectRoute =
    location.pathname === '/amazon' || location.pathname === '/connect';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link
          to={currentUser ? '/dashboard' : '/'}
          className="brand"
          aria-label="NutriCheck Home"
        >
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={17} strokeWidth={2.4} />
          </span>
          <span className="brand-title">NutriCheck</span>
        </Link>

        {currentUser ? (
          <>
            <nav className="nav-links" aria-label="Primary navigation">
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/prescriptions"
                className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
              >
                Prescriptions
              </NavLink>
              <NavLink
                to="/tracker"
                className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
              >
                Daily Tracker
              </NavLink>
              <NavLink
                to="/limits"
                className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
              >
                Daily Limits
              </NavLink>
              <NavLink
                to="/scan"
                className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
              >
                Scan Packet
              </NavLink>
              <NavLink
                to="/amazon"
                className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
              >
                Store Connect
              </NavLink>
            </nav>

            <div className="topbar-actions">
              {isStoreConnectRoute && (
                <span className="topbar-connected-pill">Store connected</span>
              )}
              <Link
                to="/profile"
                className={`topbar-profile-icon-btn ${
                  location.pathname === '/profile' ? 'is-active' : ''
                }`}
                title={`Profile: ${currentUser.fullName}`}
                aria-label="Health Profile"
              >
                <UserCircle2 size={20} />
              </Link>
              <button
                type="button"
                className="topbar-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>

              <button
                type="button"
                className="mobile-menu-btn"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-drawer"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </>
        ) : (
          <div className="topbar-actions">
            <div className="topbar-guest-links">
              <NavLink
                to="/login"
                className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
              >
                Login
              </NavLink>
              <button
                type="button"
                className="topbar-cta"
                onClick={() => navigate('/register')}
              >
                Register
              </button>
            </div>

            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        )}
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav-drawer"
          className="mobile-nav-drawer"
          aria-label="Mobile navigation"
        >
          {currentUser ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/prescriptions"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Prescription Alerts
              </NavLink>
              <NavLink
                to="/tracker"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Daily Food &amp; Nutrition Tracker
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Health Profile ({currentUser.fullName})
              </NavLink>
              <NavLink
                to="/limits"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Daily Limits &amp; Cart Table
              </NavLink>
              <NavLink
                to="/add-product"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Add Product
              </NavLink>
              <NavLink
                to="/scan"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Scan Packet
              </NavLink>
              <NavLink
                to="/amazon"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Store Connect
              </NavLink>
              <button
                type="button"
                className="mobile-nav-cta"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Home
              </NavLink>
              <NavLink
                to="/login"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                Login
              </NavLink>
              <button
                type="button"
                className="mobile-nav-cta"
                onClick={() => navigate('/register')}
              >
                Create Account
              </button>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
