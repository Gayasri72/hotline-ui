import { useState } from "react";
import { api } from "../../../lib/api";
import { generateDeviceReceivedReceiptHTML, printReceipt as silentPrint } from "../../../lib/receipt";
import type { RepairJob } from "../../../types/pos";

interface AdvancePaymentModalProps {
  repair: RepairJob;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdvancePaymentModal({
  repair,
  onClose,
  onSuccess,
}: AdvancePaymentModalProps): JSX.Element {
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [amountReceived, setAmountReceived] = useState<string>(
    String(repair.estimatedCost || repair.advancePayment || "")
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const advanceAmount = parseFloat(amountReceived || "0");
  const quickAmounts = [500, 1000, 2000, 3000, 5000];

  const handleCollect = async (printReceipt: boolean = true) => {
    if (advanceAmount <= 0) {
      setError("Please enter a valid advance amount");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await api<{ status: string; message?: string; data?: any }>(
        `/repairs/${repair._id}/advance`,
        {
          method: "PUT",
          body: JSON.stringify({ amount: advanceAmount }),
        }
      );

      if (data.status === "success") {
        if (printReceipt) {
          // Generate receipt with updated advance
          const updatedRepair = {
            ...repair,
            advancePayment: advanceAmount,
          };
          const receiptHTML = generateDeviceReceivedReceiptHTML(updatedRepair);
          await silentPrint(receiptHTML);
        }
        onSuccess();
      } else {
        setError(data.message || "Failed to collect advance");
      }
    } catch (err) {
      setError("Failed to collect advance payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipAndPrint = async () => {
    // Just print receipt without collecting advance
    const receiptHTML = generateDeviceReceivedReceiptHTML(repair);
    await silentPrint(receiptHTML);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl w-full max-w-lg border border-sky-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-blue-500/20"></div>
          <div className="relative p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Collect Advance
                </h3>
                <p className="text-slate-600 text-sm">
                  {repair.jobNumber} • {repair.customer.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/50 hover:bg-red-500/30 rounded-xl text-slate-600 hover:text-red-400 transition-all border border-sky-200 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Repair Info Card */}
          <div className="bg-white/70 rounded-2xl p-4 border border-sky-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Device</p>
                <p className="text-slate-800 font-medium">{repair.device.brand} {repair.device.model}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Customer</p>
                <p className="text-slate-800 font-medium">{repair.customer.name}</p>
                <p className="text-slate-500 text-xs">{repair.customer.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Problem</p>
                <p className="text-slate-700 text-sm line-clamp-2">{repair.problemDescription || "N/A"}</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent my-3"></div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Estimated Cost</span>
                <span className="text-slate-800 font-medium">
                  Rs. {(repair.estimatedCost || 0).toLocaleString()}
                </span>
              </div>
              {repair.advancePayment > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-emerald-600 flex items-center gap-1">
                    ✓ Already Collected
                  </span>
                  <span className="text-emerald-600 font-medium">
                    Rs. {repair.advancePayment.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

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
                  className={`py-3 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${paymentMethod === method ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25" : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"}`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Amounts */}
          <div>
            <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
              Quick Amount
            </label>
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmountReceived(String(amt))}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${parseFloat(amountReceived) === amt ? "bg-blue-500/20 text-blue-600 border border-blue-500/50" : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"}`}
                >
                  {amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
              Advance Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">
                Rs.
              </span>
              <input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className={`w-full pl-14 pr-4 py-4 bg-white rounded-2xl text-slate-800 text-3xl text-center font-bold border-2 transition-all focus:outline-none ${advanceAmount > 0 ? "border-blue-500/50 focus:border-blue-500" : "border-sky-200 focus:border-sky-500"}`}
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          {/* Summary */}
          {advanceAmount > 0 && (
            <div className="p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-slate-600">Advance to Collect</span>
                <span className="font-bold text-blue-600">Rs. {advanceAmount.toLocaleString()}</span>
              </div>
              {(repair.estimatedCost || 0) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Est. Balance Remaining</span>
                  <span className="text-slate-700 font-medium">
                    Rs. {Math.max(0, (repair.estimatedCost || 0) - advanceAmount).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleSkipAndPrint}
              className="py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-sky-200 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>🖨️</span>
              Skip & Print Only
            </button>
            <button
              onClick={() => handleCollect(false)}
              disabled={loading || advanceAmount <= 0}
              className="py-3.5 bg-white hover:bg-blue-50 text-blue-700 font-semibold rounded-xl border border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-600 rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Collect Only
                </>
              )}
            </button>
          </div>
          <button
            onClick={() => handleCollect(true)}
            disabled={loading || advanceAmount <= 0}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <span>💰</span>
                Collect Advance & Print Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
