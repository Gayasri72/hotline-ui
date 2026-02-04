import { useState } from "react";
import { api } from "../../../lib/api";
import type { WarrantyPanelProps, Warranty } from "../../../types/pos";

export function WarrantyPanel({
  onClose,
  canCreateClaim,
  onCreateClaim,
}: WarrantyPanelProps): JSX.Element {
  const [searchPhone, setSearchPhone] = useState<string>("");
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const searchWarranties = async () => {
    if (!searchPhone.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api<{
        status: string;
        data?: { warranties: Warranty[] };
      }>(`/warranties/customer/${encodeURIComponent(searchPhone.trim())}`);
      if (data.status === "success" && data.data?.warranties) {
        setWarranties(data.data.warranties);
      } else {
        setWarranties([]);
      }
    } catch (err) {
      console.error("Error searching warranties:", err);
      setWarranties([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "EXPIRED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "CLAIMED":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "VOID":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-sky-200/50 shadow-2xl flex flex-col rounded-3xl">
        <div className="p-5 border-b border-sky-200/50 bg-white/95 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              🛡️ Warranty Lookup
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 rounded-xl text-slate-500 hover:text-red-500 transition-all"
            >
              ✕
            </button>
          </div>
          
          <div className="mt-4 flex gap-2">
            <input
              type="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchWarranties()}
              placeholder="Enter customer phone number..."
              className="flex-1 px-4 py-3 bg-white border border-sky-200/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-sm"
            />
            <button
              onClick={searchWarranties}
              disabled={loading || !searchPhone.trim()}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold rounded-xl hover:from-sky-600 hover:to-blue-600 disabled:opacity-50 transition-all shadow-md"
            >
              {loading ? "..." : "🔍 Search"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="text-center py-10 text-slate-500">
              <div className="animate-spin w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full mx-auto mb-3"></div>
              Searching warranties...
            </div>
          )}

          {!loading && searched && warranties.length === 0 && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-slate-500">
                No warranties found for this phone number
              </p>
            </div>
          )}

          {!loading &&
            warranties.map((warranty) => {
              const daysRemaining = getDaysRemaining(warranty.endDate);
              const isActive =
                warranty.status === "ACTIVE" && daysRemaining > 0;

              return (
                <div
                  key={warranty._id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-sky-200/50 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 transition-all shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-slate-500 font-mono">
                        {warranty.warrantyNumber}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {warranty.product?.name ||
                          warranty.productName ||
                          "Unknown Product"}
                      </h3>
                      {warranty.serialNumber && (
                        <p className="text-sm text-slate-500">
                          SN: {warranty.serialNumber}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(warranty.status)}`}
                    >
                      {warranty.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-slate-500">Customer:</span>
                      <span className="text-slate-800 ml-2">
                        {warranty.customer?.name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Phone:</span>
                      <span className="text-slate-800 ml-2">
                        {warranty.customer?.phone || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Type:</span>
                      <span className="text-sky-600 ml-2">
                        {warranty.warrantyType}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Expires:</span>
                      <span
                        className={`ml-2 ${daysRemaining > 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {new Date(warranty.endDate).toLocaleDateString()}
                        {daysRemaining > 0 && ` (${daysRemaining} days left)`}
                      </span>
                    </div>
                  </div>

                  {warranty.claims && warranty.claims.length > 0 && (
                    <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-amber-600 text-xs font-semibold">
                        {warranty.claims.length} claim(s) on record
                      </span>
                    </div>
                  )}

                  {canCreateClaim && isActive && (
                    <button
                      onClick={() => onCreateClaim(warranty)}
                      className="w-full py-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold rounded-xl hover:from-sky-600 hover:to-blue-600 transition-all shadow-md"
                    >
                      📋 Create Claim
                    </button>
                  )}
                </div>
              );
            })}

          {!searched && !loading && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-slate-500">
                Enter a customer phone number to search for warranties
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
