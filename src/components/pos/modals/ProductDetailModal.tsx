import type { ProductDetailModalProps } from "../../../types/pos";

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps): JSX.Element {
  const hasOffer =
    product?.hasActiveOffer ||
    (product?.offer?.isActive &&
      product?.discountAmount &&
      product.discountAmount > 0);
  const displayPrice = product?.effectivePrice ?? product?.sellingPrice ?? 0;
  const originalPrice = product?.sellingPrice ?? 0;
  const isOutOfStock = (product?.stock ?? 0) === 0;
  const isLowStock = (product?.stock ?? 0) > 0 && (product?.stock ?? 0) <= 10;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl w-full max-w-lg border border-sky-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 via-blue-500/10 to-sky-500/20"></div>
          <div className="relative p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center text-2xl font-bold text-sky-600 border border-sky-500/30">
                {(product?.name?.[0] || "P").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 leading-tight line-clamp-2">
                  {product?.name || "Unknown Product"}
                </h3>
                <p className="text-slate-600 text-xs font-mono mt-0.5">
                  {product?.sku}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/50 hover:bg-red-500/30 rounded-xl text-slate-600 hover:text-red-400 transition-all border border-sky-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/70 rounded-xl p-3 border border-sky-200">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                Category
              </p>
              <p className="text-slate-800 font-medium text-sm">
                {product?.category?.name || "Uncategorized"}
              </p>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-sky-200">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                Stock Status
              </p>
              <div
                className={`flex items-center gap-1.5 ${isOutOfStock ? "text-red-500" : isLowStock ? "text-amber-500" : "text-sky-600"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isOutOfStock ? "bg-red-500" : isLowStock ? "bg-amber-500" : "bg-sky-600"}`}
                ></span>
                <span className="font-semibold text-sm">
                  {product?.stock ?? 0} {product?.unit || "units"}
                </span>
              </div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-sky-200">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                Barcode
              </p>
              <p className="text-slate-800 font-mono text-sm">
                {product?.barcode || "—"}
              </p>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-sky-200">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                Brand
              </p>
              <p className="text-slate-800 font-medium text-sm">
                {product?.subcategory?.name || "—"}
              </p>
            </div>
          </div>

          {/* Warranty */}
          {product?.warrantyDuration && product.warrantyDuration > 0 && (
            <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-sky-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-800 font-medium">
                      {product.warrantyDuration}{" "}
                      {product.warrantyDuration === 1 ? "Month" : "Months"}{" "}
                      Warranty
                    </p>
                    {product.warrantyDescription && (
                      <p className="text-sky-600/70 text-xs mt-0.5">
                        {product.warrantyDescription}
                      </p>
                    )}
                  </div>
                </div>
                {product.warrantyType && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-700 border border-sky-500/30 font-medium">
                    {product.warrantyType}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {product?.description && (
            <div className="bg-white/50 rounded-xl p-4 border border-sky-200">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-slate-700 text-sm leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Price Section */}
          <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 rounded-2xl p-4 border border-sky-500/20">
            {hasOffer && (
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20">
                  {product?.offer?.type === "PERCENTAGE"
                    ? `${product?.offer?.value}% OFF`
                    : `Rs.${product?.discountAmount} OFF`}
                </span>
                {product?.offer?.description && (
                  <span className="text-orange-600 text-xs flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {product.offer.description}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-baseline gap-3">
              {hasOffer && (
                <span className="text-slate-600 text-lg line-through">
                  Rs. {originalPrice.toLocaleString()}
                </span>
              )}
              <span className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">
                Rs. {displayPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-sky-200 flex gap-3 bg-gradient-to-t from-sky-50 to-transparent">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-all border border-sky-200 font-medium"
          >
            Close
          </button>
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className={`flex-1 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${isOutOfStock ? "bg-slate-100 text-slate-500 cursor-not-allowed border border-sky-200" : "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"}`}
          >
            {isOutOfStock ? (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                Out of Stock
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
