import { useState } from "react";
import { AdvancePaymentModal } from "../modals/AdvancePaymentModal";
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
  const [selectedRepairForAdvance, setSelectedRepairForAdvance] = useState<RepairJob | null>(null);

  const statusCounts = {
    RECEIVED: repairs.filter((r) => r.status === "RECEIVED").length,
    IN_PROGRESS: repairs.filter((r) => r.status === "IN_PROGRESS").length,
    READY: repairs.filter((r) => r.status === "READY").length,
    COMPLETED: repairs.filter((r) => r.status === "COMPLETED").length,
  };

  let filteredRepairs = repairs.filter((repair) => {
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

  // Limit completed repairs to last 20
  if (activeStatus === "COMPLETED") {
    filteredRepairs = filteredRepairs.slice(0, 20);
  }

  const readyRepairs = repairs.filter((r) => r.status === "READY");
  const totalBalance = readyRepairs.reduce(
    (sum, r) => sum + Math.max(0, (r.totalCost || 0) - (r.advancePayment || 0)),
    0,
  );
  const urgentCount = filteredRepairs.filter(
    (r) => r.priority === "URGENT",
  ).length;



  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "READY":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "COMPLETED":
        return "bg-slate-200 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "RECEIVED": return "Received";
      case "IN_PROGRESS": return "In Progress";
      case "READY": return "Ready";
      case "COMPLETED": return "Completed";
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
                <h3 className="text-xl font-semibold text-slate-800">Repair Jobs</h3>
                <p className="text-slate-500 text-sm mt-0.5">Manage and track repair status</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 transition-colors text-sm font-medium"
              >
                Refresh
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
        </div>

        {/* Filters and Tabs */}
        <div className="border-b border-slate-200 bg-white">
            <div className="flex border-b border-slate-200 px-6">
                 {(["RECEIVED", "IN_PROGRESS", "READY", "COMPLETED"] as const).map((status) => {
                    const isActive = activeStatus === status;
                    return (
                        <button
                            key={status}
                            onClick={() => setActiveStatus(status)}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                isActive 
                                ? "border-blue-600 text-blue-600" 
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                            }`}
                        >
                            {getStatusLabel(status)}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                {statusCounts[status]}
                            </span>
                        </button>
                    );
                 })}
            </div>
            
            <div className="p-4 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
                 <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Job # or Customer..."
                            className="w-80 pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                         <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All Priorities</option>
                        <option value="URGENT">Urgent Only</option>
                        <option value="HIGH">High Only</option>
                        <option value="NORMAL">Normal Only</option>
                    </select>

                    <div className="h-6 w-px bg-slate-300 mx-2"></div>
                    
                    <span className="text-sm text-slate-500 hidden sm:inline-block">
                        Showing <span className="font-medium text-slate-900">{filteredRepairs.length}</span> results
                        {activeStatus === "COMPLETED" && <span className="text-slate-400 ml-1">(last 20)</span>}
                    </span>
                 </div>

                 <div className="flex items-center gap-3">
                    {urgentCount > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded border border-red-200">
                            {urgentCount} Urgent
                        </span>
                    )}
                    {activeStatus === "READY" && totalBalance > 0 && (
                        <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                            <span className="text-emerald-700 font-medium">Collectible: </span>
                            <span className="font-bold text-emerald-800">Rs. {totalBalance.toLocaleString()}</span>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 text-sm">Loading repairs...</p>
            </div>
          ) : repairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
              <h4 className="text-slate-900 font-medium mb-1">No repairs found</h4>
              <p className="text-slate-500 text-sm mb-4">No repairs are currently in this status.</p>
              <button onClick={onRefresh} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Refresh list</button>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-slate-500">No repairs match your search filters.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterPriority("ALL");
                }}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRepairs.map((repair) => {
                const priorityClass = getPriorityStyles(repair.priority);
                const statusClass = getStatusStyles(repair.status);
                const balanceDue = Math.max(
                  0,
                  (repair.totalCost || 0) - (repair.advancePayment || 0),
                );

                return (
                  <div
                    key={repair._id}
                    className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5"
                  >
                    <div className="flex gap-6">
                      {/* Left: Info */}
                      <div className="flex-1 grid grid-cols-12 gap-6">
                        <div className="col-span-12 mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-slate-800 font-mono">
                                    {repair.jobNumber}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${priorityClass} border uppercase tracking-wide`}>
                                    {repair.priority}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusClass} border`}>
                                    {getStatusLabel(repair.status)}
                                </span>
                            </div>
                            <span className="text-xs text-slate-400">
                                Created: {new Date(repair.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        <div className="col-span-4">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Customer</label>
                            <p className="text-slate-900 font-medium">{repair.customer.name}</p>
                            <p className="text-slate-500 text-sm">{repair.customer.phone}</p>
                        </div>
                        
                        <div className="col-span-4">
                             <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Device</label>
                             <p className="text-slate-900 font-medium">{repair.device.brand} {repair.device.model}</p>
                             <p className="text-slate-500 text-sm truncate" title={repair.problemDescription}>{repair.problemDescription || 'No description'}</p>
                        </div>

                         <div className="col-span-4">
                             <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Technician</label>
                             <p className="text-slate-900 font-medium text-sm">{repair.assignedTo?.username || "—"}</p>
                             <div className="flex gap-3 mt-1 text-xs text-slate-500">
                                <span>Labor: <span className="font-medium text-slate-700">{(repair.laborCost || 0).toLocaleString()}</span></span>
                                <span>Parts: <span className="font-medium text-slate-700">{(repair.partsTotal || 0).toLocaleString()}</span></span>
                             </div>
                        </div>

                      </div>

                      {/* Right: Payment/Actions */}
                      <div className="w-64 border-l border-slate-100 pl-6 flex flex-col justify-center">
                         <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-500">Total</span>
                                <span className="text-slate-900 font-medium">{(repair.totalCost || 0).toLocaleString()}</span>
                            </div>
                            {repair.advancePayment > 0 && (
                                <div className="flex justify-between text-sm mb-2 text-emerald-600">
                                    <span>Advance</span>
                                    <span>- {repair.advancePayment.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Due</span>
                                <span className="text-xl font-bold text-slate-900">Rs. {balanceDue.toLocaleString()}</span>
                            </div>
                         </div>

                         {repair.status === "RECEIVED" && (
                            <button
                                onClick={() => setSelectedRepairForAdvance(repair)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                            >
                                {repair.advancePayment > 0 ? "Edit Advance" : "Collect Advance"}
                            </button>
                         )}
                         
                         {repair.status === "IN_PROGRESS" && (
                            <div className="w-full py-2 bg-slate-100 text-slate-500 text-sm font-medium rounded text-center cursor-default">
                                In Progress
                            </div>
                         )}

                         {repair.status === "READY" && (
                             <button
                                onClick={() => onCollectPayment(repair)}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded shadow-sm transition-colors"
                             >
                                Collect Payment
                             </button>
                         )}

                         {repair.status === "COMPLETED" && (
                             <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-500">
                                   <span>Paid</span>
                                   <span className="text-emerald-600 font-medium">✓ Rs. {(repair.totalCost || 0).toLocaleString()}</span>
                                </div>
                                {repair.finalPayment !== undefined && repair.finalPayment > 0 && (
                                  <div className="flex justify-between text-xs text-slate-500">
                                    <span>Final Payment</span>
                                    <span className="font-medium">Rs. {repair.finalPayment.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="w-full py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded text-center">
                                   ✓ Completed
                                </div>
                             </div>
                         )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {selectedRepairForAdvance && (
        <AdvancePaymentModal
          repair={selectedRepairForAdvance}
          onClose={() => setSelectedRepairForAdvance(null)}
          onSuccess={() => {
            setSelectedRepairForAdvance(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
