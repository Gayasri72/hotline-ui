import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS } from "../constants/permission";
import { api } from "../lib/api";
import { getKeyboardShortcuts } from "../lib/settings";
import { generateSaleReceiptHTML, printReceipt } from "../lib/receipt";

// Import types from centralized types file
import {
  Category,
  Product,
  CartItem,
  RepairJob,
  Warranty,
  CategoriesResponse,
  ProductsResponse,
  RepairsResponse,
} from "../types/pos";

// Import extracted POS components
import {
  PaymentModal,
  RepairPaymentModal,
  ProductDetailModal,
  WarrantyClaimModal,
  SalesPanel,
  RepairsPanel,
  ReturnsPanel,
  WarrantyPanel,
} from "../components/pos";

/* =======================
   POS Component
======================= */

export default function POS(): JSX.Element {
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();

  // Permission checks
  const canApplyDiscount = hasPermission(PERMISSIONS.APPLY_DISCOUNT);
  const canVoidSale = hasPermission(PERMISSIONS.VOID_SALE);
  const canViewSales = hasPermission(PERMISSIONS.VIEW_SALES);
  const canViewRepairs =
    hasPermission(PERMISSIONS.VIEW_REPAIRS) ||
    hasPermission(PERMISSIONS.COLLECT_REPAIR_PAYMENT);
  const canCollectRepairPayment = hasPermission(
    PERMISSIONS.COLLECT_REPAIR_PAYMENT,
  );
  const canProcessReturn = hasPermission(PERMISSIONS.CREATE_RETURN);
  const canViewWarranties = hasPermission(PERMISSIONS.VIEW_WARRANTIES);
  const canCreateWarrantyClaim = hasPermission(
    PERMISSIONS.CREATE_WARRANTY_CLAIM,
  );

  // State
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState<
    string | null
  >(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Sales Panel State
  const [showSalesPanel, setShowSalesPanel] = useState<boolean>(false);

  // Repairs Panel State
  const [showRepairsPanel, setShowRepairsPanel] = useState<boolean>(false);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [repairsLoading, setRepairsLoading] = useState<boolean>(false);
  const [selectedRepairForPayment, setSelectedRepairForPayment] =
    useState<RepairJob | null>(null);

  // Product Details Modal State
  const [selectedProductForDetails, setSelectedProductForDetails] =
    useState<Product | null>(null);

  // Returns Panel State
  const [showReturnsPanel, setShowReturnsPanel] = useState<boolean>(false);

  // Warranty Panel State
  const [showWarrantyPanel, setShowWarrantyPanel] = useState<boolean>(false);
  const [selectedWarrantyForClaim, setSelectedWarrantyForClaim] =
    useState<Warranty | null>(null);

  // Serial Number Modal State (for warranty products)
  const [showSerialModal, setShowSerialModal] = useState<boolean>(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [serialNumberInput, setSerialNumberInput] = useState<string>("");

  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh: re-fetch products & categories every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toggle:
  //  ON  — auto-scan: rapid keystroke burst detected → auto-add to cart, no Enter needed
  //  OFF — manual:    scan fills search bar, cashier presses Enter to add to cart
  const [autoScanMode, setAutoScanMode] = useState<boolean>(true);
  const autoScanModeRef = useRef<boolean>(true);
  useEffect(() => { autoScanModeRef.current = autoScanMode; }, [autoScanMode]);

  // --- Barcode scanner ---

  // add-to-cart helper — functional setCart avoids stale cart state
  const addToCartFromScan = useCallback((match: Product) => {
    if ((match.stock ?? 0) === 0) {
      alert("Product is out of stock!");
      return;
    }
    if ((match.warrantyDuration ?? 0) > 0) {
      setPendingProduct(match);
      setSerialNumberInput("");
      setShowSerialModal(true);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item._id === match._id);
      if (existing) {
        if (existing.quantity >= (match.stock ?? 0)) {
          alert(`Only ${match.stock} available!`);
          return prev;
        }
        return prev.map((item) =>
          item._id === match._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...match, quantity: 1 }];
    });
  }, []);

  const productsRef = useRef<Product[]>(products);
  useEffect(() => { productsRef.current = products; }, [products]);

  const addToCartFromScanRef = useRef(addToCartFromScan);
  useEffect(() => { addToCartFromScanRef.current = addToCartFromScan; }, [addToCartFromScan]);

  // Timestamp of last printable char — used to distinguish scanner burst from manual typing
  const lastCharTimeRef = useRef<number>(0);
  // Debounce timer ref for auto-scan ON mode
  const scanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: read live DOM value, match, and add to cart
  const tryAddFromSearchInput = useCallback(() => {
    const query = (searchInputRef.current?.value ?? "").trim();
    if (query.length < 2) return;
    const match = productsRef.current.find(
      (p) =>
        (p.barcode && p.barcode === query) ||
        (p.sku && p.sku.toLowerCase() === query.toLowerCase()),
    );
    if (!match) return;

    // Clear input
    setSearchQuery("");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (searchInputRef.current) {
      setter?.call(searchInputRef.current, "");
      searchInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    addToCartFromScanRef.current(match);
  }, []);

  useEffect(() => {
    const SCAN_BURST_MS = 80;   // max ms between chars considered a scanner burst
    const AUTO_SCAN_DELAY = 150; // ms after last burst char before auto-triggering

    const handleKey = (e: KeyboardEvent) => {
      if (
        showPaymentModal ||
        showSerialModal ||
        selectedRepairForPayment ||
        selectedWarrantyForClaim
      ) return;

      const target = e.target as HTMLElement;
      const isInsideInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isSearchFocused = target === searchInputRef.current;
      const isOtherInput = isInsideInput && !isSearchFocused;
      if (isOtherInput) return;

      // ── Printable char ───────────────────────────────────────────────────────
      if (e.key.length === 1) {
        const now = Date.now();
        const elapsed = now - lastCharTimeRef.current;
        lastCharTimeRef.current = now;

        // Redirect to search input if not already focused
        if (!isInsideInput) {
          e.preventDefault();
          const input = searchInputRef.current;
          if (input) {
            input.focus();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            const newVal = input.value + e.key;
            setter?.call(input, newVal);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            setSearchQuery(newVal);
          }
        }

        // ON mode: if this looks like a scanner burst char, arm/reset the debounce timer
        if (autoScanModeRef.current) {
          const isBurstChar = elapsed < SCAN_BURST_MS || elapsed > 1000;
          // elapsed > 1000 covers the very first char (no prior key)
          if (isBurstChar) {
            if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
            scanDebounceRef.current = setTimeout(() => {
              scanDebounceRef.current = null;
              tryAddFromSearchInput();
            }, AUTO_SCAN_DELAY);
          }
        }
        return;
      }

      // ── Enter key ────────────────────────────────────────────────────────────
      if (isSearchFocused && e.key === "Enter") {
        // Cancel any pending auto-scan debounce (Enter beats the timer)
        if (scanDebounceRef.current) {
          clearTimeout(scanDebounceRef.current);
          scanDebounceRef.current = null;
        }

        // OFF mode: Enter always adds to cart (manual workflow)
        // ON mode:  Enter also adds (scanner's own Enter or manual — both are fine)
        e.preventDefault();
        tryAddFromSearchInput();
      }
    };

    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
    };
  }, [showPaymentModal, showSerialModal, selectedRepairForPayment, selectedWarrantyForClaim, tryAddFromSearchInput]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const shortcuts = getKeyboardShortcuts();
      const key = e.key.toUpperCase();

      if (key === shortcuts.payNow.toUpperCase() && cart.length > 0) {
        e.preventDefault();
        setShowPaymentModal(true);
      } else if (key === shortcuts.clearCart.toUpperCase()) {
        e.preventDefault();
        setCart([]);
      } else if (
        key === shortcuts.openRepairs.toUpperCase() &&
        canViewRepairs
      ) {
        e.preventDefault();
        setShowRepairsPanel(true);
        fetchRepairs();
      } else if (key === shortcuts.openSales.toUpperCase() && canViewSales) {
        e.preventDefault();
        setShowSalesPanel(true);
      } else if (key === shortcuts.focusSearch.toUpperCase()) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (key === shortcuts.openSettings.toUpperCase()) {
        e.preventDefault();
        navigate("/settings");
      } else if (key === shortcuts.printLastReceipt.toUpperCase()) {
        e.preventDefault();
        // Fetch last sale and print
        try {
            const res = await api<any>("/sales?limit=1");
            if (res.status === "success" && res.data?.sales?.length > 0) {
                const lastSale = res.data.sales[0];
                const receiptHTML = generateSaleReceiptHTML({
                    saleNumber: lastSale.saleNumber,
                    items: lastSale.items.map((i: any) => ({
                        productName: i.product?.name || "Unknown Item",
                        quantity: i.quantity,
                        unitPrice: i.price,
                        total: i.total
                    })),
                    subtotal: lastSale.subtotal,
                    discountTotal: lastSale.discount,
                    grandTotal: lastSale.total,
                    amountPaid: lastSale.payment?.amount || lastSale.total,
                    changeGiven: lastSale.payment?.change || 0
                });
                await printReceipt(receiptHTML);
            } else {
                alert("No recent sales found to print.");
            }
        } catch (err) {
            console.error("Failed to print last receipt", err);
        }
      } else if (key === shortcuts.logout.toUpperCase()) {
        e.preventDefault();
        handleLogout();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart.length, canViewRepairs, canViewSales, navigate]);

  const fetchData = async (): Promise<void> => {
    try {
      const [catData, prodData] = await Promise.all([
        api<CategoriesResponse>("/categories?tree=true"),
        api<ProductsResponse>("/products"),
      ]);
      if (catData.status === "success" && catData.data) {
        setCategoryTree(catData.data.categories || []);
      }
      if (prodData.status === "success" && prodData.data) {
        setProducts(prodData.data.products || []);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Manual / auto refresh (silent, no loading spinner)
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [catData, prodData] = await Promise.all([
        api<CategoriesResponse>("/categories?tree=true"),
        api<ProductsResponse>("/products"),
      ]);
      if (catData.status === "success" && catData.data) {
        setCategoryTree(catData.data.categories || []);
      }
      if (prodData.status === "success" && prodData.data) {
        setProducts(prodData.data.products || []);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to refresh data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);



  // Fetch repairs (all statuses for full visibility)
  const fetchRepairs = async () => {
    setRepairsLoading(true);
    try {
      const res = await api<RepairsResponse>("/repairs");
      if (res.status === "success" && res.data) {
        setRepairs(res.data.repairs || []);
      }
    } catch (err) {
      console.error("Failed to fetch repairs:", err);
    } finally {
      setRepairsLoading(false);
    }
  };

  // Get subcategories
  const currentSubcategories: Category[] = selectedParentCategory
    ? categoryTree.find((c) => c._id === selectedParentCategory)
        ?.subcategories || []
    : [];

  const getSelectedCategoryIds = (): string[] => {
    if (selectedSubCategory) return [selectedSubCategory];
    if (selectedParentCategory) {
      const parent = categoryTree.find((c) => c._id === selectedParentCategory);
      const subIds = parent?.subcategories?.map((s) => s._id) || [];
      return [selectedParentCategory, ...subIds];
    }
    return [];
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const name = p?.name ? String(p.name) : "";
    const sku = p?.sku ? String(p.sku) : "";
    const barcode = p?.barcode ? String(p.barcode) : "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barcode.includes(searchQuery);

    // Category matching logic:
    // - If no category selected, show all
    // - If parent category selected, show products with that category OR any of its subcategories
    // - If subcategory selected, show only products with that specific subcategory
    const selectedIds = getSelectedCategoryIds();
    if (selectedIds.length === 0) {
      return matchesSearch; // No category filter
    }

    // Check if product's category or subcategory matches selected categories
    const productCategoryId = p.category?._id || "";
    const productSubcategoryId = p.subcategory?._id || "";

    const matchesCategory =
      selectedIds.includes(productCategoryId) ||
      selectedIds.includes(productSubcategoryId);

    return matchesSearch && matchesCategory;
  });

  // Cart functions
  const addToCart = (product: Product, serialNumber?: string): void => {
    if ((product?.stock ?? 0) === 0) {
      alert("Product is out of stock!");
      return;
    }

    // Check if product has warranty and needs serial number
    const hasWarranty = (product.warrantyDuration ?? 0) > 0;

    // If product has warranty and no serial number provided, show modal
    if (hasWarranty && !serialNumber) {
      setPendingProduct(product);
      setSerialNumberInput("");
      setShowSerialModal(true);
      return;
    }

    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      // For warranty products, each unit needs unique serial number
      // So we add as new item instead of incrementing quantity
      if (hasWarranty && serialNumber) {
        // Check if this serial number already exists in cart
        const serialExists = cart.some(
          (item) => item.serialNumber === serialNumber,
        );
        if (serialExists) {
          alert("This serial number is already in the cart!");
          return;
        }
        // Add as new line item with this serial number
        setCart([...cart, { ...product, quantity: 1, serialNumber }]);
      } else {
        // Non-warranty product - just increment quantity
        if (existing.quantity >= (product?.stock ?? 0)) {
          alert(`Only ${product?.stock} available!`);
          return;
        }
        setCart(
          cart.map((item) =>
            item._id === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      }
    } else {
      setCart([...cart, { ...product, quantity: 1, serialNumber }]);
    }
  };

  // Handle serial number confirmation
  const handleSerialNumberConfirm = (): void => {
    if (!pendingProduct) return;

    if (!serialNumberInput.trim()) {
      alert("Please enter a serial number or IMEI");
      return;
    }

    // Check if serial number already in cart
    const serialExists = cart.some(
      (item) => item.serialNumber === serialNumberInput.trim(),
    );
    if (serialExists) {
      alert("This serial number is already in the cart!");
      return;
    }

    // Add product with serial number
    addToCart(pendingProduct, serialNumberInput.trim());

    // Reset modal state
    setShowSerialModal(false);
    setPendingProduct(null);
    setSerialNumberInput("");
  };

  // Skip serial number (optional - for non-tracked items)
  const handleSkipSerialNumber = (): void => {
    if (!pendingProduct) return;

    // Add without serial number
    const existing = cart.find(
      (item) => item._id === pendingProduct._id && !item.serialNumber,
    );
    if (existing) {
      if (existing.quantity >= (pendingProduct?.stock ?? 0)) {
        alert(`Only ${pendingProduct?.stock} available!`);
        return;
      }
      setCart(
        cart.map((item) =>
          item._id === pendingProduct._id && !item.serialNumber
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...pendingProduct, quantity: 1 }]);
    }

    setShowSerialModal(false);
    setPendingProduct(null);
    setSerialNumberInput("");
  };

  // Generate unique key for cart item (combines product ID with serial number if present)
  const getCartItemKey = (item: CartItem): string => {
    return item.serialNumber ? `${item._id}_${item.serialNumber}` : item._id;
  };

  const updateQuantity = (
    productId: string,
    quantity: number,
    serialNumber?: string,
  ): void => {
    const itemKey = serialNumber ? `${productId}_${serialNumber}` : productId;

    if (quantity < 1) {
      setCart(cart.filter((item) => getCartItemKey(item) !== itemKey));
    } else {
      // For items with serial number, don't allow quantity > 1
      if (serialNumber && quantity > 1) {
        alert("Each item with serial number must have quantity of 1");
        return;
      }
      const product = products.find((p) => p._id === productId);
      if (quantity > (product?.stock ?? 0)) {
        alert(`Only ${product?.stock} available!`);
        return;
      }
      setCart(
        cart.map((item) =>
          getCartItemKey(item) === itemKey ? { ...item, quantity } : item,
        ),
      );
    }
  };

  const removeFromCart = (productId: string, serialNumber?: string): void => {
    const itemKey = serialNumber ? `${productId}_${serialNumber}` : productId;
    setCart(cart.filter((item) => getCartItemKey(item) !== itemKey));
  };

  const clearCart = (): void => setCart([]);

  // Calculate totals (use effectivePrice for items with offers)
  const getItemPrice = (item: CartItem) =>
    item.effectivePrice ?? item.sellingPrice ?? 0;
  const subtotal = cart.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0,
  );
  const total = subtotal;

  const handleLogout = (): void => {
    logout();
    navigate("/login");
  };

  const handleParentCategoryClick = (categoryId: string | null): void => {
    if (selectedParentCategory === categoryId) {
      setSelectedParentCategory(null);
      setSelectedSubCategory(null);
    } else {
      setSelectedParentCategory(categoryId);
      setSelectedSubCategory(null);
    }
  };

  const handleSubCategoryClick = (subCategoryId: string): void => {
    setSelectedSubCategory(
      selectedSubCategory === subCategoryId ? null : subCategoryId,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-sky-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 text-sm font-medium animate-pulse">
            Loading POS System...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white flex flex-col overflow-hidden">
      {/* Modern Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-sky-200/50 px-4 py-2.5 flex items-center justify-between flex-shrink-0 shadow-lg shadow-sky-100/20">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-sky-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Hotline POS
            </h1>
            <p className="text-[10px] text-sky-600 -mt-0.5 font-medium tracking-wide">
              POINT OF SALE
            </p>
          </div>
        </div>

        {/* Search Bar + Auto-Scan Toggle */}
        <div className="flex items-center gap-2">
        {/* Auto-scan toggle */}
        <button
          onClick={() => setAutoScanMode((v) => !v)}
          title={autoScanMode ? "Auto-scan ON: scan automatically adds to cart (no Enter needed)" : "Auto-scan OFF: scan fills search bar, press Enter to add to cart"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm select-none ${
            autoScanMode
              ? "bg-sky-500 border-sky-500 text-white shadow-sky-200"
              : "bg-white border-slate-300 text-slate-500"
          }`}
        >
          {/* barcode icon */}
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14M7 5v14M13 5v14M17 5v14M21 5v14M10 5v14" />
          </svg>
          {/* pill toggle */}
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              autoScanMode ? "bg-white/30" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                autoScanMode ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
        {/* Search Bar - Enhanced */}
        <div className="relative w-[420px]">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-slate-500"
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
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, SKU, or barcode..."
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 transition-all text-sm shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 transition-colors"
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
        </div>{/* end Search Bar + Auto-Scan Toggle wrapper */}

        {/* Action Buttons & User Info */}
        <div className="flex items-center gap-2">
          {canViewSales && (
            <button
              onClick={() => setShowSalesPanel(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/60 hover:bg-sky-50 border border-sky-200 rounded-xl text-slate-600 hover:text-sky-700 transition-all group shadow-sm"
              title="Sales Reports"
            >
              <svg
                className="w-4 h-4 group-hover:text-sky-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-xs font-medium hidden xl:block">Sales</span>
            </button>
          )}
          {canViewRepairs && (
            <button
              onClick={() => {
                setShowRepairsPanel(true);
                fetchRepairs();
              }}
              className="relative flex items-center gap-2 px-3 py-2 bg-white/60 hover:bg-blue-50 border border-blue-200 rounded-xl text-slate-600 hover:text-blue-700 transition-all group shadow-sm"
              title="Repairs"
            >
              <svg
                className="w-4 h-4 group-hover:text-blue-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xs font-medium hidden xl:block">
                Repairs
              </span>
              {repairs.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-blue-500/30 animate-pulse">
                  {repairs.length}
                </span>
              )}
            </button>
          )}
          {canProcessReturn && (
            <button
              onClick={() => setShowReturnsPanel(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/60 hover:bg-sky-50 border border-sky-200 rounded-xl text-slate-600 hover:text-sky-700 transition-all group shadow-sm"
              title="Returns"
            >
              <svg
                className="w-4 h-4 group-hover:text-sky-500 transition-colors"
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
              <span className="text-xs font-medium hidden xl:block">
                Returns
              </span>
            </button>
          )}
          {canViewWarranties && (
            <button
              onClick={() => setShowWarrantyPanel(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/60 hover:bg-blue-50 border border-blue-200 rounded-xl text-slate-600 hover:text-blue-700 transition-all group shadow-sm"
              title="Warranty Lookup"
            >
              <svg
                className="w-4 h-4 group-hover:text-blue-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-xs font-medium hidden xl:block">
                Warranty
              </span>
            </button>
          )}
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="relative flex items-center gap-2 px-3 py-2 bg-white/60 hover:bg-emerald-50 border border-emerald-200 rounded-xl text-slate-600 hover:text-emerald-700 transition-all group shadow-sm"
            title={`Refresh Data (Last: ${lastRefreshed.toLocaleTimeString()})`}
          >
            <svg
              className={`w-4 h-4 group-hover:text-emerald-500 transition-all ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`}
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
            <span className="text-xs font-medium hidden xl:block">
              {isRefreshing ? 'Syncing...' : lastRefreshed.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {isRefreshing && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 px-3 py-2 bg-white/60 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-700 transition-all group shadow-sm"
            title="Settings"
          >
            <svg
              className="w-4 h-4 group-hover:text-slate-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-sky-200 mx-1"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 border border-sky-200 flex items-center justify-center shadow-inner">
              <span className="text-sm font-bold text-sky-600">
                {(user?.username?.[0] || "U").toUpperCase()}
              </span>
            </div>
            <div className="text-right hidden lg:block">
              <p className="text-slate-800 text-sm font-medium leading-tight">
                {user?.username || "User"}
              </p>
              <p className="text-[10px] text-sky-600/80 font-medium">
                {user?.roles?.[0]?.name || "Cashier"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-white/60 hover:bg-red-50 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 rounded-xl transition-all shadow-sm"
              title="Logout"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar - Optimized */}
        <aside className="w-52 bg-white/95 backdrop-blur-sm border-r border-sky-200/50 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-sky-200/50">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              Categories
            </h3>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-sky-200 scrollbar-track-transparent">
            <button
              onClick={() => handleParentCategoryClick(null)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 ${
                !selectedParentCategory
                  ? "bg-gradient-to-r from-sky-500/20 to-blue-500/10 text-sky-700 border border-sky-500/30 shadow-lg shadow-sky-500/5"
                  : "text-slate-600 hover:bg-sky-50 hover:text-slate-800 border border-transparent"
              }`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  !selectedParentCategory
                    ? "bg-sky-500/20 text-sky-600"
                    : "bg-slate-100 text-slate-500"
                }`}
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </span>
              <span className="font-medium text-sm">All Products</span>
            </button>

            {categoryTree.map((cat) => (
              <div key={cat._id}>
                <button
                  onClick={() => handleParentCategoryClick(cat._id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 ${
                    selectedParentCategory === cat._id
                      ? "bg-gradient-to-r from-sky-500/20 to-blue-500/10 text-sky-700 border border-sky-500/30 shadow-lg shadow-sky-500/5"
                      : "text-slate-600 hover:bg-sky-50 hover:text-slate-800 border border-transparent"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      selectedParentCategory === cat._id
                        ? "bg-sky-500/20 text-sky-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cat.name.charAt(0)}
                  </span>
                  <span className="font-medium flex-1 truncate text-sm">
                    {cat.name}
                  </span>
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${selectedParentCategory === cat._id ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>

                {/* Subcategories */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${selectedParentCategory === cat._id ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"}`}
                >
                  {cat.subcategories?.map((sub) => (
                    <button
                      key={sub._id}
                      onClick={() => handleSubCategoryClick(sub._id)}
                      className={`w-full ml-3 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                        selectedSubCategory === sub._id
                          ? "bg-blue-500/15 text-blue-700 border-l-2 border-blue-500"
                          : "text-slate-500 hover:bg-sky-50 hover:text-slate-700 border-l-2 border-transparent"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium ${
                          selectedSubCategory === sub._id
                            ? "bg-blue-500/20 text-blue-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sub.name.charAt(0)}
                      </span>
                      <span className="truncate">{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Products Grid - Enhanced */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumb & Stats Bar */}
          <div className="px-5 py-3 bg-white/80 border-b border-sky-200/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-slate-600">Showing</span>
                <span className="px-2.5 py-1 bg-sky-100 rounded-lg text-sky-700 font-medium border border-sky-200">
                  {!selectedParentCategory
                    ? "All Products"
                    : categoryTree.find((c) => c._id === selectedParentCategory)
                        ?.name}
                </span>
                {selectedSubCategory && (
                  <>
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="px-2.5 py-1 bg-blue-100 rounded-lg text-blue-700 font-medium border border-blue-200">
                      {
                        currentSubcategories.find(
                          (s) => s._id === selectedSubCategory,
                        )?.name
                      }
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-600 text-sm flex items-center gap-1.5">
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span className="font-medium text-slate-800">
                  {filteredProducts.length}
                </span>{" "}
                products
              </span>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="grid grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const hasOffer =
                  product?.hasActiveOffer ||
                  (product?.offer?.isActive &&
                    product?.discountAmount &&
                    product.discountAmount > 0);
                const displayPrice =
                  product?.effectivePrice ?? product?.sellingPrice ?? 0;
                const originalPrice = product?.sellingPrice ?? 0;
                const isOutOfStock = (product?.stock ?? 0) === 0;
                const isLowStock =
                  (product?.stock ?? 0) > 0 && (product?.stock ?? 0) <= 10;

                return (
                  <div
                    key={product._id}
                    className={`group relative bg-white/80 backdrop-blur-sm border border-sky-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-300/50 hover:-translate-y-1 ${
                      isOutOfStock ? "opacity-60 grayscale-[30%]" : ""
                    }`}
                  >
                    {/* Offer Badge */}
                    {hasOffer && (
                      <div className="absolute top-3 right-3 z-10">
                        <div className="px-2 py-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-orange-500/30 uppercase tracking-wide">
                          {product?.offer?.type === "PERCENTAGE"
                            ? `${product?.offer?.value}% OFF`
                            : `Rs.${product?.discountAmount} OFF`}
                        </div>
                      </div>
                    )}

                    {/* Product Image Placeholder */}
                    <div className="relative h-28 bg-gradient-to-br from-sky-100/50 to-blue-100/50 flex items-center justify-center overflow-hidden">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                          isOutOfStock
                            ? "bg-slate-200 text-slate-500"
                            : "bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-600 group-hover:scale-110"
                        }`}
                      >
                        {(product?.name?.[0] || "P").toUpperCase()}
                      </div>
                      {/* Quick Add Overlay */}
                      {!isOutOfStock && (
                        <button
                          onClick={() => addToCart(product)}
                          className="absolute inset-0 bg-gradient-to-t from-sky-500/80 via-sky-500/40 to-transparent opacity-0 group-hover:opacity-100 flex items-end justify-center pb-3 transition-all duration-300"
                        >
                          <span className="flex items-center gap-1.5 text-white font-semibold text-sm">
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
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Quick Add
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3">
                      {/* Stock Badge */}
                      <div className="flex items-center justify-between mb-1">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                            isOutOfStock
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : isLowStock
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-sky-100 text-sky-700 border border-sky-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock
                                ? "bg-red-500"
                                : isLowStock
                                  ? "bg-amber-500"
                                  : "bg-sky-500"
                            }`}
                          ></span>
                          {isOutOfStock
                            ? "Out of stock"
                            : `${product?.stock} in stock`}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForDetails(product);
                          }}
                          className="p-0.5 text-slate-500 hover:text-slate-700 transition-colors"
                          title="View Details"
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
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Product Name */}
                      <h3 className="text-slate-800 font-semibold text-sm leading-tight line-clamp-2 group-hover:text-sky-700 transition-colors">
                        {product?.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {product?.sku}
                      </p>

                      {/* Price Display */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-sky-600">
                          Rs. {displayPrice.toLocaleString()}
                        </span>
                        {hasOffer && (
                          <span className="text-xs text-slate-500 line-through">
                            Rs. {originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Offer Description */}
                      {hasOffer && product?.offer?.description && (
                        <p className="text-xs text-orange-600/80 truncate flex items-center gap-1">
                          <svg
                            className="w-3 h-3 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {product.offer.description}
                        </p>
                      )}

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 mt-3 ${
                          isOutOfStock
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white shadow-md hover:shadow-lg hover:shadow-sky-500/25"
                        }`}
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
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 rounded-full bg-sky-100 flex items-center justify-center mb-6 border border-sky-200">
                  <svg
                    className="w-12 h-12 text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  No products found
                </h3>
                <p className="text-slate-500 text-sm text-center max-w-sm">
                  Try adjusting your search or filter to find what you're
                  looking for.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Section - Premium Design */}
        <div className="w-80 bg-gradient-to-b from-white via-sky-50/50 to-blue-50/50 border-l border-sky-200/50 flex flex-col flex-shrink-0 shadow-2xl shadow-sky-100/20">
          {/* Cart Header */}
          <div className="p-4 border-b border-sky-200/50 flex items-center justify-between bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center border border-sky-500/30">
                <svg
                  className="w-5 h-5 text-sky-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Current Order
                </h2>
                {cart.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                  </p>
                )}
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-sky-100 flex items-center justify-center mb-4 border border-sky-200">
                  <svg
                    className="w-10 h-10 text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-slate-800 font-medium mb-1">
                  No items yet
                </h3>
                <p className="text-slate-500 text-sm text-center max-w-[200px]">
                  Add products from the catalog to start an order
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const itemPrice = item.effectivePrice ?? item.sellingPrice ?? 0;
                const hasItemOffer =
                  item.hasActiveOffer ||
                  (item.offer?.isActive && (item.discountAmount ?? 0) > 0);
                return (
                  <div
                    key={
                      item.serialNumber
                        ? `${item._id}_${item.serialNumber}`
                        : `${item._id}_${index}`
                    }
                    className="bg-white/80 backdrop-blur-sm rounded-xl p-3.5 border border-sky-200/50 hover:border-sky-300/50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Item Number */}
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-700 flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-slate-800 font-medium text-sm leading-tight line-clamp-2">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sky-600 text-xs font-medium">
                                Rs. {itemPrice.toLocaleString()}
                              </span>
                              {hasItemOffer && (
                                <span className="px-1.5 py-0.5 bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 text-[10px] font-semibold rounded border border-orange-200">
                                  OFFER
                                </span>
                              )}
                              {item.serialNumber && (
                                <span
                                  className="px-1.5 py-0.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 text-[10px] font-medium rounded border border-blue-200"
                                  title={`Serial: ${item.serialNumber}`}
                                >
                                  📱{" "}
                                  {item.serialNumber.length > 15
                                    ? `${item.serialNumber.slice(0, 15)}...`
                                    : item.serialNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              removeFromCart(item._id, item.serialNumber)
                            }
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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

                        {/* Quantity Controls & Total */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-sky-50 rounded-lg p-0.5">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item._id,
                                  item.quantity - 1,
                                  item.serialNumber,
                                )
                              }
                              className="w-7 h-7 rounded-md bg-white hover:bg-sky-100 text-sky-700 flex items-center justify-center transition-all"
                              disabled={!!item.serialNumber}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 12H4"
                                />
                              </svg>
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(
                                  item._id,
                                  parseInt(e.target.value) || 1,
                                  item.serialNumber,
                                )
                              }
                              className="w-10 text-center bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                              min="1"
                              max={item.serialNumber ? "1" : undefined}
                              disabled={!!item.serialNumber}
                            />
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item._id,
                                  item.quantity + 1,
                                  item.serialNumber,
                                )
                              }
                              className="w-7 h-7 rounded-md bg-white hover:bg-sky-100 text-sky-700 flex items-center justify-center transition-all"
                              disabled={!!item.serialNumber}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                            </button>
                          </div>
                          <span className="text-slate-800 font-bold text-sm">
                            Rs. {(itemPrice * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer - Totals & Pay Button */}
          <div className="p-4 border-t border-sky-200/50 bg-gradient-to-t from-white to-sky-50/50">
            {/* Order Summary */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-700 font-medium">
                  Rs. {subtotal.toLocaleString()}
                </span>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent my-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-800">
                  Total
                </span>
                <span className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  Rs. {total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                cart.length === 0
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
              }`}
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
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cart.length === 0 ? "Add Items to Pay" : "Proceed to Payment"}
            </button>

            {/* Keyboard Shortcut Hint */}
            {cart.length > 0 && (
              <p className="text-center text-[10px] text-slate-500 mt-2">
                Press{" "}
                <kbd className="px-1.5 py-0.5 bg-sky-100 rounded text-sky-700 font-mono">
                  F2
                </kbd>{" "}
                for quick checkout
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={total}
          subtotal={subtotal}

          cart={cart}
          canApplyDiscount={canApplyDiscount}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            clearCart();
            setShowPaymentModal(false);
            fetchData();
          }}
        />
      )}

      {/* Sales Panel */}
      {showSalesPanel && (
        <SalesPanel
          canVoidSale={canVoidSale}
          onClose={() => setShowSalesPanel(false)}
        />
      )}

      {/* Repairs Panel */}
      {showRepairsPanel && (
        <RepairsPanel
          repairs={repairs}
          loading={repairsLoading}
          onClose={() => setShowRepairsPanel(false)}
          onRefresh={fetchRepairs}
          onCollectPayment={(repair) => {
            setSelectedRepairForPayment(repair);
            setShowRepairsPanel(false);
          }}
        />
      )}

      {/* Repair Payment Modal */}
      {selectedRepairForPayment && (
        <RepairPaymentModal
          repair={selectedRepairForPayment}
          canCollectPayment={canCollectRepairPayment}
          onClose={() => setSelectedRepairForPayment(null)}
          onSuccess={() => {
            setSelectedRepairForPayment(null);
            fetchRepairs();
          }}
        />
      )}

      {/* Warranty Panel */}
      {showWarrantyPanel && (
        <WarrantyPanel
          onClose={() => setShowWarrantyPanel(false)}
          canCreateClaim={canCreateWarrantyClaim}
          onCreateClaim={(warranty: Warranty) => {
            setSelectedWarrantyForClaim(warranty);
          }}
        />
      )}

      {/* Warranty Claim Modal */}
      {selectedWarrantyForClaim && (
        <WarrantyClaimModal
          warranty={selectedWarrantyForClaim}
          onClose={() => setSelectedWarrantyForClaim(null)}
          onSuccess={() => {
            setSelectedWarrantyForClaim(null);
          }}
        />
      )}

      {/* Product Detail Modal */}
      {selectedProductForDetails && (
        <ProductDetailModal
          product={selectedProductForDetails}
          onClose={() => setSelectedProductForDetails(null)}
          onAddToCart={(product) => {
            addToCart(product);
            setSelectedProductForDetails(null);
          }}
        />
      )}

      {/* Serial Number Modal for Warranty Products */}
      {showSerialModal && pendingProduct && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => {
            setShowSerialModal(false);
            setPendingProduct(null);
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #1e1e2f 0%, #2a2a4a 100%)",
              borderRadius: 16,
              padding: 24,
              width: 400,
              maxWidth: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <span style={{ fontSize: 28 }}>📱</span>
              </div>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 18 }}>
                Enter Serial Number / IMEI
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  margin: "8px 0 0",
                  fontSize: 13,
                }}
              >
                This product has warranty. Enter the serial number for tracking.
              </p>
            </div>

            {/* Product Info */}
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}>
                {pendingProduct.name}
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                SKU: {pendingProduct.sku || "N/A"} | Warranty:{" "}
                {pendingProduct.warrantyDuration} months
              </div>
            </div>

            {/* Serial Number Input */}
            <input
              type="text"
              value={serialNumberInput}
              onChange={(e) => setSerialNumberInput(e.target.value)}
              placeholder="Enter Serial Number or IMEI"
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 8,
                border: "2px solid rgba(16, 185, 129, 0.3)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: 16,
                outline: "none",
                marginBottom: 16,
                boxSizing: "border-box",
                letterSpacing: 1,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSerialNumberConfirm();
                }
              }}
            />

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleSkipSerialNumber}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Skip (No Serial)
              </button>
              <button
                onClick={handleSerialNumberConfirm}
                style={{
                  flex: 2,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: serialNumberInput.trim()
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "rgba(255,255,255,0.1)",
                  color: serialNumberInput.trim()
                    ? "#fff"
                    : "rgba(255,255,255,0.5)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: serialNumberInput.trim() ? "pointer" : "not-allowed",
                }}
                disabled={!serialNumberInput.trim()}
              >
                ✓ Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Returns Panel */}
      {showReturnsPanel && (
        <ReturnsPanel onClose={() => setShowReturnsPanel(false)} />
      )}
    </div>
  );
}
