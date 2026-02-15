import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../../lib/api";
import { generateSaleReceiptHTML, printReceipt } from "../../../lib/receipt";
import type { SalesPanelProps } from "../../../types/pos";

interface SaleItem {
  _id: string;
  productName: string;
  sku?: string;
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Payment {
  method: string;
  amount: number;
  reference?: string;
}

interface Sale {
  _id: string;
  saleNumber: string;
  status: string;
  items: SaleItem[];
  payments: Payment[];
  customer?: { name?: string; phone?: string; email?: string };
  subtotal: number;
  discountType?: string;
  discountValue?: number;
  discountTotal: number;
  grandTotal: number;
  amountPaid: number;
  changeGiven: number;
  notes?: string;
  createdBy?: { username: string };
  voidedBy?: { username: string };
  voidReason?: string;
  voidedAt?: string;
  createdAt: string;
}

interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  cashTotal: number;
  cardTotal: number;
  voidedSales: number;
  totalDiscount: number;
}

type DateFilter = "today" | "7days" | "30days" | "all";

export function SalesPanel({ canVoidSale, onClose }: SalesPanelProps): JSX.Element {
  const [sales, setSales] = useState<Sale[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);
  const LIMIT = 15;

  // Use a ref to track filter values so fetchSales doesn't recreate on every render
  const filtersRef = useRef({ search, statusFilter, dateFilter, page });
  filtersRef.current = { search, statusFilter, dateFilter, page };

  const getDateRange = (filter: DateFilter): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    switch (filter) {
      case "today":
        return { startDate: today, endDate: today };
      case "7days": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return { startDate: d.toISOString().slice(0, 10), endDate: today };
      }
      case "30days": {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return { startDate: d.toISOString().slice(0, 10), endDate: today };
      }
      default:
        return {};
    }
  };

  const fetchSales = useCallback(async () => {
    const { search: s, statusFilter: sf, dateFilter: df, page: p } = filtersRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(LIMIT));
      if (s.trim()) params.set("search", s.trim());
      if (sf) params.set("status", sf);
      const { startDate, endDate } = getDateRange(df);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await api<any>(`/sales?${params.toString()}`);
      if (res.status === "success") {
        setSales(res.data?.sales || []);
        setTotalPages(res.pagination?.pages || 1);
        setTotalResults(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api<any>("/sales/daily");
      if (res.status === "success") {
        setDailySummary(res.data?.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSales();
    fetchSummary();
  }, []);

  // Re-fetch when filters change (debounced for search)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchSales();
  }, [page, search, statusFilter, dateFilter]);

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
        fetchSales();
        fetchSummary();
      }
    } catch {
      alert("Failed to void sale");
    }
  };

  const handlePrintReceipt = async (sale: Sale) => {
    try {
      const html = generateSaleReceiptHTML({
        saleNumber: sale.saleNumber,
        items: sale.items.map((i) => ({
          productName: i.productName || "Item",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
        subtotal: sale.subtotal,
        discountTotal: sale.discountTotal,
        grandTotal: sale.grandTotal,
        amountPaid: sale.amountPaid,
        changeGiven: sale.changeGiven,
      });
      await printReceipt(html);
    } catch (err) {
      console.error("Print failed:", err);
      alert("Failed to print receipt");
    }
  };

  const formatCurrency = (n: number) =>
    `Rs. ${n.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-sky-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Sales History</h3>
              <p className="text-xs text-slate-500">{totalResults} sale{totalResults !== 1 ? "s" : ""} found</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchSales(); fetchSummary(); }}
              className="p-2 rounded-lg bg-white border border-sky-200 text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition-all shadow-sm"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {dailySummary && (
          <div className="px-6 py-3 border-b border-sky-100/50 bg-white">
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
                <p className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider">Today's Sales</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{dailySummary.totalSales}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Revenue</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{formatCurrency(dailySummary.totalRevenue)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Cash</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{formatCurrency(dailySummary.cashTotal)}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Card</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{formatCurrency(dailySummary.cardTotal)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Voided</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{dailySummary.voidedSales}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-6 py-3 border-b border-sky-100/50 bg-white flex items-center gap-3 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sale #, customer..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-0.5">
            {([
              ["today", "Today"],
              ["7days", "7 Days"],
              ["30days", "30 Days"],
              ["all", "All"],
            ] as [DateFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDateFilter(val)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateFilter === val
                    ? "bg-white text-sky-600 shadow-sm border border-sky-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 text-slate-600"
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>

        {/* Sales List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-sky-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-slate-400">Loading sales...</p>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg className="w-16 h-16 mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium">No sales found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => {
                const isExpanded = expandedSaleId === sale._id;
                const isVoided = sale.status === "VOIDED";
                return (
                  <div
                    key={sale._id}
                    className={`rounded-xl border transition-all ${
                      isVoided
                        ? "bg-red-50/50 border-red-200/50 opacity-75"
                        : isExpanded
                        ? "bg-sky-50/50 border-sky-200 shadow-sm"
                        : "bg-white border-slate-100 hover:border-sky-200 hover:shadow-sm"
                    }`}
                  >
                    {/* Sale Row */}
                    <button
                      onClick={() => setExpandedSaleId(isExpanded ? null : sale._id)}
                      className="w-full px-4 py-3 flex items-center gap-4 text-left"
                    >
                      {/* Expand icon */}
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>

                      {/* Sale Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{sale.saleNumber}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              isVoided
                                ? "bg-red-100 text-red-600"
                                : "bg-emerald-100 text-emerald-600"
                            }`}
                          >
                            {sale.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400">{formatTime(sale.createdAt)}</span>
                          <span className="text-xs text-slate-400">{sale.items?.length || 0} items</span>
                          {sale.customer?.name && (
                            <span className="text-xs text-slate-500">{sale.customer.name}</span>
                          )}
                          {sale.createdBy?.username && (
                            <span className="text-xs text-slate-400">by {sale.createdBy.username}</span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-base font-bold ${isVoided ? "text-red-400 line-through" : "text-slate-800"}`}>
                          {formatCurrency(sale.grandTotal)}
                        </p>
                        {sale.payments?.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {sale.payments.map((p) => p.method).join(" + ")}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-sky-100/50">
                        {/* Sale Meta */}
                        <div className="grid grid-cols-3 gap-3 py-3 text-xs border-b border-slate-100">
                          <div>
                            <span className="text-slate-400">Date: </span>
                            <span className="text-slate-600 font-medium">{formatDate(sale.createdAt)}</span>
                          </div>
                          {sale.customer?.name && (
                            <div>
                              <span className="text-slate-400">Customer: </span>
                              <span className="text-slate-600 font-medium">{sale.customer.name}</span>
                              {sale.customer.phone && <span className="text-slate-400 ml-1">({sale.customer.phone})</span>}
                            </div>
                          )}
                          {sale.notes && (
                            <div>
                              <span className="text-slate-400">Notes: </span>
                              <span className="text-slate-600">{sale.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Items Table */}
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Items</p>
                          <div className="bg-slate-50 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-2 px-3 text-slate-500 font-semibold">Product</th>
                                  <th className="text-center py-2 px-3 text-slate-500 font-semibold w-16">Qty</th>
                                  <th className="text-right py-2 px-3 text-slate-500 font-semibold w-24">Price</th>
                                  <th className="text-right py-2 px-3 text-slate-500 font-semibold w-24">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items?.map((item, i) => (
                                  <tr key={item._id || i} className="border-b border-slate-100 last:border-0">
                                    <td className="py-2 px-3 text-slate-700">
                                      {item.productName}
                                      {item.serialNumber && (
                                        <span className="block text-[10px] text-slate-400">S/N: {item.serialNumber}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-2 px-3 text-right text-slate-800 font-medium">{formatCurrency(item.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Totals */}
                        <div className="mt-3 flex justify-between items-start">
                          <div className="flex gap-2">
                            {/* Print button */}
                            <button
                              onClick={() => handlePrintReceipt(sale)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sky-50 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-100 transition-all font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Print Receipt
                            </button>

                            {/* Void button */}
                            {canVoidSale && sale.status === "COMPLETED" && (
                              <>
                                {voidingSaleId === sale._id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      value={voidReason}
                                      onChange={(e) => setVoidReason(e.target.value)}
                                      placeholder="Void reason..."
                                      className="px-3 py-1.5 text-xs bg-white border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 w-48 text-slate-700"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleVoidSale(sale._id)}
                                      className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => { setVoidingSaleId(null); setVoidReason(""); }}
                                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setVoidingSaleId(sale._id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100 transition-all font-medium"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Void Sale
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          <div className="text-right text-xs space-y-1">
                            <div className="flex justify-between gap-6">
                              <span className="text-slate-400">Subtotal</span>
                              <span className="text-slate-600">{formatCurrency(sale.subtotal)}</span>
                            </div>
                            {sale.discountTotal > 0 && (
                              <div className="flex justify-between gap-6">
                                <span className="text-sky-500">Discount</span>
                                <span className="text-sky-500">-{formatCurrency(sale.discountTotal)}</span>
                              </div>
                            )}
                            <div className="flex justify-between gap-6 text-sm font-bold border-t border-slate-200 pt-1">
                              <span className="text-slate-800">Total</span>
                              <span className="text-slate-800">{formatCurrency(sale.grandTotal)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-slate-400">Paid</span>
                              <span className="text-slate-600">{formatCurrency(sale.amountPaid)}</span>
                            </div>
                            {sale.changeGiven > 0 && (
                              <div className="flex justify-between gap-6">
                                <span className="text-slate-400">Change</span>
                                <span className="text-slate-600">{formatCurrency(sale.changeGiven)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Void info */}
                        {isVoided && sale.voidReason && (
                          <div className="mt-3 p-2.5 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-0.5">Void Reason</p>
                            <p className="text-xs text-red-600">{sale.voidReason}</p>
                            {sale.voidedBy?.username && (
                              <p className="text-[10px] text-red-400 mt-1">
                                Voided by {sale.voidedBy.username} {sale.voidedAt && `on ${formatDate(sale.voidedAt)}`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-sky-100 bg-white flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-slate-400">
              Page {page} of {totalPages} ({totalResults} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-600"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
