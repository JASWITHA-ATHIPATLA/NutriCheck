import { Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand-col">
          <Link to="/" className="brand footer-brand">
            <span className="brand-mark" aria-hidden="true">
              <Leaf size={16} strokeWidth={2.4} />
            </span>
            <span className="brand-title footer-brand-title">NutriCheck</span>
          </Link>
          <p className="footer-desc">
            Transparent food label inspection, packet ingredient scanning, and ML
            nutrition scoring grounded in WHO and FDA profiling rules.
          </p>
        </div>

        <div className="footer-links-group">
          <div className="footer-col">
            <div className="footer-col-title">Platform</div>
            <Link to="/" className="footer-link">
              Home
            </Link>
            <Link to="/scan" className="footer-link">
              Scan Packet Ingredients
            </Link>
            <Link to="/analyzer" className="footer-link">
              Food Analyzer &amp; Cart
            </Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Integrations &amp; Science</div>
            <Link to="/amazon" className="footer-link">
              Amazon Connect
            </Link>
            <Link to="/models" className="footer-link">
              Models &amp; Data
            </Link>
            <Link to="/about" className="footer-link">
              About NutriCheck
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>NutriCheck · Nutrient Profiling &amp; Packet Analysis</span>
        <span>WHO / FDA Criteria · Open Food Facts · Scikit-learn Random Forest</span>
      </div>
    </footer>
  );
}
