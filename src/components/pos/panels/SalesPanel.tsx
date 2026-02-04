import { useState } from "react";
import { api } from "../../../lib/api";
import type { SalesPanelProps } from "../../../types/pos";

export function SalesPanel({
  salesData,
  dailySummary,
  loading,
  canVoidSale,
  onClose,
  onRefresh,
}: SalesPanelProps): JSX.Element {
  const [voidReason, setVoidReason] = useState<string>("");
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);

  const handleVoidSale = async (saleId: string) => {
    if (!voidReason.trim()) {
      alert("Please enter void reason");
      return;
    }
    try {
      const res = await api<any>(`/sales/${saleId}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: voidReason }),
      });
      if (res.status === "success") {
        alert("Sale voided!");
        setVoidingSaleId(null);
        setVoidReason("");
        onRefresh();
      }
    } catch {
      alert("Failed to void");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] border border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 flex justify-between">
          <h3 className="text-xl font-bold text-white">📊 Sales Report</h3>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="p-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600">
              🔄
            </button>
            <button onClick={onClose} className="p-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600">
              ✕
            </button>
          </div>
        </div>

        {dailySummary && (
          <div className="p-4 grid grid-cols-4 gap-3 border-b border-slate-700">
            <div className="bg-cyan-500/20 rounded-xl p-3">
              <p className="text-xs text-cyan-400">Today's Sales</p>
              <p className="text-2xl font-bold text-white">{dailySummary.totalSales || 0}</p>
            </div>
            <div className="bg-green-500/20 rounded-xl p-3">
              <p className="text-xs text-green-400">Revenue</p>
              <p className="text-2xl font-bold text-white">Rs. {(dailySummary.totalRevenue || 0).toLocaleString()}</p>
            </div>
            <div className="bg-purple-500/20 rounded-xl p-3">
              <p className="text-xs text-purple-400">Cash</p>
              <p className="text-2xl font-bold text-white">Rs. {(dailySummary.cashTotal || 0).toLocaleString()}</p>
            </div>
            <div className="bg-red-500/20 rounded-xl p-3">
              <p className="text-xs text-red-400">Voided</p>
              <p className="text-2xl font-bold text-white">{dailySummary.voidedSales || 0}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : salesData.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No sales found</p>
          ) : (
            <div className="space-y-2">
              {salesData.map((sale) => (
                <div key={sale._id} className={`bg-slate-700/30 rounded-lg p-3 ${sale.status === "VOIDED" ? "opacity-50" : ""}`}>
                  <div className="flex justify-between">
                    <div>
                      <span className="text-white font-medium">{sale.saleNumber}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${sale.status === "COMPLETED" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {sale.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(sale.createdAt).toLocaleString()} • {sale.items?.length || 0} items
                      </p>
                    </div>
                    <p className="text-lg font-bold text-cyan-400">Rs. {sale.grandTotal?.toFixed(2)}</p>
                  </div>
                  {canVoidSale && sale.status === "COMPLETED" && (
                    <div className="mt-2 pt-2 border-t border-slate-600/30">
                      {voidingSaleId === sale._id ? (
                        <div className="flex gap-2">
                          <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Void reason..." className="flex-1 px-3 py-1 bg-slate-700 rounded text-white text-sm" />
                          <button onClick={() => handleVoidSale(sale._id)} className="px-3 py-1 bg-red-500 rounded text-white text-sm">Void</button>
                          <button onClick={() => setVoidingSaleId(null)} className="px-3 py-1 bg-slate-600 rounded text-white text-sm">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setVoidingSaleId(sale._id)} className="text-xs text-red-400 hover:text-red-300">Void Sale</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
