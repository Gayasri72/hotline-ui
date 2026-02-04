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
    setShortcuts(DEFAULT_KEYBOARD_SHORTCUTS);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-sky-200/50 px-6 py-4 flex items-center justify-between shadow-lg shadow-sky-100/20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/pos")}
            className="p-2 bg-sky-100 hover:bg-sky-200 rounded-lg text-sky-700 hover:text-sky-800 transition-all"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <span className="text-white text-lg">⚙️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">POS Settings</h1>
              <p className="text-sm text-slate-600">
                Configure your POS preferences
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Logged in as</p>
          <p className="text-slate-800">{user?.username || "User"}</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("shop")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "shop"
                ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"
            }`}
          >
            🏪 Shop Details
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "shortcuts"
                ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25"
                : "bg-white text-slate-600 hover:bg-sky-50 border border-sky-200"
            }`}
          >
            ⌨️ Keyboard Shortcuts
          </button>
        </div>

        {/* Success Toast */}
        {saved && (
          <div className="fixed top-4 right-4 bg-sky-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse z-50">
            ✅ Settings saved!
          </div>
        )}

        {/* Shop Details Tab */}
        {activeTab === "shop" && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              🏪 Shop Information
              <span className="text-sm font-normal text-slate-400">
                (Appears on receipts)
              </span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Shop Name *
                </label>
                <input
                  type="text"
                  value={shopSettings.shopName}
                  onChange={(e) =>
                    setShopSettings({
                      ...shopSettings,
                      shopName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Enter shop name"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Address
                </label>
                <textarea
                  value={shopSettings.address}
                  onChange={(e) =>
                    setShopSettings({
                      ...shopSettings,
                      address: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Enter shop address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={shopSettings.phone}
                    onChange={(e) =>
                      setShopSettings({
                        ...shopSettings,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={shopSettings.email}
                    onChange={(e) =>
                      setShopSettings({
                        ...shopSettings,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Receipt Footer Message
                </label>
                <input
                  type="text"
                  value={shopSettings.footerMessage}
                  onChange={(e) =>
                    setShopSettings({
                      ...shopSettings,
                      footerMessage: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Thank you message"
                />
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Receipt Preview
                </p>
                <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap">
                  {shopSettings.shopName || "[Shop Name]"}
                  {shopSettings.address && `\n${shopSettings.address}`}
                  {shopSettings.phone && `\nPhone: ${shopSettings.phone}`}
                  {shopSettings.email && `\nEmail: ${shopSettings.email}`}
                  {"\n─────────────────────────"}
                  {"\n[Receipt content here...]"}
                  {"\n─────────────────────────"}
                  {`\n${shopSettings.footerMessage || "Thank you!"}`}
                </pre>
              </div>

              <button
                onClick={handleSaveShop}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all mt-4"
              >
                💾 Save Shop Settings
              </button>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Tab */}
        {activeTab === "shortcuts" && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </h2>
              <button
                onClick={handleResetShortcuts}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all"
              >
                Reset to Defaults
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              Click on a key box and press any key to set a new shortcut.
              Function keys (F1-F12) are recommended.
            </p>

            <div className="space-y-3">
              {(Object.keys(shortcuts) as Array<keyof KeyboardShortcuts>).map(
                (key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-all"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {SHORTCUT_LABELS[key]}
                      </p>
                      <p className="text-slate-500 text-sm">{key}</p>
                    </div>
                    <button
                      onClick={() => setRecordingKey(key)}
                      className={`min-w-[80px] px-4 py-2 rounded-lg font-mono text-lg transition-all ${
                        recordingKey === key
                          ? "bg-cyan-500 text-white animate-pulse"
                          : "bg-slate-600 text-white hover:bg-slate-500"
                      }`}
                    >
                      {recordingKey === key ? "Press..." : shortcuts[key]}
                    </button>
                  </div>
                ),
              )}
            </div>

            <button
              onClick={handleSaveShortcuts}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all mt-6"
            >
              💾 Save Keyboard Shortcuts
            </button>

            {/* Tips */}
            <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm">
                <strong className="text-slate-300">💡 Tips:</strong>
                <br />• Use F1-F12 keys for shortcuts as they don't conflict
                with typing
                <br />• Shortcuts work when focus is not on an input field
                <br />• Press ESC to cancel recording a new key
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
