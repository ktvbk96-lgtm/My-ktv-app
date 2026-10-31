import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  XCircle,
  User,
  DoorOpen,
  Receipt,
  Sparkles,
  Beer,
  Coffee,
  UtensilsCrossed,
  Cookie,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Product, ProductCategory, CartItem, StaffMember, Room, AppSettings } from '../types';
import { formatCurrency } from '../lib/storage';

interface PosSalesProps {
  products: Product[];
  staffList: StaffMember[];
  activeRooms: Room[];
  settings: AppSettings;
  currentStaff?: StaffMember;
  onCheckoutPosSale: (items: CartItem[], discount: number, paymentMethod: 'cash' | 'transfer', cashReceived?: number) => void;
  onTransferToRoom: (roomId: string, items: CartItem[]) => void;
}

export const PosSales: React.FC<PosSalesProps> = ({
  products,
  staffList,
  activeRooms,
  settings,
  currentStaff,
  onCheckoutPosSale,
  onTransferToRoom,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');

  // Seller selection modal for items that require seller
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [selectedSellerId, setSelectedSellerId] = useState<string>(currentStaff?.id || '');

  // Room transfer modal
  const [showRoomSelectModal, setShowRoomSelectModal] = useState<boolean>(false);

  const categories: { id: ProductCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'ທັງໝົດ (All)', icon: Sparkles },
    { id: 'beer', label: 'ເບຍ & ເຫຼົ້າ (Beer)', icon: Beer },
    { id: 'drink', label: 'ເຄື່ອງດື່ມ (Drinks)', icon: Coffee },
    { id: 'food', label: 'ອາຫານ (Food)', icon: UtensilsCrossed },
    { id: 'snack', label: 'ຂອງກິນຫຼິ້ນ (Snacks)', icon: Cookie },
    { id: 'service', label: 'ບໍລິການ (Service)', icon: UserCheck },
  ];

  const getCategoryStyle = (category: ProductCategory) => {
    switch (category) {
      case 'beer':
        return {
          label: 'ເບຍ & ເຫຼົ້າ',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          activePill: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/25',
          cardBorder: 'hover:border-amber-400 border-amber-900/40 hover:shadow-amber-500/10',
          priceColor: 'text-amber-400',
          btnBg: 'group-hover:bg-amber-500 group-hover:text-slate-950',
          dot: 'bg-amber-400',
        };
      case 'drink':
        return {
          label: 'ເຄື່ອງດື່ມ',
          badge: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
          activePill: 'bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 font-black shadow-lg shadow-sky-500/25',
          cardBorder: 'hover:border-sky-400 border-sky-900/40 hover:shadow-sky-500/10',
          priceColor: 'text-sky-400',
          btnBg: 'group-hover:bg-sky-500 group-hover:text-slate-950',
          dot: 'bg-sky-400',
        };
      case 'food':
        return {
          label: 'ອາຫານ',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          activePill: 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25',
          cardBorder: 'hover:border-emerald-400 border-emerald-900/40 hover:shadow-emerald-500/10',
          priceColor: 'text-emerald-400',
          btnBg: 'group-hover:bg-emerald-500 group-hover:text-slate-950',
          dot: 'bg-emerald-400',
        };
      case 'snack':
        return {
          label: 'ຂອງກິນຫຼິ້ນ',
          badge: 'bg-orange-950/80 text-orange-300 border-orange-500/40',
          activePill: 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black shadow-lg shadow-orange-500/25',
          cardBorder: 'hover:border-orange-400 border-orange-900/40 hover:shadow-orange-500/10',
          priceColor: 'text-orange-400',
          btnBg: 'group-hover:bg-orange-500 group-hover:text-slate-950',
          dot: 'bg-orange-400',
        };
      case 'service':
        return {
          label: 'ບໍລິການ PR',
          badge: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/40',
          activePill: 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black shadow-lg shadow-fuchsia-500/25',
          cardBorder: 'hover:border-fuchsia-400 border-fuchsia-900/40 hover:shadow-fuchsia-500/10',
          priceColor: 'text-fuchsia-400',
          btnBg: 'group-hover:bg-fuchsia-500 group-hover:text-white',
          dot: 'bg-fuchsia-400',
        };
      default:
        return {
          label: 'ອື່ນໆ',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          activePill: 'bg-slate-200 text-slate-950 font-black shadow-md',
          cardBorder: 'hover:border-slate-500 border-slate-800',
          priceColor: 'text-slate-200',
          btnBg: 'group-hover:bg-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.unit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    // Check if out of stock
    if (product.stock <= 0 && product.category !== 'service') {
      alert(`ສິນຄ້າ "${product.name}" ໝົດສະຕັອກແລ້ວ! ບໍ່ສາມາດຂາຍໄດ້`);
      return;
    }

    // Check if seller is required
    if (product.requireSeller) {
      setPendingProduct(product);
      setPendingQty(1);
      setSelectedSellerId(currentStaff?.id || staffList[0]?.id || '');
      return;
    }

    // Add to cart directly
    addToCart(product, 1);
  };

  const confirmSellerSelection = () => {
    if (!pendingProduct) return;
    if (!selectedSellerId) {
      alert('ກະລຸນາເລືອກພະນັກງານຜູ້ຂາຍ ສຳລັບລາຍການນີ້!');
      return;
    }
    const seller = staffList.find((s) => s.id === selectedSellerId);
    addToCart(pendingProduct, pendingQty, selectedSellerId, seller?.name);
    setPendingProduct(null);
  };

  const addToCart = (product: Product, quantity: number, sellerId?: string, sellerName?: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.sellerId === sellerId
      );

      const currentQtyInCart = existingIndex > -1 ? prev[existingIndex].quantity : 0;
      const totalRequested = currentQtyInCart + quantity;

      if (product.category !== 'service' && totalRequested > product.stock) {
        alert(
          `ບໍ່ສາມາດເພີ່ມໄດ້! ສະຕັອກຄົງເຫຼືອພຽງ ${product.stock} ${product.unit} (ໃນກະຕ່າແລ້ວ ${currentQtyInCart})`
        );
        return prev;
      }

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      return [
        ...prev,
        {
          product,
          quantity,
          sellerId,
          sellerName,
        },
      ];
    });
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (item.product.category !== 'service' && newQty > item.product.stock) {
      alert(`ສະຕັອກສິນຄ້າ "${item.product.name}" ມີພຽງ ${item.product.stock} ${item.product.unit}`);
      return;
    }

    setCart((prev) => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setCashReceived('');
  };

  const subtotal = cart.reduce((acc, item) => acc + item.product.salePrice * item.quantity, 0);
  const total = Math.max(0, subtotal - discountAmount);
  const cashNum = parseFloat(cashReceived) || 0;
  const change = paymentMethod === 'cash' && cashNum > total ? cashNum - total : 0;

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      alert('ກະຕ່າວ່າງເປົ່າ! ກະລຸນາເລືອກສິນຄ້າກ່ອນ');
      return;
    }

    if (paymentMethod === 'cash' && cashNum < total) {
      alert(`ເງິນສົດທີ່ຮັບມາບໍ່ພໍ! ຍອດລວມ: ${formatCurrency(total, settings.currencySymbol)}`);
      return;
    }

    onCheckoutPosSale(cart, discountAmount, paymentMethod, paymentMethod === 'cash' ? cashNum : undefined);
    clearCart();
  };

  const handleTransferConfirm = (roomId: string) => {
    if (cart.length === 0) return;
    onTransferToRoom(roomId, cart);
    clearCart();
    setShowRoomSelectModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Product Catalog Section (8 cols) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search & Category Pills */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ຄົ້ນຫາສິນຄ້າ, ເຄື່ອງດື່ມ, ອາຫານ, ເບຍ..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>

          {/* Categories with distinct colors */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const catStyle = cat.id !== 'all' ? getCategoryStyle(cat.id) : null;
              const activeClass =
                cat.id === 'all'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black shadow-md'
                  : catStyle?.activePill;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? activeClass
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid with Color-Coded Category Accents */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0 && product.category !== 'service';
            const isLowStock =
              !isOutOfStock && product.stock <= product.minStockAlert && product.category !== 'service';
            const catStyle = getCategoryStyle(product.category);

            return (
              <div
                key={product.id}
                onClick={() => !isOutOfStock && handleProductClick(product)}
                className={`relative group rounded-3xl p-3.5 flex flex-col justify-between transition-all duration-200 border text-left ${
                  isOutOfStock
                    ? 'bg-rose-950/20 border-rose-800/60 cursor-not-allowed opacity-80'
                    : isLowStock
                    ? 'bg-slate-900 border-amber-500/50 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer'
                    : `bg-slate-900 border-slate-800 ${catStyle.cardBorder} hover:shadow-lg cursor-pointer active:scale-[0.98]`
                }`}
              >
                <div>
                  {/* Category Pill and Stock Alert Badge */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${catStyle.badge}`}
                    >
                      {catStyle.label}
                    </span>

                    {isOutOfStock ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full animate-pulse">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>ໝົດ!</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-700/80 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>ໃກ້ໝົດ ({product.stock})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">
                        {product.stock} {product.unit}
                      </span>
                    )}
                  </div>

                  {/* Product Name */}
                  <h3 className="font-bold text-sm text-slate-100 line-clamp-2 mb-1 group-hover:text-white transition-colors">
                    {product.name}
                  </h3>

                  {product.requireSeller && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-fuchsia-300 bg-fuchsia-950/60 px-1.5 py-0.5 rounded border border-fuchsia-800/50 mb-1">
                      <User className="w-3 h-3" />
                      <span>ຕ້ອງເລືອກຜູ້ຂາຍ</span>
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className={`text-sm font-extrabold font-mono ${catStyle.priceColor}`}>
                    {formatCurrency(product.salePrice, settings.currencySymbol)}
                  </span>

                  {isOutOfStock ? (
                    <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-xl">
                      ຫ້າມຂາຍ
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`p-1.5 rounded-xl bg-slate-800 ${catStyle.btnBg} text-slate-300 transition-all shadow-sm`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart / Order Section (4-5 cols) */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[calc(100vh-140px)] sticky top-20">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-rose-400" />
              <h2 className="font-bold text-base text-slate-100">ກະຕ່າສິນຄ້າ (Order)</h2>
              <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ລ້າງ</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ShoppingCart className="w-12 h-12 stroke-[1.2] mb-2 text-slate-600" />
                <p className="text-sm font-medium">ບໍ່ມີລາຍການສິນຄ້າໃນກະຕ່າ</p>
                <p className="text-xs text-slate-500 mt-1">ກົດເລືອກສິນຄ້າຈາກເມນູດ້ານຊ້າຍເພື່ອເລີ່ມຂາຍ</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={`${item.product.id}-${item.sellerId}-${idx}`}
                  className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-100 truncate">
                      {item.product.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono text-amber-400">
                        {formatCurrency(item.product.salePrice, settings.currencySymbol)}
                      </span>
                      {item.sellerName && (
                        <span className="bg-purple-950/60 border border-purple-800/40 text-purple-300 px-1.5 py-0.2 rounded text-[10px]">
                          ເສີບ: {item.sellerName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity modifier */}
                  <div className="flex items-center gap-1.5 bg-slate-900 rounded-xl p-1 border border-slate-700">
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[70px]">
                    <span className="text-xs font-bold text-slate-100 font-mono">
                      {formatCurrency(item.product.salePrice * item.quantity, settings.currencySymbol)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing, Discounts & Payment */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ລວມເງິນ (Subtotal):</span>
              <span className="font-mono font-semibold text-slate-200">
                {formatCurrency(subtotal, settings.currencySymbol)}
              </span>
            </div>

            {/* Discount input with quick percentage buttons */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">ສ່ວນຫຼຸດ (Discount):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-right text-xs text-amber-400 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="text-slate-400 text-xs">{settings.currencySymbol}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1">
                {[5, 10, 20].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountAmount(Math.round((subtotal * p) / 100))}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 font-bold border border-slate-700 cursor-pointer"
                  >
                    {p}%
                  </button>
                ))}
                {discountAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountAmount(0)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-[10px] text-rose-400 border border-slate-700 cursor-pointer"
                  >
                    ລ້າງ
                  </button>
                )}
              </div>
            </div>

            {/* Net Total */}
            <div className="flex items-center justify-between py-2 bg-slate-800/60 px-3 rounded-2xl border border-slate-700">
              <span className="text-sm font-bold text-slate-200">ຍອດສຸດທິ (Total):</span>
              <span className="text-lg font-black text-rose-400 font-mono">
                {formatCurrency(total, settings.currencySymbol)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                💵 ເງິນສົດ (Cash)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                📱 ໂອນ / QR
              </button>
            </div>

            {/* Cash Input if Cash */}
            {paymentMethod === 'cash' && total > 0 && (
              <div className="bg-slate-800/40 p-2 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">ຮັບເງິນສົດມາ:</span>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={total.toString()}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {cashNum > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">ເງິນທອນ:</span>
                    <span
                      className={`font-mono font-bold ${
                        cashNum >= total ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {cashNum >= total
                        ? formatCurrency(change, settings.currencySymbol)
                        : 'ຍັງຂາດ ' + formatCurrency(total - cashNum, settings.currencySymbol)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons: POS Checkout & Transfer to Room */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={cart.length === 0}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>ເຊັກບິນຂາຍໜ້າຮ້ານ (Checkout)</span>
              </button>

              {activeRooms.filter((r) => r.status === 'in_use').length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRoomSelectModal(true)}
                  disabled={cart.length === 0}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <DoorOpen className="w-4 h-4 text-purple-400" />
                  <span>ໂອນລາຍການເຂົ້າຫ້ອງ KTV (Send to Room)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Select Seller Required */}
      {pendingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">
                  ເລືອກພະນັກງານຜູ້ຂາຍ / ຜູ້ເສີບ
                </h3>
                <p className="text-xs text-slate-400">
                  ລາຍການ &quot;{pendingProduct.name}&quot; ຕ້ອງລະບຸຜູ້ຂາຍ
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">ຈຳນວນທີ່ຕ້ອງການຂາຍ:</label>
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setPendingQty(Math.max(1, pendingQty - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center font-mono font-bold text-sm text-white">
                    {pendingQty} {pendingProduct.unit}
                  </span>
                  <button
                    onClick={() =>
                      setPendingQty(
                        pendingProduct.category === 'service'
                          ? pendingQty + 1
                          : Math.min(pendingProduct.stock, pendingQty + 1)
                      )
                    }
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  ພະນັກງານຜູ້ຂາຍ / PR / ເສີບ:
                </label>
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {staffList
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role === 'admin' ? 'ເຈົ້າຂອງຮ້ານ' : 'ພະນັກງານ'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPendingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ຍົກເລີກ
              </button>
              <button
                onClick={confirmSellerSelection}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30"
              >
                ຢືນຢັນເພີ່ມລາຍການ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transfer to KTV Room */}
      {showRoomSelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">ໂອນສິນຄ້າເຂົ້າຫ້ອງ KTV</h3>
                <p className="text-xs text-slate-400">
                  ເລືອກຫ້ອງທີ່ກຳລັງໃຊ້ງານຢູ່ ເພື່ອລວມບິນເຊັກພ້ອມກັນ
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
              {activeRooms
                .filter((r) => r.status === 'in_use')
                .map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleTransferConfirm(room.id)}
                    className="w-full text-left p-3.5 rounded-2xl bg-slate-800/80 hover:bg-purple-900/30 border border-slate-700/80 hover:border-purple-500/60 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 group-hover:text-purple-300">
                        {room.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        ເປີດເມື່ອ:{' '}
                        {room.openedAt ? new Date(room.openedAt).toLocaleTimeString('lo-LA') : '-'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-xl">
                      ໂອນເຂົ້າຫ້ອງນີ້
                    </span>
                  </button>
                ))}
            </div>

            <button
              onClick={() => setShowRoomSelectModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              ປິດ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
