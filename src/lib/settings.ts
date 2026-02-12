// POS Settings Utilities
// Manages shop settings and keyboard shortcuts via localStorage

// ============================================
// Types
// ============================================

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  footerMessage: string;
}

export interface KeyboardShortcuts {
  payNow: string;
  clearCart: string;
  openRepairs: string;
  openSales: string;
  focusSearch: string;
  printLastReceipt: string;
  openSettings: string;
  logout: string;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: "Hotline Mobile Shop",
  address: "",
  phone: "",
  email: "",
  footerMessage: "Thank you for your business!",
};

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  payNow: "F1",
  clearCart: "F2",
  openRepairs: "F3",
  openSales: "F4",
  focusSearch: "F5",
  printLastReceipt: "F9",
  openSettings: "F10",
  logout: "F12",
};

// ============================================
// Storage Keys
// ============================================

const SHOP_SETTINGS_KEY = "pos_shop_settings";
const KEYBOARD_SHORTCUTS_KEY = "pos_keyboard_shortcuts";

// ============================================
// Shop Settings Functions
// ============================================

export function getShopSettings(): ShopSettings {
  try {
    const stored = localStorage.getItem(SHOP_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load shop settings:", e);
  }
  return DEFAULT_SHOP_SETTINGS;
}

export function saveShopSettings(settings: ShopSettings): void {
  try {
    localStorage.setItem(SHOP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save shop settings:", e);
  }
}

// ============================================
// Keyboard Shortcuts Functions
// ============================================

export function getKeyboardShortcuts(): KeyboardShortcuts {
  try {
    const stored = localStorage.getItem(KEYBOARD_SHORTCUTS_KEY);
    if (stored) {
      return { ...DEFAULT_KEYBOARD_SHORTCUTS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load keyboard shortcuts:", e);
  }
  return DEFAULT_KEYBOARD_SHORTCUTS;
}

export function saveKeyboardShortcuts(shortcuts: KeyboardShortcuts): void {
  try {
    localStorage.setItem(KEYBOARD_SHORTCUTS_KEY, JSON.stringify(shortcuts));
  } catch (e) {
    console.error("Failed to save keyboard shortcuts:", e);
  }
}

// ============================================
// Receipt Header Generator
// ============================================

export function getReceiptHeader(): string {
  const settings = getShopSettings();
  let header = "";
  
  if (settings.shopName) {
    header += `${settings.shopName}\n`;
  }
  if (settings.address) {
    header += `${settings.address}\n`;
  }
  if (settings.phone) {
    header += `Phone: ${settings.phone}\n`;
  }
  if (settings.email) {
    header += `Email: ${settings.email}\n`;
  }
  
  return header;
}

export function getReceiptFooter(): string {
  const settings = getShopSettings();
  return settings.footerMessage || "Thank you for your business!";
}

// ============================================
// Key Display Names
// ============================================

export const SHORTCUT_LABELS: Record<keyof KeyboardShortcuts, string> = {
  payNow: "Pay Now / Complete Sale",
  clearCart: "Clear Cart",
  openRepairs: "Open Repairs Panel",
  openSales: "Open Sales Panel",
  focusSearch: "Focus Search Box",
  printLastReceipt: "Print Last Receipt",
  openSettings: "Open Settings",
  logout: "Logout",
};
