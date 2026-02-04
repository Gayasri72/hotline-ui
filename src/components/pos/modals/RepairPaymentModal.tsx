import { useState } from "react";
import { api } from "../../../lib/api";
import { getReceiptHeader, getReceiptFooter } from "../../../lib/settings";
import type { RepairPaymentModalProps } from "../../../types/pos";

export function RepairPaymentModal({
  repair,
  canCollectPayment,
  onClose,
  onSuccess,
}: RepairPaymentModalProps): JSX.Element {
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const totalCost = repair.totalCost || 0;
  const advancePaid = repair.advancePayment || 0;
  const balanceDue = Math.max(0, totalCost - advancePaid);
  const change = parseFloat(amountReceived || "0") - balanceDue;
  const isValidAmount = parseFloat(amountReceived || "0") >= balanceDue;

  const getQuickAmounts = () => {
    const base = [100, 500, 1000, 2000, 5000];
    if (balanceDue > 0 && !base.includes(Math.ceil(balanceDue))) {
      return [
        Math.ceil(balanceDue),
        ...base.filter((a) => a !== Math.ceil(balanceDue)),
      ].slice(0, 5);
    }
    return base;
  };

  const handlePayment = async (printReceipt: boolean = true): Promise<void> => {
    if (!canCollectPayment) {
      setError("You don't have permission to collect repair payments");
      return;
    }
    if (!isValidAmount) {
      setError("Amount received is less than balance due");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api<{ status: string; message?: string; data?: any }>(
        `/repairs/${repair._id}/payment`,
        {
          method: "PUT",
          body: JSON.stringify({
            amount: parseFloat(amountReceived),
            paymentMethod: paymentMethod,
          }),
        },
      );
      if (res.status === "success") {
        if (printReceipt) {
          const shopHeader = getReceiptHeader();
          const shopFooter = getReceiptFooter();
          const receiptContent = `
${shopHeader}═══════════════════════════════════════════
        REPAIR COMPLETE RECEIPT
═══════════════════════════════════════════

Job Number: ${repair.jobNumber}
Date: ${new Date().toLocaleString()}

───────────────────────────────────────────
CUSTOMER DETAILS
───────────────────────────────────────────
Name: ${repair.customer.name}
Phone: ${repair.customer.phone}

───────────────────────────────────────────
DEVICE DETAILS
───────────────────────────────────────────
Device: ${repair.device.brand} ${repair.device.model}
Problem: ${repair.problemDescription}
${repair.repairNotes ? `Solution: ${repair.repairNotes}` : ""}

───────────────────────────────────────────
COST BREAKDOWN
───────────────────────────────────────────
${repair.partsUsed?.length ? repair.partsUsed.map((p: any) => `${p.productName}: ${p.quantity} x Rs. ${p.unitPrice.toLocaleString()} = Rs. ${p.total.toLocaleString()}`).join("\n") : ""}
Parts Total:        Rs. ${(repair.partsTotal || 0).toLocaleString()}
Labor Cost:         Rs. ${(repair.laborCost || 0).toLocaleString()}
───────────────────────────────────────────
TOTAL COST:         Rs. ${totalCost.toLocaleString()}

───────────────────────────────────────────
PAYMENT
───────────────────────────────────────────
Advance Paid:       Rs. ${advancePaid.toLocaleString()}
Balance Due:        Rs. ${balanceDue.toLocaleString()}
Amount Received:    Rs. ${parseFloat(amountReceived).toLocaleString()}
${change > 0 ? `Change:             Rs. ${change.toFixed(2)}` : ""}

═══════════════════════════════════════════
          ${shopFooter}
═══════════════════════════════════════════
          `.trim();

          const printWindow = window.open("", "_blank", "width=400,height=700");
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>Repair Receipt - ${repair.jobNumber}</title>
                  <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
                    pre { white-space: pre-wrap; word-wrap: break-word; }
                  </style>
                </head>
                <body>
                  <pre>${receiptContent}</pre>
                </body>
              </html>
            `);
            printWindow.document.close();
            printWindow.print();
          }
        }
        setShowSuccess(true);
        setTimeout(() => onSuccess(), 2000);
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl p-8 w-full max-w-md border border-sky-200 shadow-2xl text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-400 flex items-center justify-center animate-bounce">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-slate-800 mb-2">
            Payment Complete!
          </h3>
          <p className="text-sky-600 text-lg mb-6">Transaction successful</p>

          <div className="bg-white/70 rounded-2xl p-4 mb-6 text-left space-y-2 border border-sky-200">
            <div className="flex justify-between">
              <span className="text-slate-600">Job Number</span>
              <span className="text-slate-800 font-medium">
                {repair.jobNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Customer</span>
              <span className="text-slate-800 font-medium">
                {repair.customer.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Amount Paid</span>
              <span className="text-sky-600 font-bold">
                Rs. {parseFloat(amountReceived).toLocaleString()}
              </span>
            </div>
            {change > 0 && (
              <div className="flex justify-between pt-2 border-t border-sky-200">
                <span className="text-slate-600">Change</span>
                <span className="text-amber-600 font-bold">
                  Rs. {change.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <p className="text-slate-600 text-sm">Closing automatically...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl w-full max-w-xl border border-sky-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 via-blue-500/10 to-sky-500/20"></div>
          <div className="relative p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <span className="text-2xl">💵</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Collect Payment
                </h3>
                <p className="text-slate-600 text-sm">
                  {repair.jobNumber} • {repair.customer.name}
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
          {/* Device Info */}
          <div className="bg-white/70 rounded-2xl p-4 border border-sky-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center text-2xl border border-sky-200">
                📱
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-semibold">
                  {repair.device.brand} {repair.device.model}
                </p>
                <p className="text-slate-600 text-sm">
                  {repair.problemDescription?.slice(0, 50) || "Device repair"}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-600">
                    Technician: {repair.assignedTo?.username || "N/A"}
                  </span>
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded text-xs border border-sky-200">
                    ✓ Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white/70 rounded-2xl p-4 border border-sky-200">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-sky-50 rounded-xl p-3 text-center border border-sky-200">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">
                  Labor
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  Rs. {(repair.laborCost || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-sky-50 rounded-xl p-3 text-center border border-sky-200">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">
                  Parts
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  Rs. {(repair.partsTotal || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-t border-sky-200">
                <span className="text-slate-600">Total Cost</span>
                <span className="text-slate-800 font-semibold">
                  Rs. {totalCost.toLocaleString()}
                </span>
              </div>
              {advancePaid > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sky-600 flex items-center gap-2">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Advance Paid
                  </span>
                  <span className="text-sky-600 font-semibold">
                    - Rs. {advancePaid.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-sky-200">
              <div className="flex justify-between items-center">
                <span className="text-lg text-slate-700">Balance Due</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">
                  Rs. {balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { method: "CASH", icon: "💵", label: "Cash" },
                  { method: "CARD", icon: "💳", label: "Card" },
                ] as const
              ).map(({ method, icon, label }) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${paymentMethod === method ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25" : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"}`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
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

          {/* Quick Amounts */}
          {paymentMethod === "CASH" && (
            <div>
              <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
                Quick Select
              </label>
              <div className="grid grid-cols-5 gap-2">
                {getQuickAmounts().map((amt) => (
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
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs text-slate-600 uppercase tracking-wider mb-2">
              {paymentMethod === "CASH"
                ? "Amount Received"
                : "Amount to Charge"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xl">
                Rs.
              </span>
              <input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className={`w-full pl-14 pr-4 py-4 bg-white rounded-2xl text-slate-800 text-3xl text-center font-bold border-2 transition-all ${amountReceived && isValidAmount ? "border-sky-500/50 focus:border-sky-500" : amountReceived && !isValidAmount ? "border-red-500/50 focus:border-red-500" : "border-sky-200 focus:border-sky-500"}`}
                placeholder="0"
                autoFocus
              />
              {paymentMethod !== "CASH" && balanceDue > 0 && (
                <button
                  onClick={() => setAmountReceived(String(balanceDue))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-600 text-sm rounded-lg transition-all"
                >
                  Exact
                </button>
              )}
            </div>
          </div>

          {/* Change Display */}
          {paymentMethod === "CASH" && isValidAmount && amountReceived && (
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
                  Rs. {change.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePayment(false)}
              disabled={
                loading ||
                !canCollectPayment ||
                !isValidAmount ||
                !amountReceived
              }
              className="py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed border border-sky-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "⏳ Processing..." : "Complete Only"}
            </button>
            <button
              onClick={() => handlePayment(true)}
              disabled={
                loading ||
                !canCollectPayment ||
                !isValidAmount ||
                !amountReceived
              }
              className="py-4 bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? "⏳ Processing..." : "✅ Complete & Print"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
