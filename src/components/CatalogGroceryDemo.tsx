import { Loader2, Search, ShoppingCart } from 'lucide-react';
import type { CatalogFoodItem } from '../types';

interface CatalogGroceryDemoProps {
  items: CatalogFoodItem[];
  searchQuery: string;
  analyzingFoodName: string | null;
  onSearchChange: (q: string) => void;
  onAddToCartClick: (item: CatalogFoodItem) => void;
}

export function CatalogGroceryDemo({
  items,
  searchQuery,
  analyzingFoodName,
  onSearchChange,
  onAddToCartClick,
}: CatalogGroceryDemoProps) {
  return (
    <section
      id="grocery-cart-demo"
      className="card grocery-section"
      aria-labelledby="grocery-demo-heading"
    >
      <div className="grocery-header">
        <div>
          <h2 id="grocery-demo-heading" className="card-title">
            Instant Add-to-Cart Food Analyzer
          </h2>
          <p className="card-subtitle">
            Search any whole food (2,158 cleaned foods) or live packaged grocery brand
            worldwide and click <strong>Add to Cart</strong> for an instant NutriCheck
            verdict.
          </p>
        </div>

        <div className="grocery-search-wrap">
          <Search size={15} className="grocery-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="field-input grocery-search-input"
            placeholder="Search any packed food (e.g., maggi, oreo, lays, nutella, pizza)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search dataset and packaged foods"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="card-subtitle" style={{ padding: '16px 0' }}>
          No matching foods found for &ldquo;{searchQuery}&rdquo;. Try another brand or
          enter nutrition values manually below.
        </p>
      ) : (
        <div className="grocery-grid">
          {items.map((item) => {
            const isLoading = analyzingFoodName === item.food;
            return (
              <div key={`${item.food_norm}-${item.source_group}`} className="grocery-card">
                <div className="grocery-card-body">
                  <div className="grocery-card-title">{item.food}</div>
                  <div className="grocery-card-meta">
                    <span className="tabular">{item.calories}</span> kcal ·{' '}
                    <span className="tabular">{item.sugars}g</span> sugar ·{' '}
                    <span className="tabular">{Math.round(item.sodium_mg)}mg</span>{' '}
                    sodium
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-add-item"
                  disabled={isLoading}
                  data-cart-food={item.food}
                  onClick={() => onAddToCartClick(item)}
                >
                  {isLoading ? (
                    <Loader2 size={15} className="spin-icon" />
                  ) : (
                    <ShoppingCart size={15} />
                  )}
                  <span>{isLoading ? 'Analyzing...' : 'Add to Cart'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
