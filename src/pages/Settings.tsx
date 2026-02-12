import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ShopSettings,
  KeyboardShortcuts,
  getShopSettings,
  saveShopSettings,
  getKeyboardShortcuts,
  saveKeyboardShortcuts,
  DEFAULT_SHOP_SETTINGS,
  DEFAULT_KEYBOARD_SHORTCUTS,
  SHORTCUT_LABELS,
} from "../lib/settings";

export default function Settings(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"shop" | "shortcuts">("shop");
  const [shopSettings, setShopSettings] = useState<ShopSettings>(
    DEFAULT_SHOP_SETTINGS,
  );
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(
    DEFAULT_KEYBOARD_SHORTCUTS,
  );
  const [saved, setSaved] = useState(false);
  const [recordingKey, setRecordingKey] = useState<
    keyof KeyboardShortcuts | null
  >(null);

  // Load settings on mount
  useEffect(() => {
    setShopSettings(getShopSettings());
    setShortcuts(getKeyboardShortcuts());
  }, []);

  // Handle key recording
  useEffect(() => {
    if (!recordingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.key.toUpperCase();
      // Allow Escape to cancel recording
      if (key === "ESCAPE") {
        setRecordingKey(null);
        return;
      }
      setShortcuts((prev) => ({ ...prev, [recordingKey]: key }));
      setRecordingKey(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recordingKey]);

  const handleSaveShop = () => {
    saveShopSettings(shopSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveShortcuts = () => {
    saveKeyboardShortcuts(shortcuts);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetShortcuts = () => {
    if (window.confirm("Are you sure you want to reset all shortcuts to defaults?")) {
      setShortcuts(DEFAULT_KEYBOARD_SHORTCUTS);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/pos")}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="text-2xl">⚙️</span> POS Settings
            </h1>
            <p className="text-sm text-slate-500">
              Configure system preferences and defaults
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Logged in as</p>
                <p className="text-sm font-semibold text-slate-900">{user?.username || "User"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold">
                {(user?.username?.[0] || "U").toUpperCase()}
            </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab("shop")}
            className={`px-6 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px] ${
              activeTab === "shop"
                ? "bg-white text-blue-600 border border-slate-200 border-b-white"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            🏪 Shop Details
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`px-6 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px] ${
              activeTab === "shortcuts"
                ? "bg-white text-blue-600 border border-slate-200 border-b-white"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            ⌨️ Keyboard Shortcuts
          </button>
        </div>

        {/* Success Toast */}
        {saved && (
          <div className="fixed top-24 right-8 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-down z-50">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Settings saved successfully!</span>
          </div>
        )}

        {/* Shop Details Tab */}
        {activeTab === "shop" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-800">Shop Information</h2>
                        <p className="text-sm text-slate-500">Details that will appear on customer receipts</p>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Shop Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={shopSettings.shopName}
                                    onChange={(e) => setShopSettings({ ...shopSettings, shopName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                    placeholder="e.g. Hotline Mobile Shop"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                                <textarea
                                    value={shopSettings.address}
                                    onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm min-h-[80px]"
                                    placeholder="Shop address details..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                                <input
                                    type="text"
                                    value={shopSettings.phone}
                                    onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                    placeholder="+94 7X XXX XXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={shopSettings.email}
                                    onChange={(e) => setShopSettings({ ...shopSettings, email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                    placeholder="contact@example.com"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Receipt Footer Message</label>
                                <input
                                    type="text"
                                    value={shopSettings.footerMessage}
                                    onChange={(e) => setShopSettings({ ...shopSettings, footerMessage: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                    placeholder="e.g. Thank you for your business!"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSaveShop}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receipt Preview</h2>
                            </div>
                            <div className="p-6 bg-slate-100 flex justify-center">
                                <div className="bg-white p-4 w-full shadow-md text-xs font-mono text-slate-900 border-t-4 border-slate-800 leading-tight">
                                    <div className="text-center mb-4">
                                        <div className="font-bold text-sm mb-1">✦ {shopSettings.shopName || "SHOP NAME"} ✦</div>
                                        <div className="text-slate-500 space-y-0.5">
                                            {shopSettings.address && <div>{shopSettings.address}</div>}
                                            {shopSettings.phone && <div>Tel: {shopSettings.phone}</div>}
                                            {shopSettings.email && <div>{shopSettings.email}</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="border-b border-dashed border-slate-300 my-2"></div>
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                                        <span>Date: {new Date().toLocaleDateString()}</span>
                                        <span>Receipt #: 00001</span>
                                    </div>

                                    <div className="space-y-1 mb-2">
                                        <div className="flex justify-between">
                                            <span>Item A (x2)</span>
                                            <span>1,000.00</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Item B (x1)</span>
                                            <span>500.00</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-800 pt-1 mt-1 font-bold flex justify-between">
                                        <span>TOTAL</span>
                                        <span>1,500.00</span>
                                    </div>

                                    <div className="border-b border-dashed border-slate-300 my-4"></div>
                                    
                                    <div className="text-center text-slate-600 italic text-[10px]">
                                        {shopSettings.footerMessage || "Thank you!"}
                                    </div>
                                    <div className="text-center text-[10px] text-slate-400 mt-2">
                                        System by Pixzoralabs
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Keyboard Shortcuts Tab */}
        {activeTab === "shortcuts" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Keyboard Shortcuts</h2>
                    <p className="text-sm text-slate-500">Customize keys for quick access to actions</p>
                </div>
                <button
                    onClick={handleResetShortcuts}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-all border border-slate-200 hover:border-slate-300"
                >
                    Reset Defaults
                </button>
            </div>

            <div className="p-0">
                {/* Shortcuts Table */}
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">Action</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">Key Binding</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(Object.keys(shortcuts) as Array<keyof KeyboardShortcuts>).map((key) => (
                            <tr key={key} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-800">{SHORTCUT_LABELS[key]}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{key}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => setRecordingKey(key)}
                                        className={`relative min-w-[100px] px-4 py-2 rounded-lg font-mono text-sm border-2 transition-all shadow-sm flex items-center justify-center gap-2 ${
                                            recordingKey === key
                                            ? "bg-blue-50 border-blue-500 text-blue-700 animate-pulse ring-2 ring-blue-200"
                                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 group-hover:border-blue-200"
                                        }`}
                                    >
                                        {recordingKey === key ? (
                                            <span>Press key...</span>
                                        ) : (
                                            <>
                                                <kbd className="font-bold">{shortcuts[key]}</kbd>
                                                <span className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400">
                                                    ✏️
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-sm text-slate-500">
                        <strong className="text-slate-700">💡 Pro Tip:</strong> Function keys (F1-F12) are best for preventing conflicts with typing.
                    </div>
                    <button
                        onClick={handleSaveShortcuts}
                        className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all"
                    >
                        Save Shortcuts
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
