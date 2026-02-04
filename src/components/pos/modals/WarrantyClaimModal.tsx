import { useState } from "react";
import { api } from "../../../lib/api";
import type { WarrantyClaimModalProps } from "../../../types/pos";

export function WarrantyClaimModal({
  warranty,
  onClose,
  onSuccess,
}: WarrantyClaimModalProps): JSX.Element {
  const [issue, setIssue] = useState<string>("");
  const [resolution, setResolution] = useState<"REPAIR" | "REPLACE" | "REFUND">(
    "REPAIR",
  );
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [result, setResult] = useState<{
    claimNumber?: string;
    resolutionResult?: {
      createdRepairJob?: string;
      linkedRepairJob?: string;
      replacedProduct?: string;
      stockDeducted?: number;
      claimCost?: number;
      refundAmount?: number;
      returnNumber?: string;
      warrantyVoided?: boolean;
    };
  } | null>(null);

  const resolutionInfo = {
    REPAIR: {
      icon: "🔧",
      title: "Repair",
      description: "Create a repair job for the technician to fix the product",
      color: "from-blue-500 to-cyan-500",
    },
    REPLACE: {
      icon: "🔄",
      title: "Replace",
      description: "Deduct a new product from inventory as replacement",
      color: "from-emerald-500 to-green-500",
    },
    REFUND: {
      icon: "💰",
      title: "Refund",
      description: "Refund the customer and void this warranty",
      color: "from-amber-500 to-orange-500",
    },
  };

  const handleSubmit = async () => {
    if (!issue.trim()) {
      setError("Please describe the issue");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await api<{
        status: string;
        message?: string;
        data?: { newClaim?: { claimNumber: string }; resolutionResult?: any };
      }>(`/warranties/${warranty._id}/claims`, {
        method: "POST",
        body: JSON.stringify({
          issue: issue.trim(),
          resolution,
          notes: notes.trim() || undefined,
        }),
      });

      if (data.status === "success") {
        setSuccess(true);
        setResult({
          claimNumber: data.data?.newClaim?.claimNumber,
          resolutionResult: data.data?.resolutionResult,
        });
      } else {
        setError(data.message || "Failed to create claim");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create claim");
    } finally {
      setLoading(false);
    }
  };

  if (success && result) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl w-full max-w-lg overflow-hidden border border-sky-200 shadow-2xl">
          <div className="p-6 bg-gradient-to-r from-sky-500/20 to-blue-500/20 border-b border-sky-200">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full flex items-center justify-center text-3xl animate-pulse">
                ✓
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-800 text-center mt-4">
              Claim Created Successfully!
            </h2>
            <p className="text-slate-600 text-center mt-1">
              {result.claimNumber && (
                <span className="text-sky-600">{result.claimNumber}</span>
              )}
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div
              className={`p-4 rounded-xl bg-gradient-to-r ${resolutionInfo[resolution].color}/10 border border-sky-200`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">
                  {resolutionInfo[resolution].icon}
                </span>
                <span className="font-bold text-slate-800">
                  {resolutionInfo[resolution].title} Resolution
                </span>
              </div>

              {resolution === "REPAIR" && result.resolutionResult && (
                <div className="space-y-2 text-sm">
                  {result.resolutionResult.createdRepairJob && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">New Repair Job:</span>
                      <span className="text-sky-600 font-mono">
                        {result.resolutionResult.createdRepairJob}
                      </span>
                    </div>
                  )}
                  <p className="text-slate-600 mt-2 text-xs">
                    📋 Technician can find this job in the Repairs panel
                  </p>
                </div>
              )}

              {resolution === "REPLACE" && result.resolutionResult && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Replaced Product:</span>
                    <span className="text-sky-600">
                      {result.resolutionResult.replacedProduct}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Stock Deducted:</span>
                    <span className="text-slate-800">
                      {result.resolutionResult.stockDeducted} unit
                    </span>
                  </div>
                  <p className="text-slate-600 mt-2 text-xs">
                    📦 Give the replacement product to the customer
                  </p>
                </div>
              )}

              {resolution === "REFUND" && result.resolutionResult && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Refund Amount:</span>
                    <span className="text-sky-600 font-bold">
                      ₹{result.resolutionResult.refundAmount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Return Number:</span>
                    <span className="text-sky-600 font-mono">
                      {result.resolutionResult.returnNumber}
                    </span>
                  </div>
                  {result.resolutionResult.warrantyVoided && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Warranty Status:</span>
                      <span className="text-red-500">VOIDED</span>
                    </div>
                  )}
                  <p className="text-slate-600 mt-2 text-xs">
                    💰 Process the refund payment to the customer
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-sky-200">
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white font-bold rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl w-full max-w-lg overflow-hidden border border-sky-200 shadow-2xl">
        <div className="p-5 border-b border-sky-200 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              📋 Create Warranty Claim
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-xl text-slate-600 hover:text-slate-800 transition-all"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            <span className="text-sky-600">{warranty.warrantyNumber}</span> -{" "}
            {warranty.product?.name || "Product"}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Issue Description *
            </label>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="Describe the customer's issue..."
              rows={3}
              className="w-full px-4 py-3 bg-white border border-sky-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Resolution
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["REPAIR", "REPLACE", "REFUND"] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`py-3 rounded-xl font-semibold transition-all ${resolution === res ? `bg-gradient-to-r ${resolutionInfo[res].color} text-white` : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"}`}
                >
                  {resolutionInfo[res].icon} {resolutionInfo[res].title}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600 text-center">
              {resolutionInfo[resolution].description}
            </p>
          </div>

          {resolution === "REPLACE" && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-700 text-sm flex items-start gap-2">
              <span>📦</span>
              <span>
                This will deduct 1 unit of{" "}
                <strong>{warranty.product?.name || "this product"}</strong> from
                inventory.
              </span>
            </div>
          )}
          {resolution === "REFUND" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>
                This will <strong>void the warranty</strong> and create a refund
                record. This action cannot be undone.
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-4 py-3 bg-white border border-sky-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-sky-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-all border border-sky-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !issue.trim()}
            className={`flex-1 py-3 bg-gradient-to-r ${resolutionInfo[resolution].color} text-white font-bold rounded-xl disabled:opacity-50 transition-all`}
          >
            {loading
              ? "Creating..."
              : `Create ${resolutionInfo[resolution].title} Claim`}
          </button>
        </div>
      </div>
    </div>
  );
}
