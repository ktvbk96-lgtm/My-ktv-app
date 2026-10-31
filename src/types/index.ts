export type Role = 'admin' | 'staff';

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  phone?: string;
  active: boolean;
}

export type ProductCategory = 'drink' | 'beer' | 'food' | 'snack' | 'service' | 'other';

export interface Product {
  id: string;
  name: string; // Lao name e.g. ເບຍລາວ (Beerlao), ນ້ຳດື່ມ
  category: ProductCategory;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStockAlert: number;
  unit: string; // ແກ້ວ, ຕຸກ, ຈານ, ຊຸດ, ກະປ໋ອງ
  requireSeller: boolean; // ຕ້ອງເລືອກຜູ້ຂາຍ/ພະນັກງານເສີບ
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  sellerId?: string;
  sellerName?: string;
  note?: string;
}

export type RoomPricingType = 'package' | 'fixed_hourly';

export interface RoomPackage {
  id: string;
  name: string; // e.g. ແພັກເກັດ 2 ຊົ່ວໂມງ (2 Hrs Combo)
  durationMinutes: number;
  price: number;
  description: string;
  includesBeerCount?: number;
}

export type RoomStatus = 'available' | 'in_use' | 'billing';

export interface RoomOrder {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  orderedAt: string;
  sellerId?: string;
  sellerName?: string;
}

export interface Room {
  id: string;
  name: string; // e.g. ຫ້ອງ VIP 689, ຫ້ອງ VIP 01
  capacity: number;
  status: RoomStatus;
  pricingType: RoomPricingType;
  packageId?: string;
  packageName?: string;
  hourlyRate: number; // For fixed hourly price (e.g. 70,000 ₭/hr)
  openedAt?: string; // ISO string
  targetEndTime?: string; // ISO string (e.g. 08:00 + 4 hours -> 12:00)
  bookedHours?: number; // e.g. 4
  openedByStaffId?: string;
  openedByStaffName?: string;
  orders: RoomOrder[];
}

export interface BillPayment {
  method: 'cash' | 'transfer';
  cashReceived?: number;
  change?: number;
}

export interface BillRecord {
  id: string;
  billNumber: string; // e.g. 689-20261031-001
  type: 'pos_sale' | 'ktv_room';
  roomName?: string;
  startTime?: string;
  endTime: string;
  targetEndTime?: string;
  timeRangeFormatted?: string; // e.g. "08:00 - 12:00"
  durationMinutes?: number;
  pricingType?: RoomPricingType;
  roomCharge: number;
  items: {
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    price: number;
    total: number;
    sellerId?: string;
    sellerName?: string;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment: BillPayment;
  staffName: string;
  syncedToSheets?: boolean;
}

export interface AppSettings {
  shopName: string; // "689 KTV"
  shopBranch: string;
  shopAddress: string;
  shopPhone: string;
  receiptHeader: string;
  receiptFooter: string;
  wifiPassword?: string;
  adminPin: string; // default 8888
  staffPin: string; // default 1234
  currencySymbol: string; // ₭
  defaultHourlyRate: number; // e.g. 80,000
  bluetoothPrinterName?: string;
  bluetoothPrinterServiceId?: string;
  googleSheetId?: string;
  googleSheetName?: string;
  autoSyncGoogleSheets: boolean;
}
