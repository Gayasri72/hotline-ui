import { useState } from "react";
import { api } from "../../../lib/api";
import { generateRepairReceiptHTML, printReceipt as silentPrint } from "../../../lib/receipt";
import type { RepairPaymentModalProps } from "../../../types/pos";

type PaymentMode = "CASH" | "CARD" | "SPLIT";

export function RepairPaymentModal({
  repair,
  canCollectPayment,
  onClose,
  onSuccess,
}: RepairPaymentModalProps): JSX.Element {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const totalCost = repair.totalCost || 0;
  const laborCost = repair.laborCost || 0;
  const partsTotal = repair.partsTotal || 0;
  const advancePaid = repair.advancePayment || 0;
  const balanceDue = Math.max(0, totalCost - advancePaid);
  const partsUsed = repair.partsUsed || [];

  // Calculate totals based on mode
  const getTotalPaid = (): number => {
    if (paymentMode === "SPLIT") {
      return (parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0);
    }
    return parseFloat(amountReceived) || 0;
  };

  // Sanitize: prevent negative, NaN, or excessively large values
  const sanitizeAmount = (val: string): string => {
    if (val === '' || val === '-') return '';
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return '';
    if (num > 9999999) return '9999999';
    return val;
  };

  const totalPaid = getTotalPaid();
  const change = paymentMode === "CASH" ? Math.max(0, totalPaid - balanceDue) : 0;
  const isValidAmount = paymentMode === "SPLIT"
    ? totalPaid >= balanceDue && (parseFloat(cashAmount) || 0) > 0 && (parseFloat(cardAmount) || 0) > 0
    : totalPaid >= balanceDue;

  // Inline validation messages
  const getAmountError = (): string => {
    if (paymentMode === "SPLIT") {
      const cash = parseFloat(cashAmount) || 0;
      const card = parseFloat(cardAmount) || 0;
      if ((cashAmount || cardAmount) && cash <= 0 && card <= 0) return "Both amounts must be greater than zero";
      if (cashAmount && cash <= 0) return "Cash amount must be greater than zero";
      if (cardAmount && card <= 0) return "Card amount must be greater than zero";
      if (cash > 0 && card > 0 && (cash + card) < balanceDue) return `Total must be at least Rs. ${balanceDue.toLocaleString()}`;
      return '';
    }
    if (amountReceived && totalPaid > 0 && totalPaid < balanceDue) {
      return `Amount must be at least Rs. ${balanceDue.toLocaleString()}`;
    }
    return '';
  };
  const amountError = getAmountError();

  const getQuickAmounts = () => {
    const base = [500, 1000, 2000, 3000, 5000];
    if (balanceDue > 0 && !base.includes(Math.ceil(balanceDue))) {
      return [Math.ceil(balanceDue), ...base.filter((a) => a !== Math.ceil(balanceDue))].slice(0, 5);
    }
    return base;
  };

  // Build payments array for API
  const buildPayments = () => {
    if (paymentMode === "SPLIT") {
      const payments = [];
      const cash = parseFloat(cashAmount) || 0;
      const card = parseFloat(cardAmount) || 0;
      if (cash > 0) payments.push({ method: "CASH", amount: cash });
      if (card > 0) payments.push({ method: "CARD", amount: card });
      return payments;
    }
    return [{ method: paymentMode, amount: totalPaid }];
  };

  // Handle amount input with validation
  const handleAmountChange = (val: string) => {
    setAmountReceived(sanitizeAmount(val));
  };

  // Handle split amount auto-fill
  const handleCashChange = (val: string) => {
    const sanitized = sanitizeAmount(val);
    setCashAmount(sanitized);
    const c = parseFloat(sanitized) || 0;
    if (c > 0 && c < balanceDue) {
      setCardAmount(String(Math.round((balanceDue - c) * 100) / 100));
    }
  };

  const handleCardChange = (val: string) => {
    const sanitized = sanitizeAmount(val);
    setCardAmount(sanitized);
    const c = parseFloat(sanitized) || 0;
    if (c > 0 && c < balanceDue) {
      setCashAmount(String(Math.round((balanceDue - c) * 100) / 100));
    }
  };

  // When switching to Card mode, auto-set exact amount
  const handleModeChange = (mode: PaymentMode) => {
    setPaymentMode(mode);
    setError('');
    if (mode === 'CARD') {
      setAmountReceived(String(balanceDue));
    } else if (mode === 'SPLIT') {
      setCashAmount('');
      setCardAmount('');
    } else {
      setAmountReceived('');
    }
  };

  const handlePayment = async (printReceipt: boolean = true): Promise<void> => {
    if (!canCollectPayment) {
      setError("You don't have permission to collect repair payments");
      return;
    }
    if (!isValidAmount) {
      setError("Amount is insufficient or invalid");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payments = buildPayments();
      const res = await api<{ status: string; message?: string; data?: any }>(
        `/repairs/${repair._id}/payment`,
        {
          method: "PUT",
          body: JSON.stringify({ payments }),
        },
      );
      if (res.status === "success") {
        if (printReceipt) {
          const receiptHTML = generateRepairReceiptHTML({
            ...repair,
            totalCost,
            advancePayment: advancePaid,
            amountReceived: totalPaid,
            change: change > 0 ? change : 0,
            payments,
          });
          await silentPrint(receiptHTML);
        }
        setShowSuccess(true);
        setTimeout(() => onSuccess(), 1500);
      } else {
        setError(res.message || "Payment failed");
      }
    } catch (err) {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Payment Successful</h3>
          <p className="text-slate-500 mb-4">Repair completed & recorded.</p>
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-2 text-left border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Paid</span>
              <span className="font-semibold text-slate-900">Rs. {totalPaid.toLocaleString()}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Change</span>
                <span className="font-semibold text-emerald-600">Rs. {change.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Collect Payment</h3>
            <p className="text-slate-500 text-sm">{repair.jobNumber} • {repair.customer.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* === COST BREAKDOWN === */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cost Breakdown</h4>

            {/* Parts Used */}
            {partsUsed.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Parts Used</p>
                <div className="space-y-1">
                  {partsUsed.map((part, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700">{part.productName} <span className="text-slate-400">×{part.quantity}</span></span>
                      <span className="text-slate-800 font-medium">Rs. {part.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-medium">Parts Total</span>
                  <span className="text-slate-800 font-semibold">Rs. {partsTotal.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Labor Cost */}
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-slate-600 font-medium">Labor Cost</span>
              <span className="text-slate-800 font-semibold">Rs. {laborCost.toLocaleString()}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300">
              <span className="text-slate-800 font-bold">Total Repair Cost</span>
              <span className="text-slate-900 font-bold text-lg">Rs. {totalCost.toLocaleString()}</span>
            </div>

            {/* Advance */}
            {advancePaid > 0 && (
              <div className="flex justify-between items-center mt-2 text-sm text-emerald-700">
                <span className="flex items-center gap-1">✓ Advance Paid</span>
                <span className="font-medium">- Rs. {advancePaid.toLocaleString()}</span>
              </div>
            )}

            {/* Balance Due */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-blue-200 bg-blue-50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
              <span className="text-blue-800 font-bold text-sm uppercase tracking-wider">Balance Due</span>
              <span className="text-2xl font-bold text-blue-700">Rs. {balanceDue.toLocaleString()}</span>
            </div>
          </div>

          {/* === PAYMENT METHOD === */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: "CASH" as PaymentMode, icon: "💵", label: "Cash" },
                { mode: "CARD" as PaymentMode, icon: "💳", label: "Card" },
                { mode: "SPLIT" as PaymentMode, icon: "🔀", label: "Split" },
              ].map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    paymentMode === mode
                      ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* === AMOUNT INPUT === */}
          {paymentMode !== "SPLIT" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {paymentMode === "CASH" ? "Amount Received" : "Amount to Charge"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-medium">Rs.</span>
                <input
                  type="number"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={`w-full pl-14 pr-4 py-3.5 bg-white border-2 rounded-xl text-2xl font-bold text-center focus:outline-none transition-all ${
                    amountError
                      ? "border-red-300 focus:border-red-500"
                      : "border-slate-200 focus:border-blue-500"
                  }`}
                  placeholder="0"
                  autoFocus
                />
                {amountError && (
                  <p className="text-red-500 text-xs mt-1.5">{amountError}</p>
                )}
                {paymentMode === "CARD" && balanceDue > 0 && (
                  <button
                    onClick={() => setAmountReceived(String(balanceDue))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                  >Exact</button>
                )}
              </div>

              {/* Quick Amounts (Cash only) */}
              {paymentMode === "CASH" && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {getQuickAmounts().map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountReceived(String(amt))}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        parseFloat(amountReceived) === amt
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* SPLIT PAYMENT */
            <div className="space-y-3">
              {/* Quick Split Buttons */}
              <div className="flex gap-2">
                {[
                  { label: "50 / 50", cash: 0.5, card: 0.5 },
                  { label: "70 / 30", cash: 0.7, card: 0.3 },
                  { label: "30 / 70", cash: 0.3, card: 0.7 },
                ].map(({ label, cash, card }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setCashAmount(String(Math.round(balanceDue * cash)));
                      setCardAmount(String(Math.round(balanceDue * card)));
                    }}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Cash Input */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">💵 Cash Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => handleCashChange(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className={`w-full pl-12 pr-4 py-3 bg-white border-2 rounded-xl text-lg font-bold focus:outline-none transition-all ${
                      cashAmount && (parseFloat(cashAmount) || 0) <= 0 ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              {/* Card Input */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">💳 Card Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    value={cardAmount}
                    onChange={(e) => handleCardChange(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className={`w-full pl-12 pr-4 py-3 bg-white border-2 rounded-xl text-lg font-bold focus:outline-none transition-all ${
                      cardAmount && (parseFloat(cardAmount) || 0) <= 0 ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Split Summary */}
              {totalPaid > 0 && (
                <div className={`p-3 rounded-xl border text-sm ${
                  isValidAmount ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cash + Card</span>
                    <span className="font-semibold">Rs. {totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500 text-xs">Balance Due</span>
                    <span className="text-xs font-medium">Rs. {balanceDue.toLocaleString()}</span>
                  </div>
                  {!isValidAmount && (
                    <p className="text-amber-700 text-xs mt-1">⚠ Both amounts must be &gt; 0 and total must cover balance due</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CHANGE (Cash mode) */}
          {paymentMode === "CASH" && isValidAmount && amountReceived && change > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
              <span className="text-emerald-800 font-medium text-sm">Change to Return</span>
              <span className="text-xl font-bold text-emerald-700">Rs. {change.toFixed(2)}</span>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* ACTIONS */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handlePayment(false)}
              disabled={loading || !canCollectPayment || !isValidAmount || totalPaid <= 0}
              className="py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? "Processing..." : "Complete Only"}
            </button>
            <button
              onClick={() => handlePayment(true)}
              disabled={loading || !canCollectPayment || !isValidAmount || totalPaid <= 0}
              className="py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors text-sm"
            >
              {loading ? "Processing..." : "Complete & Print"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
