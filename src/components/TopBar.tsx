import { ShieldCheck, ShoppingCart } from 'lucide-react';

export type ActiveTab = 'analyzer' | 'amazon' | 'metrics';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  cartCount: number;
  amazonCount: number;
  onJumpToCart: () => void;
}

export function TopBar({
  activeTab,
  onTabChange,
  cartCount,
  amazonCount,
  onJumpToCart,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <ShieldCheck size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-title">HealthGuard</div>
            <div className="brand-sub">Food Health Analyzer</div>
          </div>
        </div>

        <nav className="nav-links" aria-label="Primary navigation">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'analyzer' ? 'is-active' : ''}`}
            onClick={() => onTabChange('analyzer')}
          >
            Analyzer &amp; Cart
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'amazon' ? 'is-active' : ''}`}
            onClick={() => onTabChange('amazon')}
          >
            Amazon Connect{amazonCount > 0 ? ` (${amazonCount})` : ''}
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'metrics' ? 'is-active' : ''}`}
            onClick={() => onTabChange('metrics')}
          >
            Models &amp; Data
          </button>
        </nav>

        <div className="topbar-actions">
          <button
            type="button"
            className="cart-counter-btn"
            onClick={onJumpToCart}
            aria-label={`Demo Cart with ${cartCount} items`}
          >
            <ShoppingCart size={16} />
            <span>Demo Cart</span>
            <span className="cart-count-num">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
