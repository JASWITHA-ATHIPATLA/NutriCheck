import { useEffect, useState } from 'react';
import { Leaf, Menu, ScanLine, X } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="NutriCheck Home">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={17} strokeWidth={2.4} />
          </span>
          <span className="brand-title">NutriCheck</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/scan"
            className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
          >
            Scan Packet
          </NavLink>
          <NavLink
            to="/analyzer"
            className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
          >
            Food Analyzer
          </NavLink>
          <NavLink
            to="/amazon"
            className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
          >
            Store Connect
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
          >
            About
          </NavLink>
        </nav>

        <div className="topbar-actions">
          <button
            type="button"
            className="topbar-cta"
            onClick={() => navigate('/scan')}
          >
            <ScanLine size={15} />
            <span>Scan Packet</span>
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
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav-drawer"
          className="mobile-nav-drawer"
          aria-label="Mobile navigation"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/scan"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Scan Packet
          </NavLink>
          <NavLink
            to="/analyzer"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Food Analyzer
          </NavLink>
          <NavLink
            to="/amazon"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
          >
            Store Connect
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
          >
            About
          </NavLink>
          <button
            type="button"
            className="mobile-nav-cta"
            onClick={() => navigate('/scan')}
          >
            <ScanLine size={16} />
            <span>Scan Food Packet</span>
          </button>
        </nav>
      )}
    </header>
  );
}
