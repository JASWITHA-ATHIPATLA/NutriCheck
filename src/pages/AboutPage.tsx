import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">About NutriCheck</h1>
          <p className="page-subtitle">
            How NutriCheck evaluates food packets, packaged grocery brands, and daily
            nutrition labels.
          </p>
        </div>
      </div>

      <div className="metrics-stack">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">01. Why NutriCheck Exists</h2>
              <p className="card-subtitle">
                Turning dense back-of-pack nutrition tables and additive lists into a clear
                verdict.
              </p>
            </div>
          </div>
          <p className="about-prose">
            Most packaged foods highlight marketing claims on the front while listing
            refined wheat flour, palmolein oil, invert syrup, maltodextrin, and synthetic
            preservatives in small print on the back. NutriCheck gives everyday shoppers
            one place to scan a packet photo, search online packaged brands, or monitor
            food and grocery additions across Amazon, Flipkart, Swiggy Instamart, and
            Zomato automatically.
          </p>
        </section>

        <div className="two-col-grid">
          <section className="card">
            <h2 className="card-title">02. WHO &amp; FDA Nutrient Profiling</h2>
            <ul className="rule-list">
              <li>
                <strong>Free Sugars Threshold:</strong> Penalizes products where sugars
                exceed 10% of total calories (WHO guideline) or high absolute sugar per
                serving.
              </li>
              <li>
                <strong>Fat &amp; Energy Density:</strong> Flags fat-dense profiles above
                30% of calories and high kcal-per-100g foods (WCRF energy-density rule).
              </li>
              <li>
                <strong>Sodium Density:</strong> Measures sodium per 100 kcal against the
                FDA 2,300 mg / 2,000 kcal benchmark.
              </li>
              <li>
                <strong>Positive Density Credits:</strong> Rewards dietary fiber, protein
                density, whole nuts/seeds, and low-energy whole foods.
              </li>
            </ul>
          </section>

          <section className="card">
            <h2 className="card-title">03. Packet Ingredient Inspection</h2>
            <ul className="rule-list">
              <li>
                <strong>Whole-Food Positives:</strong> Whole oats, millets, whole wheat,
                nuts, seeds, legumes, yogurt, olive oil, and vegetables improve the score.
              </li>
              <li>
                <strong>Refined &amp; Caution Items:</strong> Refined flour (maida),
                palm oil, invert sugar syrup, maltodextrin, and added salt lower the score.
              </li>
              <li>
                <strong>Additives to Limit:</strong> High-fructose corn syrup, partially
                hydrogenated trans fats, artificial sweeteners, synthetic dyes, TBHQ, and
                sodium benzoate trigger red-flag warnings.
              </li>
            </ul>
          </section>
        </div>

        <section className="card">
          <div className="result-footer-actions">
            <div>
              <h2 className="card-title">Try Scanning a Food Packet Now</h2>
              <p className="card-subtitle">
                Upload a photo of any ingredients label, connect your Chrome extension,
                or inspect ML model benchmarks.
              </p>
            </div>
            <div className="form-actions" style={{ marginTop: 0 }}>
              <Link to="/scan" className="btn-primary" style={{ textDecoration: 'none' }}>
                <span>Scan Packet Ingredients</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                to="/amazon"
                className="btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                <span>Store Connect</span>
              </Link>
              <Link
                to="/models"
                className="btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                <span>Models &amp; Data</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
