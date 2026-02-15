import { useState, useEffect, useRef, useCallback } from "react";
import { api, apiPost } from "../../../lib/api";
import type { ReturnsPanelProps } from "../../../types/pos";

interface SearchResult {
  _id: string;
  saleNumber: string;
  grandTotal: number;
  status: string;
  items: any[];
  customer?: { name?: string; phone?: string };
  createdAt: string;
}

export function ReturnsPanel({ onClose }: ReturnsPanelProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sale, setSale] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<{
    [key: string]: { selected: boolean; quantity: number };
  }>({});
  const [reason, setReason] = useState<string>("CHANGED_MIND");
  const [customReason, setCustomReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live search with debounce
  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api<any>(
        `/sales?search=${encodeURIComponent(query.trim())}&limit=8&status=COMPLETED`,
      );
      if (res.status === "success") {
        setSearchResults(res.data?.sales || []);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (searchQuery.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => performSearch(searchQuery), 300);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, performSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSale = (selectedSale: SearchResult) => {
    setSale(selectedSale);
    setSearchQuery(selectedSale.saleNumber);
    setShowDropdown(false);
    setError(null);
    setSuccess(null);
    const initialSelection: {
      [key: string]: { selected: boolean; quantity: number };
    } = {};
    selectedSale.items?.forEach((item: any) => {
      initialSelection[item._id] = { selected: false, quantity: item.quantity };
    });
    setSelectedItems(initialSelection);
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
      const finalReason =
        reason === "OTHER" && customReason.trim()
          ? `OTHER: ${customReason.trim()}`
          : reason;
      const response = await apiPost<any>("/returns", {
        originalSaleId: sale._id,
        items: itemsToReturn,
        reason: finalReason,
        refundMethod: "CASH",
      });
      if (response.status === "success") {
        setSuccess(
          `Return processed! Refund: Rs. ${response.data?.return?.refundAmount?.toFixed(2)}`,
        );
        setSale(null);
        setSelectedItems({});
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  const refundAmount = calculateRefund();
  const hasSelectedItems = Object.values(selectedItems).some((s) => s.selected);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-amber-200/60 text-amber-800 font-semibold rounded px-0.5">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl border border-sky-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-200">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Process Return
              </h3>
              <p className="text-xs text-slate-500">
                Search sales and process returns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Search */}
          <div className="w-1/2 border-r border-sky-100 p-6 overflow-y-auto">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 block">
              Find Sale
            </label>

            <div ref={dropdownRef} className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (sale) {
                    setSale(null);
                    setSelectedItems({});
                  }
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Sale number, customer name..."
                className="w-full pl-12 pr-10 py-2.5 bg-white border-2 border-sky-100 rounded-lg text-slate-800 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-sm"
                autoFocus
              />
              {searchLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!searchLoading && searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSale(null);
                    setSelectedItems({});
                    setSearchResults([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Help text */}
            {!sale && !showDropdown && searchQuery.length < 2 && (
              <p className="mt-2 text-xs text-slate-500 px-1">
                Enter sale number or customer name to find completed sales
              </p>
            )}

            {/* Search Results */}
            <div className="mt-3 space-y-1.5">
              {searchLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {searchQuery.length >= 2 &&
                !searchLoading &&
                searchResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-400 bg-slate-50 rounded-lg">
                    No matching sales found
                  </div>
                )}
              {searchResults.map((s) => (
                <button
                  key={s._id}
                  onClick={() => selectSale(s)}
                  className={`w-full px-3 py-2.5 flex items-start gap-3 rounded-lg transition-all text-left border ${
                    sale?._id === s._id
                      ? "bg-sky-50 border-sky-400 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-sky-50 hover:border-sky-300"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 font-mono">
                        {highlightMatch(s.saleNumber, searchQuery)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(s.createdAt).toLocaleDateString("en-LK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {s.customer?.name && (
                        <div className="text-slate-600 font-medium">
                          {highlightMatch(s.customer.name, searchQuery)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-sky-600 flex-shrink-0">
                    Rs.{" "}
                    {s.grandTotal?.toLocaleString("en-LK", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side - Details */}
          <div className="w-1/2 p-6 overflow-y-auto space-y-4">
            {/* Status Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                {success}
              </div>
            )}

            {sale && (
              <>
                {/* Selected Sale Info */}
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg p-4 border border-sky-200">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">
                    Sale Details
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Sale #</span>
                      <span className="text-slate-800 font-mono font-bold text-sm">
                        {sale.saleNumber}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Date</span>
                      <span className="text-slate-800 text-sm">
                        {new Date(sale.createdAt).toLocaleDateString("en-LK", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {sale.customer?.name && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Customer</span>
                        <span className="text-slate-800 text-sm font-medium">
                          {sale.customer.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5 border-t border-sky-200">
                      <span className="text-slate-600 text-sm font-semibold">
                        Total
                      </span>
                      <span className="text-sky-600 font-bold text-lg">
                        Rs. {sale.grandTotal?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items to return */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Select Items to Return
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                    {sale.items?.map((item: any) => (
                      <div
                        key={item._id}
                        className={`bg-white rounded-lg p-3 border-2 cursor-pointer transition-all ${
                          selectedItems[item._id]?.selected
                            ? "border-sky-500 bg-sky-50"
                            : "border-slate-200 hover:border-sky-300"
                        }`}
                        onClick={() => toggleItem(item._id)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
                              selectedItems[item._id]?.selected
                                ? "bg-sky-500 border-sky-500"
                                : "border-slate-300 hover:border-sky-400"
                            }`}
                          >
                            {selectedItems[item._id]?.selected && (
                              <svg
                                className="w-3 h-3 text-white"
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
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-800 font-medium text-sm">
                              {item.productName || "Product"}
                            </p>
                            <p className="text-slate-500 text-xs mt-0.5">
                              Rs. {item.unitPrice?.toFixed(2)} x {item.quantity}{" "}
                              units
                            </p>
                          </div>
                          {selectedItems[item._id]?.selected && (
                            <div
                              className="flex items-center gap-1 flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-slate-500 text-xs">
                                Qty:
                              </span>
                              <input
                                type="number"
                                value={
                                  selectedItems[item._id]?.quantity ||
                                  item.quantity
                                }
                                onChange={(e) =>
                                  updateReturnQuantity(
                                    item._id,
                                    parseInt(e.target.value) || 1,
                                    item.quantity,
                                  )
                                }
                                className="w-12 text-center bg-sky-50 border border-sky-300 rounded py-0.5 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300"
                                min="1"
                                max={item.quantity}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Return Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (e.target.value !== "OTHER") setCustomReason("");
                    }}
                    className="w-full px-3 py-2 bg-white border-2 border-sky-100 rounded-lg text-slate-800 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-medium transition-all"
                  >
                    <option value="DEFECTIVE">Defective Product</option>
                    <option value="WRONG_ITEM">Wrong Item</option>
                    <option value="CHANGED_MIND">Customer Changed Mind</option>
                    <option value="NOT_AS_DESCRIBED">Not as Described</option>
                    <option value="OTHER">Other (specify below)</option>
                  </select>
                  {reason === "OTHER" && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Please describe the return reason..."
                      className="w-full mt-2 px-3 py-2 bg-white border-2 border-sky-100 rounded-lg text-slate-800 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder-slate-400"
                      autoFocus
                    />
                  )}
                </div>

                {/* Refund Amount */}
                {hasSelectedItems && (
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border-2 border-emerald-200 mt-4">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Refund Amount
                    </p>
                    <p className="text-3xl font-bold text-emerald-600">
                      Rs. {refundAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </>
            )}
            {!sale && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <p className="text-sm">Select a sale to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sky-100 flex gap-3 bg-slate-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg transition-all text-sm font-bold shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={processReturn}
            disabled={loading || !hasSelectedItems}
            className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md text-sm"
          >
            {loading ? "Processing..." : "Process Return"}
          </button>
        </div>
      </div>
    </div>
  );
}
