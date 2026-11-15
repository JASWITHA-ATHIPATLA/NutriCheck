import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ScanLine,
  ThumbsUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NutritionGauge } from '../components/NutritionGauge';

interface PreviewPacket {
  id: 'oats' | 'cookies' | 'soda';
  label: string;
  product: string;
  score: number;
  verdict: 'Good' | 'Moderate' | 'Not Good';
  tone: 'good' | 'moderate' | 'bad';
  reasons: { type: 'good' | 'warning'; text: string }[];
}

const PREVIEW_PACKETS: PreviewPacket[] = [
  {
    id: 'oats',
    label: 'Rolled Oats Packet',
    product: 'Wholegrain Rolled Oats',
    score: 88,
    verdict: 'Good',
    tone: 'good',
    reasons: [
      {
        type: 'good',
        text: '100% wholegrain oats with soluble beta-glucan fiber and 13g protein per 100g.',
      },
      {
        type: 'good',
        text: 'Low added sugar (1g) and minimal sodium (5mg) within WHO limits.',
      },
    ],
  },
  {
    id: 'cookies',
    label: 'Butter Cookies',
    product: 'Packaged Butter Cookies',
    score: 52,
    verdict: 'Moderate',
    tone: 'moderate',
    reasons: [
      {
        type: 'warning',
        text: 'Refined wheat flour (maida) and palm oil listed near top of packet.',
      },
      {
        type: 'warning',
        text: '23.5g sugars per 100g — enjoy in small controlled portions.',
      },
    ],
  },
  {
    id: 'soda',
    label: 'Cola Drink',
    product: 'Carbonated Cola Soft Drink',
    score: 26,
    verdict: 'Not Good',
    tone: 'bad',
    reasons: [
      {
        type: 'warning',
        text: 'High-fructose corn syrup & caramel color with zero protein or fiber.',
      },
      {
        type: 'warning',
        text: '100% of calories come from free sugars above WHO 10% guideline.',
      },
    ],
  },
];

const TESTIMONIALS = [
  {
    quote:
      'I used to buy packaged muesli assuming the front label meant it was healthy. Scanning the ingredients with NutriCheck flagged invert syrup and palm oil immediately—we switched to plain rolled oats and cut added breakfast sugar in half.',
    name: 'Ananya Deshmukh',
    role: 'Home Chef & Parent · Pune',
  },
  {
    quote:
      'Online grocery and food apps hide ingredients and calories inside tiny product photos. The NutriCheck browser extension checks Amazon, Flipkart, Swiggy Instamart, and Zomato items automatically and spots palm oil or excess sodium right away.',
    name: 'Rohan Kulkarni',
    role: 'Product Engineer · Bengaluru',
  },
  {
    quote:
      'Having both a plain-English Good / Not Good dial and the exact per-100 kcal sodium and sugar math makes label reading fast for my parents without needing nutrition expertise.',
    name: 'Meera Nair',
    role: 'Clinical Dietetics Student · Kochi',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [previewId, setPreviewId] = useState<'oats' | 'cookies' | 'soda'>('oats');
  const activePreview =
    PREVIEW_PACKETS.find((p) => p.id === previewId) || PREVIEW_PACKETS[0];

  return (
    <div className="home-page">
      {/* 1. Editorial Hero with Single Primary Scan Action + Interactive Score Dial */}
      <section className="nc-hero" aria-label="NutriCheck Overview">
        <div className="nc-hero-inner">
          <div className="nc-hero-copy">
            <p className="nc-hero-kicker">
              WHO &amp; FDA Profiling · Packet &amp; Online Food Scanner
            </p>
            <h1 className="nc-hero-title">
              Know if any food packet is good for you—in seconds.
            </h1>
            <p className="nc-hero-desc">
              Snap or upload any packaged food&apos;s ingredients label, or shop live on
              Amazon, Flipkart, Swiggy Instamart, and Zomato. NutriCheck gives a
              clear Good, Moderate, or Not Good verdict with a clean pie chart and table.
            </p>

            <div className="nc-hero-actions">
              <button
                type="button"
                className="nc-btn-primary"
                onClick={() => navigate('/scan')}
              >
                <ScanLine size={18} />
                <span>Scan Packet Ingredients</span>
              </button>

              <Link to="/amazon" className="nc-hero-secondary-link">
                <span>Connect Shopping Extension</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="nc-hero-showcase" aria-label="Interactive Packet Score Preview">
            <div className="showcase-tabs" role="tablist" aria-label="Sample packet previews">
              {PREVIEW_PACKETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={previewId === item.id}
                  className={`showcase-tab ${previewId === item.id ? 'is-active' : ''}`}
                  onClick={() => setPreviewId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="showcase-card">
              <div className="showcase-product-name">{activePreview.product}</div>
              <NutritionGauge
                score={activePreview.score}
                label={activePreview.verdict}
                tone={activePreview.tone}
                title="Nutrition score"
              />

              <div className="showcase-reasons">
                {activePreview.reasons.map((reason, idx) => (
                  <div key={idx} className="reason-row">
                    <span
                      className={`reason-icon ${
                        reason.type === 'good' ? 'is-good' : 'is-warning'
                      }`}
                      aria-hidden="true"
                    >
                      {reason.type === 'good' ? (
                        <ThumbsUp size={15} />
                      ) : (
                        <AlertTriangle size={15} />
                      )}
                    </span>
                    <span className="reason-text">{reason.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About Section */}
      <section id="about" className="home-section about-section" aria-labelledby="home-about-title">
        <div className="section-container">
          <div className="about-grid">
            <div>
              <p className="section-kicker">About NutriCheck</p>
              <h2 id="home-about-title" className="section-title">
                Transparent ingredient checks without marketing guesswork.
              </h2>
              <p className="section-lead">
                Front-of-pack health claims often hide high-fructose syrups, refined
                flours, palm oil, and excess sodium in tiny back-label print.
                NutriCheck combines browser OCR, additive rules, Open Food Facts, and a
                Scikit-learn Random Forest classifier trained on 2,158 cleaned foods.
              </p>
              <div className="about-links-row">
                <Link to="/about" className="text-action-link">
                  <span>Read Full Methodology</span>
                  <ArrowRight size={15} />
                </Link>
                <Link to="/models" className="text-action-link">
                  <span>Inspect ML Benchmarks</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="capability-list">
              <div className="capability-row">
                <div className="capability-num">01.</div>
                <div>
                  <h3 className="capability-title">Scan Packet Ingredients</h3>
                  <p className="capability-desc">
                    Upload a packet photo or snap with your camera. Browser OCR extracts
                    ingredients and nutrition tables, flagging refined oils, free sugars,
                    synthetic dyes, and preservatives.
                  </p>
                </div>
              </div>

              <div className="capability-row">
                <div className="capability-num">02.</div>
                <div>
                  <h3 className="capability-title">Search Packaged Brands Online</h3>
                  <p className="capability-desc">
                    Look up whole foods in our cleaned 2,158-food dataset or live packaged
                    grocery brands worldwide through Open Food Facts in the Food Analyzer.
                  </p>
                </div>
              </div>

              <div className="capability-row">
                <div className="capability-num">03.</div>
                <div>
                  <h3 className="capability-title">Live Amazon, Flipkart, Swiggy &amp; Zomato Checks</h3>
                  <p className="capability-desc">
                    Use the NutriCheck Chrome extension on Amazon, Flipkart, Swiggy
                    Instamart, and Zomato to inspect product ingredients right on the page
                    or sync every Add-to-Cart item automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Testimonials Section */}
      <section
        id="testimonials"
        className="home-section testimonials-section"
        aria-labelledby="home-testimonials-title"
      >
        <div className="section-container">
          <div className="section-header-block">
            <p className="section-kicker">Testimonials</p>
            <h2 id="home-testimonials-title" className="section-title">
              How shoppers use NutriCheck before checkout.
            </h2>
          </div>

          <div className="testimonial-grid">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="testimonial-card">
                <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="testimonial-author">
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
