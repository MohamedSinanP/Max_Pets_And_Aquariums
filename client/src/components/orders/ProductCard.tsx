import { useState } from "react";
import type { CartItem } from "../../types/order";
import type { Product, ProductVariant } from "../../types/product";
import { TealBtn } from "./OrderUi";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, variant: ProductVariant) => void;
  cartItems: CartItem[];
}
export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, cartItems }) => {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const activeVariants = product.variants.filter(v => v.isActive);
  const variant = activeVariants[selectedVariantIdx] ?? activeVariants[0];
  if (!variant) return null;

  const inCart = cartItems.find(
    c => c.productId === product._id && c.variantId === variant._id
  );
  const outOfStock = variant.quantity.inStock <= 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-teal-50 hover:border-teal-200 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-teal-50 group">
      <div className="h-28 bg-gradient-to-br from-teal-50 to-teal-100/50 flex items-center justify-center relative">
        {product.variants[0]?.images?.[0]?.url ? (
          <img src={product.variants[0].images[0].url} alt={product.name}
            className="h-full w-full object-cover" />
        ) : (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#99d6d0" strokeWidth="1.2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" strokeLinecap="round" />
          </svg>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-red-400 text-xs font-bold px-2 py-1 bg-red-50 rounded-lg border border-red-100">Out of Stock</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            {product.category?.name ?? product.type}
          </span>
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-bold text-teal-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {product.name}
        </h4>

        {activeVariants.length > 1 && (
          <select
            value={selectedVariantIdx}
            onChange={e => setSelectedVariantIdx(Number(e.target.value))}
            className="w-full text-xs border border-teal-100 rounded-lg px-2 py-1.5 mb-2 bg-teal-50/50 text-teal-700 focus:outline-none focus:border-teal-400"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {activeVariants.map((v, idx) => {
              const label = Object.entries(v.attributes ?? {})
                .filter(([, val]) => val)
                .map(([, val]) => val)
                .join(" · ") || `Variant ${idx + 1}`;
              return <option key={v._id} value={idx}>{label} — ₹{v.price.selling}/{v.priceUnit}</option>;
            })}
          </select>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-teal-600 font-black text-base" style={{ fontFamily: "'DM Mono', monospace" }}>
              ₹{variant.price.selling.toFixed(2)}
              <span className="text-teal-400 font-normal text-xs">/{variant.priceUnit}</span>
            </p>
            <p className="text-teal-400 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Stock: {variant.quantity.inStock} {variant.quantity.baseUnit}
            </p>
          </div>
          {inCart && (
            <span className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
              In cart ✓
            </span>
          )}
        </div>

        <TealBtn
          onClick={() => onAddToCart(product, variant)}
          disabled={outOfStock}
          variant={inCart ? "outline" : "solid"}
          size="sm"
          className="w-full justify-center"
        >
          {inCart ? (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg> Added</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Add to Order</>
          )}
        </TealBtn>
      </div>
    </div>
  );
};