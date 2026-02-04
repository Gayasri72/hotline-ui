import { useState } from "react";
import { apiGet, apiPost } from "../../../lib/api";
import type { ReturnsPanelProps } from "../../../types/pos";

export function ReturnsPanel({ onClose }: ReturnsPanelProps): JSX.Element {
  const [saleNumber, setSaleNumber] = useState<string>("");
  const [sale, setSale] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<{
    [key: string]: { selected: boolean; quantity: number };
  }>({});
  const [reason, setReason] = useState<string>("CHANGED_MIND");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const searchSale = async () => {
    if (!saleNumber.trim()) return;
    setSearchLoading(true);
    setError(null);
    setSale(null);
    setSelectedItems({});

    try {
      const response = await apiGet<any>(`/sales/number/${saleNumber.trim()}`);
      if (response.status === "success" && response.data?.sale) {
        const foundSale = response.data.sale;
        setSale(foundSale);
        const initialSelection: {
          [key: string]: { selected: boolean; quantity: number };
        } = {};
        foundSale.items?.forEach((item: any) => {
          initialSelection[item._id] = {
            selected: false,
            quantity: item.quantity,
          };
        });
        setSelectedItems(initialSelection);
      } else {
        setError("Sale not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to find sale");
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected },
    }));
  };

  const updateReturnQuantity = (
    itemId: string,
    qty: number,
    maxQty: number,
  ) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.max(1, Math.min(qty, maxQty)),
      },
    }));
  };

  const calculateRefund = () => {
    if (!sale?.items) return 0;
    return sale.items.reduce((total: number, item: any) => {
      const selection = selectedItems[item._id];
      if (selection?.selected) {
        return total + (item.unitPrice || 0) * selection.quantity;
      }
      return total;
    }, 0);
  };

  const processReturn = async () => {
    if (!sale) return;
    const itemsToReturn = sale.items
      .filter((item: any) => selectedItems[item._id]?.selected)
      .map((item: any) => ({
        saleItemId: item._id,
        quantity: selectedItems[item._id]?.quantity || item.quantity,
      }));

    if (itemsToReturn.length === 0) {
      setError("Please select at least one item to return");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiPost<any>("/returns", {
        originalSaleId: sale._id,
        items: itemsToReturn,
        reason,
        refundMethod: "CASH",
      });
      if (response.status === "success") {
        setSuccess(
          `Return processed! Refund: Rs. ${response.data?.return?.refundAmount?.toFixed(2)}`,
        );
        setSale(null);
        setSelectedItems({});
        setSaleNumber("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  const refundAmount = calculateRefund();
  const hasSelectedItems = Object.values(selectedItems).some((s) => s.selected);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl border border-sky-200/50 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col rounded-2xl">
        <div className="p-4 border-b border-sky-200/50 bg-white/95 backdrop-blur-xl flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            ↩️ Process Return
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={saleNumber}
              onChange={(e) => setSaleNumber(e.target.value)}
              placeholder="Enter Sale Number (e.g., SL-20260128-0001)"
              className="flex-1 px-4 py-2.5 bg-white border border-sky-200/50 rounded-xl text-slate-800 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              onKeyDown={(e) => e.key === "Enter" && searchSale()}
            />
            <button
              onClick={searchSale}
              disabled={searchLoading || !saleNumber.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {searchLoading ? "⏳" : "🔍 Find"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
              {success}
            </div>
          )}

          {sale && (
            <>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-sky-200/50 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Sale #</span>
                  <span className="text-slate-800 font-mono">
                    {sale.saleNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Date</span>
                  <span className="text-slate-800">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total</span>
                  <span className="text-sky-600 font-bold">
                    Rs. {sale.grandTotal?.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-600 uppercase">
                  Items to Return
                </h4>
                {sale.items?.map((item: any) => (
                  <div
                    key={item._id}
                    className={`bg-white/80 backdrop-blur-sm rounded-lg p-3 border-2 cursor-pointer transition-all shadow-sm ${selectedItems[item._id]?.selected ? "border-sky-500" : "border-sky-100"}`}
                    onClick={() => toggleItem(item._id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedItems[item._id]?.selected ? "bg-sky-500 border-sky-500" : "border-slate-300"}`}
                      >
                        {selectedItems[item._id]?.selected && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-800 font-medium">
                          {item.productName || "Product"}
                        </p>
                        <p className="text-slate-500 text-sm">
                          Rs. {item.unitPrice?.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      {selectedItems[item._id]?.selected && (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-slate-500 text-sm">Qty:</span>
                          <input
                            type="number"
                            value={
                              selectedItems[item._id]?.quantity || item.quantity
                            }
                            onChange={(e) =>
                              updateReturnQuantity(
                                item._id,
                                parseInt(e.target.value) || 1,
                                item.quantity,
                              )
                            }
                            className="w-16 text-center bg-sky-50 border border-sky-200 rounded py-1 text-slate-800 text-sm"
                            min="1"
                            max={item.quantity}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 uppercase block mb-2">
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-sky-200/50 rounded-xl text-slate-800 shadow-sm focus:border-sky-500"
                >
                  <option value="DEFECTIVE">Defective Product</option>
                  <option value="WRONG_ITEM">Wrong Item</option>
                  <option value="CHANGED_MIND">Customer Changed Mind</option>
                  <option value="NOT_AS_DESCRIBED">Not as Described</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {hasSelectedItems && (
                <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-200/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sky-700 font-medium">
                      Refund Amount
                    </span>
                    <span className="text-2xl font-bold text-sky-600">
                      Rs. {refundAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-sky-200/50 flex gap-3 bg-white/80">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={processReturn}
            disabled={loading || !hasSelectedItems}
            className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? "⏳ Processing..." : "↩️ Process Return"}
          </button>
        </div>
      </div>
    </div>
  );
}
