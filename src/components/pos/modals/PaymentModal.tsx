import { useState } from "react";
import { api } from "../../../lib/api";
import { generateSaleReceiptHTML, printReceipt as silentPrint } from "../../../lib/receipt";
import type { PaymentModalProps } from "../../../types/pos";

export function PaymentModal({
  total,
  subtotal,
  tax,
  cart,
  canApplyDiscount,
  onClose,
  onSuccess,
}: PaymentModalProps): JSX.Element {
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [discountType, setDiscountType] = useState<
    "PERCENTAGE" | "FIXED" | null
  >(null);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const hasWarrantyProducts = cart.some(
    (item) => (item.warrantyDuration ?? 0) > 0,
  );
  const [showCustomerInfo, setShowCustomerInfo] =
    useState<boolean>(hasWarrantyProducts);

  const discountAmount =
    discountType === "PERCENTAGE"
      ? (subtotal * discountValue) / 100
      : discountType === "FIXED"
        ? discountValue
        : 0;
  const finalTotal = total - discountAmount;
  const change = parseFloat(amountReceived || "0") - finalTotal;
  const quickAmounts = [100, 500, 1000, 2000, 5000];

  const handlePayment = async (printReceipt: boolean = true): Promise<void> => {
    if (hasWarrantyProducts && !customerPhone.trim()) {
      setError("Customer phone is required for products with warranty");
      setShowCustomerInfo(true);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await api<{ status: string; message?: string; data?: any }>(
        "/sales",
        {
          method: "POST",
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item._id,
              quantity: item.quantity,
              unitPrice: item.sellingPrice,
              serialNumber: item.serialNumber,
            })),
            payments: [
              {
                method: paymentMethod,
                amount: parseFloat(amountReceived) || finalTotal,
              },
            ],
            discountType: discountType,
            discountValue: discountValue,
            customer: customerPhone
              ? {
                  name: customerName || undefined,
                  phone: customerPhone,
                }
              : undefined,
          }),
        },
      );
      if (data.status === "success") {
        const sale = data.data?.sale;
        if (printReceipt && sale) {
          // Generate beautiful receipt HTML and print silently
          const receiptHTML = generateSaleReceiptHTML(sale);
          await silentPrint(receiptHTML);
        }
        onSuccess();
      } else {
        setError(data.message || "Payment failed");
      }
    } catch (err) {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl w-full max-w-xl border border-sky-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 via-blue-500/10 to-sky-500/20"></div>
          <div className="relative p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Complete Payment
                </h3>
                <p className="text-slate-600 text-sm">
                  {cart.length} items in order
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/50 hover:bg-red-500/30 rounded-xl text-slate-600 hover:text-red-400 transition-all border border-sky-200"
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

        <div className="p-5 space-y-4">
          {/* Order Summary Card */}
          <div className="bg-white/70 rounded-2xl p-4 border border-sky-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-800">
                  Rs. {subtotal.toLocaleString()}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    Discount
                  </span>
                  <span className="text-sky-600">
                    - Rs. {discountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Tax</span>
                <span className="text-slate-800">
                  Rs. {tax.toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent my-2"></div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-lg font-semibold text-slate-800">
                  Total
                </span>
                <span className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">
                  Rs. {finalTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Discount Section */}
          {canApplyDiscount && (
            <div className="bg-white/50 rounded-xl p-4 border border-sky-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  Apply Discount
                </span>
                {!discountType ? (
                  <button
                    onClick={() => setDiscountType("PERCENTAGE")}
                    className="text-xs font-medium text-sky-600 hover:text-sky-500 flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
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
                    Add
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setDiscountType(null);
                      setDiscountValue(0);
                    }}
                    className="text-xs font-medium text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              {discountType && (
                <div className="flex gap-2 mt-2">
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "PERCENTAGE" | "FIXED")
                    }
                    className="px-3 py-2.5 bg-white border border-sky-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed (Rs)</option>
                  </select>
                  <input
                    type="number"
                    value={discountValue || ""}
                    onChange={(e) =>
                      setDiscountValue(parseFloat(e.target.value) || 0)
                    }
                    placeholder="Enter value"
                    className="flex-1 px-3 py-2.5 bg-white border border-sky-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Customer Info Section */}
          <div
            className={`bg-white/50 rounded-xl border overflow-hidden ${hasWarrantyProducts && !customerPhone.trim() ? "border-amber-300 ring-1 ring-amber-200" : "border-sky-200"}`}
          >
            <button
              type="button"
              onClick={() => setShowCustomerInfo(!showCustomerInfo)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-sky-50/50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Customer Info
                {hasWarrantyProducts && !customerPhone.trim() && (
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full animate-pulse">
                    ⚠️ REQUIRED
                  </span>
                )}
                {customerPhone && (
                  <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full">
                    ✓ Added
                  </span>
                )}
              </span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${showCustomerInfo ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showCustomerInfo && (
              <div className="px-4 pb-4 space-y-3 border-t border-sky-200">
                {hasWarrantyProducts && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1 font-medium">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    Cart contains warranty products - Customer phone is REQUIRED
                  </p>
                )}
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-xl text-slate-800 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Phone Number <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className="w-full px-3 py-2.5 bg-white border border-sky-200 rounded-xl text-slate-800 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { method: "CASH" as const, icon: "💵", label: "Cash" },
                { method: "CARD" as const, icon: "💳", label: "Card" },
              ].map(({ method, icon, label }) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3.5 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${paymentMethod === method ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25" : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"}`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment Options */}
          {paymentMethod === "CASH" && (
            <>
              <div>
                <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
                  Quick Amount
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountReceived(String(amt))}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${parseFloat(amountReceived) === amt ? "bg-sky-500/20 text-sky-600 border border-sky-500/50" : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"}`}
                    >
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
                  Amount Received
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">
                    Rs.
                  </span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className={`w-full pl-14 pr-4 py-4 bg-white rounded-2xl text-slate-800 text-3xl text-center font-bold border-2 transition-all focus:outline-none ${amountReceived && parseFloat(amountReceived) >= finalTotal ? "border-sky-500/50 focus:border-sky-500" : amountReceived && parseFloat(amountReceived) < finalTotal ? "border-amber-500/50 focus:border-amber-500" : "border-sky-200 focus:border-sky-500"}`}
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              {change >= 0 &&
                parseFloat(amountReceived || "0") >= finalTotal && (
                  <div className="p-4 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/30 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
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
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <span className="text-sky-700 font-medium">
                          Change to Return
                        </span>
                      </div>
                      <span className="text-3xl font-bold text-sky-600">
                        Rs. {change.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
            </>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handlePayment(false)}
              disabled={
                loading ||
                (paymentMethod === "CASH" &&
                  parseFloat(amountReceived || "0") < finalTotal)
              }
              className="py-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed border border-sky-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-800 rounded-full animate-spin"></div>
                  Processing...
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Complete
                </>
              )}
            </button>
            <button
              onClick={() => handlePayment(true)}
              disabled={
                loading ||
                (paymentMethod === "CASH" &&
                  parseFloat(amountReceived || "0") < finalTotal)
              }
              className="py-4 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
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
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Complete & Print
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
