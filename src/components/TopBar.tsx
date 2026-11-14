import { Leaf, ScanLine } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

export function TopBar() {
  const navigate = useNavigate();

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
            Amazon Connect
          </NavLink>
          <NavLink
            to="/models"
            className={({ isActive }) => `nav-tab ${isActive ? 'is-active' : ''}`}
          >
            Models &amp; Data
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
        </div>
      </div>
    </header>
  );
}
