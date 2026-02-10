import { useState } from "react";
import {
  generateDeviceReceivedReceiptHTML,
  printReceipt,
} from "../../../lib/receipt";
import type { RepairsPanelProps, RepairJob } from "../../../types/pos";

export function RepairsPanel({
  repairs,
  loading,
  onClose,
  onRefresh,
  onCollectPayment,
}: RepairsPanelProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [activeStatus, setActiveStatus] = useState<string>("READY");

  const statusCounts = {
    RECEIVED: repairs.filter((r) => r.status === "RECEIVED").length,
    IN_PROGRESS: repairs.filter((r) => r.status === "IN_PROGRESS").length,
    READY: repairs.filter((r) => r.status === "READY").length,
  };

  const filteredRepairs = repairs.filter((repair) => {
    const matchesSearch =
      repair.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.customer.phone.includes(searchQuery) ||
      repair.device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.device.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === "ALL" || repair.priority === filterPriority;
    const matchesStatus = repair.status === activeStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const readyRepairs = repairs.filter((r) => r.status === "READY");
  const totalBalance = readyRepairs.reduce(
    (sum, r) => sum + Math.max(0, (r.totalCost || 0) - (r.advancePayment || 0)),
    0,
  );
  const urgentCount = filteredRepairs.filter(
    (r) => r.priority === "URGENT",
  ).length;
  const highCount = filteredRepairs.filter((r) => r.priority === "HIGH").length;

  const printDeviceReceivedReceipt = async (repair: RepairJob) => {
    const receiptHTML = generateDeviceReceivedReceiptHTML(repair);
    await printReceipt(receiptHTML);
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return {
          bg: "bg-gradient-to-r from-red-500/20 to-rose-500/20",
          border: "border-red-500/40",
          badge: "bg-red-500 text-white",
          glow: "shadow-red-500/20",
        };
      case "HIGH":
        return {
          bg: "bg-gradient-to-r from-orange-500/20 to-amber-500/20",
          border: "border-orange-500/40",
          badge: "bg-orange-500 text-white",
          glow: "shadow-orange-500/20",
        };
      default:
        return {
          bg: "bg-gradient-to-r from-emerald-500/10 to-teal-500/10",
          border: "border-emerald-500/30",
          badge: "bg-emerald-500 text-white",
          glow: "shadow-emerald-500/20",
        };
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return {
          icon: "📥",
          label: "Received",
          color: "text-blue-400",
          bgColor: "bg-blue-500/20",
          borderColor: "border-blue-500/30",
        };
      case "IN_PROGRESS":
        return {
          icon: "⚙️",
          label: "In Progress",
          color: "text-amber-400",
          bgColor: "bg-amber-500/20",
          borderColor: "border-amber-500/30",
        };
      case "READY":
        return {
          icon: "✅",
          label: "Ready",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/20",
          borderColor: "border-emerald-500/30",
        };
      default:
        return {
          icon: "📋",
          label: status,
          color: "text-slate-400",
          bgColor: "bg-slate-500/20",
          borderColor: "border-slate-500/30",
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-5xl max-h-[92vh] border border-sky-200/50 flex flex-col shadow-2xl overflow-hidden rounded-3xl">
        {/* Header */}
        <div className="relative bg-white/95 backdrop-blur-xl border-b border-sky-200/50">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-blue-500/5 to-sky-500/5"></div>
          <div className="relative px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
                <span className="text-2xl">🔧</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-bold text-slate-800">
                  Repair Jobs
                </h3>
                <p className="text-slate-500 text-sm">
                  View and manage all repair jobs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0 z-10">
              <button
                onClick={onRefresh}
                className="p-2.5 bg-white/60 hover:bg-sky-50 rounded-lg text-slate-500 hover:text-sky-600 transition-all hover:rotate-180 duration-500 border border-sky-200/50 shadow-sm"
                title="Refresh"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2.5 bg-white/60 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-500 transition-all border border-sky-200/50 shadow-sm"
                title="Close"
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
        </div>

        {/* Status Tabs */}
        <div className="px-5 py-3 border-b border-sky-200/50 bg-white/80">
          <div className="flex items-center gap-2">
            {(["RECEIVED", "IN_PROGRESS", "READY"] as const).map((status) => {
              const styles = getStatusStyles(status);
              const count = statusCounts[status];
              const isActive = activeStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${isActive ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25" : "bg-white/60 text-slate-600 hover:bg-sky-50 hover:text-sky-600 border border-sky-200/50"}`}
                >
                  <span>{styles.icon}</span>
                  <span>{styles.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? "bg-white/20" : "bg-slate-200"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats & Filters */}
        <div className="px-5 py-4 border-b border-sky-200/50 bg-white/60">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-xl border border-sky-200/50">
                <span className="text-slate-500 text-sm">Showing:</span>
                <span className="text-sky-700 font-bold text-lg">
                  {filteredRepairs.length}
                </span>
              </div>
              {urgentCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-xl border border-red-500/30">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-red-400 font-medium">
                    {urgentCount} Urgent
                  </span>
                </div>
              )}
              {highCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 rounded-xl border border-orange-500/30">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="text-orange-400 font-medium">
                    {highCount} High
                  </span>
                </div>
              )}
              {activeStatus === "READY" && totalBalance > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <span className="text-emerald-400 text-sm">Collectible:</span>
                  <span className="text-emerald-400 font-bold">
                    Rs. {totalBalance.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jobs, customers..."
                  className="w-64 pl-10 pr-4 py-2.5 bg-white border border-sky-200/50 rounded-xl text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-sm"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
              </div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2.5 bg-white border border-sky-200/50 rounded-xl text-slate-700 focus:border-sky-500 transition-all cursor-pointer shadow-sm"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">🔴 Urgent Only</option>
                <option value="HIGH">🟠 High Only</option>
                <option value="NORMAL">🟢 Normal Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-500/30 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-500 mt-4">Loading repairs...</p>
            </div>
          ) : repairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
                <span className="text-5xl">✨</span>
              </div>
              <h4 className="text-xl font-semibold text-slate-800 mb-2">
                All Caught Up!
              </h4>
              <p className="text-slate-500 text-center max-w-md">
                No repairs are currently ready for payment. Completed repairs
                will appear here automatically.
              </p>
              <button
                onClick={onRefresh}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-xl transition-all shadow-md flex items-center gap-2"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Check Again
              </button>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-sky-100 flex items-center justify-center mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <p className="text-slate-500">No repairs match your search</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterPriority("ALL");
                }}
                className="mt-4 text-sky-600 hover:text-sky-700 text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRepairs.map((repair) => {
                const styles = getPriorityStyles(repair.priority);
                const balanceDue = Math.max(
                  0,
                  (repair.totalCost || 0) - (repair.advancePayment || 0),
                );

                return (
                  <div
                    key={repair._id}
                    className="bg-white/80 backdrop-blur-sm border border-sky-200/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-300/50 transition-all duration-300 group"
                  >
                    <div className="flex gap-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-xl font-bold text-slate-800 tracking-wide">
                            {repair.jobNumber}
                          </span>
                          <span
                            className={`${styles.badge} px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider`}
                          >
                            {repair.priority}
                          </span>
                          {(() => {
                            const statusStyle = getStatusStyles(repair.status);
                            return (
                              <span
                                className={`px-2.5 py-1 ${statusStyle.bgColor} ${statusStyle.color} rounded-lg text-xs font-medium border ${statusStyle.borderColor}`}
                              >
                                {statusStyle.icon} {statusStyle.label}
                              </span>
                            );
                          })()}
                          <span className="text-slate-500 text-sm ml-auto">
                            {new Date(repair.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-lg flex-shrink-0">
                              👤
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                                Customer
                              </p>
                              <p className="text-slate-800 font-medium">
                                {repair.customer.name}
                              </p>
                              <p className="text-slate-500 text-sm">
                                {repair.customer.phone}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-lg flex-shrink-0">
                              📱
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                                Device
                              </p>
                              <p className="text-slate-800 font-medium">
                                {repair.device.brand}
                              </p>
                              <p className="text-slate-500 text-sm">
                                {repair.device.model}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-lg flex-shrink-0">
                              🔧
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                                Technician
                              </p>
                              <p className="text-slate-800 font-medium">
                                {repair.assignedTo?.username || "Unassigned"}
                              </p>
                              <div className="flex gap-3 mt-1 text-xs text-slate-500">
                                <span>
                                  Labor: Rs.{" "}
                                  {(repair.laborCost || 0).toLocaleString()}
                                </span>
                                <span>
                                  Parts: Rs.{" "}
                                  {(repair.partsTotal || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="w-56 flex-shrink-0">
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-sky-200/50">
                          {repair.advancePayment > 0 ? (
                            <>
                              <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-slate-500">
                                  Total Cost
                                </span>
                                <span className="text-slate-700">
                                  Rs. {(repair.totalCost || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-sky-200/50">
                                <span className="text-emerald-600">
                                  Advance Paid
                                </span>
                                <span className="text-emerald-600">
                                  - Rs. {repair.advancePayment.toLocaleString()}
                                </span>
                              </div>
                              <div className="text-center mb-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                                  Balance Due
                                </p>
                                <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                                  Rs. {balanceDue.toLocaleString()}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="text-center mb-3">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                                Total Due
                              </p>
                              <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                Rs. {(repair.totalCost || 0).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {repair.status === "RECEIVED" && (
                            <button
                              onClick={() => printDeviceReceivedReceipt(repair)}
                              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                              <span className="text-lg">🖨️</span>
                              Print Receipt
                            </button>
                          )}
                          {repair.status === "IN_PROGRESS" && (
                            <div className="w-full py-3 bg-amber-500/10 text-amber-400 font-medium rounded-xl text-center border border-amber-500/30">
                              <span className="text-lg mr-2">⚙️</span>
                              Work in Progress
                            </div>
                          )}
                          {repair.status === "READY" && (
                            <button
                              onClick={() => onCollectPayment(repair)}
                              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                              <span className="text-lg">💵</span>
                              Collect Payment
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {filteredRepairs.length > 0 && (
          <div className="px-5 py-3 border-t border-sky-200/50 bg-white/80 flex items-center justify-between">
            <p className="text-slate-500 text-sm">
              Showing {filteredRepairs.length} of {repairs.length} repairs
            </p>
            <p className="text-slate-500 text-sm">
              Press{" "}
              <kbd className="px-2 py-0.5 bg-sky-100 rounded text-xs mx-1 text-sky-700">
                ESC
              </kbd>{" "}
              to close
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
