/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Role,
  StaffMember,
  Product,
  Room,
  RoomPackage,
  AppSettings,
  BillRecord,
  CartItem,
} from './types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredRooms,
  saveStoredRooms,
  getStoredPackages,
  saveStoredPackages,
  getStoredStaff,
  saveStoredStaff,
  getStoredSettings,
  saveStoredSettings,
  getStoredBills,
  saveStoredBill,
} from './lib/storage';
import { getBluetoothStatus } from './lib/bluetoothPrinter';
import { getAccessToken, initAuth } from './lib/firebase';
import { appendBillToSheet, syncInventoryToSheet } from './lib/googleSheets';

import { Navbar } from './components/Navbar';
import { PinAuthModal } from './components/PinAuthModal';
import { PosSales } from './components/PosSales';
import { RoomManagement } from './components/RoomManagement';
import { InventoryManagement } from './components/InventoryManagement';
import { SalesSummary } from './components/SalesSummary';
import { SettingsModal } from './components/SettingsModal';
import { BillingModal } from './components/BillingModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { BluetoothModal } from './components/BluetoothModal';

export default function App() {
  // Authentication & Role
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<Role>('staff');
  const [currentStaff, setCurrentStaff] = useState<StaffMember | undefined>(undefined);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'pos' | 'rooms' | 'stock' | 'reports' | 'settings'>('pos');

  // Application Data States
  const [products, setProducts] = useState<Product[]>(getStoredProducts());
  const [rooms, setRooms] = useState<Room[]>(getStoredRooms());
  const [packages, setPackages] = useState<RoomPackage[]>(getStoredPackages());
  const [staffList, setStaffList] = useState<StaffMember[]>(getStoredStaff());
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());
  const [bills, setBills] = useState<BillRecord[]>(getStoredBills());

  // Modals
  const [activeBillingRecord, setActiveBillingRecord] = useState<BillRecord | null>(null);
  const [showSheetsModal, setShowSheetsModal] = useState<boolean>(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState<boolean>(false);
  const [bluetoothConnected, setBluetoothConnected] = useState<boolean>(false);
  const [isSyncingAllSheets, setIsSyncingAllSheets] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Check Bluetooth and Storage Events
  useEffect(() => {
    const checkBt = () => {
      const status = getBluetoothStatus();
      setBluetoothConnected(status.connected);
    };
    checkBt();
    const btInterval = setInterval(checkBt, 4000);

    const handleStorageUpdate = () => {
      setProducts(getStoredProducts());
      setRooms(getStoredRooms());
      setBills(getStoredBills());
    };

    window.addEventListener('689ktv_products_updated', handleStorageUpdate);
    window.addEventListener('689ktv_rooms_updated', handleStorageUpdate);
    window.addEventListener('689ktv_bills_updated', handleStorageUpdate);

    return () => {
      clearInterval(btInterval);
      window.removeEventListener('689ktv_products_updated', handleStorageUpdate);
      window.removeEventListener('689ktv_rooms_updated', handleStorageUpdate);
      window.removeEventListener('689ktv_bills_updated', handleStorageUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Helper: Deduct stock from products
  const deductProductsStock = (itemsToDeduct: { productId: string; quantity: number }[]) => {
    const updated = products.map((prod) => {
      const match = itemsToDeduct.find((i) => i.productId === prod.id);
      if (match && prod.category !== 'service') {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - match.quantity),
        };
      }
      return prod;
    });
    setProducts(updated);
    saveStoredProducts(updated);
    return updated;
  };

  // Handle PIN Login Success
  const handlePinSuccess = (role: Role, staffMember?: StaffMember) => {
    setIsAuthenticated(true);
    setCurrentRole(role);
    setCurrentStaff(staffMember);
    showToast(`ຍິນດີຕ້ອນຮັບ ${staffMember?.name || (role === 'admin' ? 'Admin' : 'ພະນັກງານ')} ເຂົ້າສູ່ 689 KTV!`);
  };

  // Checkout POS Sale directly
  const handleCheckoutPosSale = (
    cart: CartItem[],
    discount: number,
    paymentMethod: 'cash' | 'transfer',
    cashReceived?: number
  ) => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
    const total = Math.max(0, subtotal - discount);
    const dateNow = new Date();
    const dateStr = dateNow.toISOString().slice(0, 10).replace(/-/g, '');
    const billNumber = `689-${dateStr}-${(bills.length + 1).toString().padStart(3, '0')}`;

    // Deduct stock
    deductProductsStock(
      cart.map((c) => ({ productId: c.product.id, quantity: c.quantity }))
    );

    const newBill: BillRecord = {
      id: 'bill-' + Date.now(),
      billNumber,
      type: 'pos_sale',
      endTime: dateNow.toISOString(),
      roomCharge: 0,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        unit: c.product.unit,
        quantity: c.quantity,
        price: c.product.salePrice,
        total: c.product.salePrice * c.quantity,
        sellerId: c.sellerId,
        sellerName: c.sellerName,
      })),
      subtotal,
      discount,
      tax: 0,
      total,
      payment: {
        method: paymentMethod,
        cashReceived,
        change: paymentMethod === 'cash' && cashReceived && cashReceived > total ? cashReceived - total : 0,
      },
      staffName: currentStaff?.name || (currentRole === 'admin' ? 'Admin' : 'ພະນັກງານ'),
    };

    setActiveBillingRecord(newBill);
  };

  // Transfer Cart items to a KTV Room
  const handleTransferToRoom = (roomId: string, cart: CartItem[]) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    // Deduct stock immediately
    deductProductsStock(
      cart.map((c) => ({ productId: c.product.id, quantity: c.quantity }))
    );

    const newOrders = cart.map((c) => ({
      id: 'ord-' + Date.now() + Math.random().toString(36).substr(2, 4),
      product: c.product,
      quantity: c.quantity,
      price: c.product.salePrice,
      orderedAt: new Date().toISOString(),
      sellerId: c.sellerId,
      sellerName: c.sellerName,
    }));

    const updatedRooms = rooms.map((r) => {
      if (r.id === roomId) {
        return {
          ...r,
          orders: [...r.orders, ...newOrders],
        };
      }
      return r;
    });

    setRooms(updatedRooms);
    saveStoredRooms(updatedRooms);
    showToast(`ໂອນ ${cart.length} ລາຍການ ເຂົ້າ ${targetRoom.name} ສຳເລັດແລ້ວ!`);
  };

  // Checkout KTV Room
  const handleCheckoutRoom = (
    room: Room,
    roomCharge: number,
    durationMinutes: number,
    startStr?: string,
    endStr?: string,
    timeRangeStr?: string
  ) => {
    const itemsTotal = room.orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
    const subtotal = roomCharge + itemsTotal;
    const dateNow = new Date();
    const dateStr = dateNow.toISOString().slice(0, 10).replace(/-/g, '');
    const billNumber = `689-${dateStr}-${(bills.length + 1).toString().padStart(3, '0')}`;

    const formattedStart =
      startStr ||
      (room.openedAt
        ? new Date(room.openedAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '');
    const formattedEnd =
      endStr ||
      dateNow.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedTarget = room.targetEndTime
      ? new Date(room.targetEndTime).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '';

    const timeRangeFormatted =
      timeRangeStr ||
      (formattedStart
        ? `${formattedStart} ຫາ ${formattedEnd} (ກຳນົດ: ${formattedStart} ຫາ ${formattedTarget || formattedEnd})`
        : undefined);

    const newBill: BillRecord = {
      id: 'bill-' + Date.now(),
      billNumber,
      type: 'ktv_room',
      roomName: room.name,
      startTime: room.openedAt,
      endTime: dateNow.toISOString(),
      targetEndTime: room.targetEndTime,
      timeRangeFormatted,
      durationMinutes,
      pricingType: room.pricingType,
      roomCharge,
      items: room.orders.map((o) => ({
        productId: o.product.id,
        productName: o.product.name,
        unit: o.product.unit,
        quantity: o.quantity,
        price: o.price,
        total: o.price * o.quantity,
        sellerId: o.sellerId,
        sellerName: o.sellerName,
      })),
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      payment: {
        method: 'cash',
        cashReceived: subtotal,
        change: 0,
      },
      staffName: currentStaff?.name || (currentRole === 'admin' ? 'Admin' : 'ພະນັກງານ'),
    };

    // Reset room status to available
    const updatedRooms = rooms.map((r) => {
      if (r.id === room.id) {
        return {
          ...r,
          status: 'available' as const,
          openedAt: undefined,
          openedByStaffId: undefined,
          openedByStaffName: undefined,
          packageId: undefined,
          packageName: undefined,
          orders: [],
        };
      }
      return r;
    });

    setRooms(updatedRooms);
    saveStoredRooms(updatedRooms);

    setActiveBillingRecord(newBill);
  };

  // Finalize payment from billing modal
  const handleConfirmBillingPayment = (completedBill: BillRecord) => {
    saveStoredBill(completedBill);
    setBills(getStoredBills());
    setActiveBillingRecord(null);
    showToast(`ເຊັກບິນ ${completedBill.billNumber} ສຳເລັດແລ້ວ!`);
  };

  // Sync bill to Google Sheets
  const handleSyncBillToGoogleSheet = async (billToSync: BillRecord): Promise<boolean> => {
    if (!settings.googleSheetId) return false;
    const token = await getAccessToken();
    if (!token) return false;

    return await appendBillToSheet(token, settings.googleSheetId, billToSync);
  };

  // Bulk sync all bills & inventory to Google Sheets
  const handleBulkSyncAllToSheets = async () => {
    if (!settings.googleSheetId) {
      setShowSheetsModal(true);
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setShowSheetsModal(true);
      return;
    }

    setIsSyncingAllSheets(true);
    try {
      await syncInventoryToSheet(token, settings.googleSheetId, products);
      for (const bill of bills) {
        await appendBillToSheet(token, settings.googleSheetId, bill);
      }
      showToast('ຊິ້ງຂໍ້ມູນທັງໝົດລົງ Google Sheets ສຳເລັດແລ້ວ!');
    } catch (err: any) {
      alert('ຊິ້ງລົງ Google Sheets ບໍ່ສຳເລັດ: ' + err.message);
    } finally {
      setIsSyncingAllSheets(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* 4-Digit PIN Lock Screen Modal (Right after opening or when locked) */}
      {!isAuthenticated && (
        <PinAuthModal
          settings={settings}
          staffList={staffList}
          onSuccess={handlePinSuccess}
        />
      )}

      {/* Main Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        currentUser={currentStaff}
        onLockScreen={() => setIsAuthenticated(false)}
        onOpenSheetsModal={() => setShowSheetsModal(true)}
        onOpenBluetoothModal={() => setShowBluetoothModal(true)}
        bluetoothConnected={bluetoothConnected}
        sheetsConfigured={!!settings.googleSheetId}
        settings={settings}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-gradient-to-r from-rose-600 to-amber-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-bold animate-bounce flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 pb-16">
        {activeTab === 'pos' && (
          <PosSales
            products={products}
            staffList={staffList}
            activeRooms={rooms}
            settings={settings}
            currentStaff={currentStaff}
            onCheckoutPosSale={handleCheckoutPosSale}
            onTransferToRoom={handleTransferToRoom}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomManagement
            rooms={rooms}
            packages={packages}
            products={products}
            staffList={staffList}
            settings={settings}
            currentStaff={currentStaff}
            onUpdateRooms={(updated) => {
              setRooms(updated);
              saveStoredRooms(updated);
            }}
            onCheckoutRoom={handleCheckoutRoom}
          />
        )}

        {activeTab === 'stock' && (
          <InventoryManagement
            products={products}
            currentRole={currentRole}
            settings={settings}
            onSaveProducts={(updated) => {
              setProducts(updated);
              saveStoredProducts(updated);
            }}
          />
        )}

        {activeTab === 'reports' && (
          <SalesSummary
            bills={bills}
            products={products}
            settings={settings}
            onSyncAllToSheets={handleBulkSyncAllToSheets}
            isSyncingSheets={isSyncingAllSheets}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsModal
            settings={settings}
            staffList={staffList}
            packages={packages}
            onSaveSettings={(newSettings) => {
              setSettings(newSettings);
              saveStoredSettings(newSettings);
              showToast('ບັນທຶກການຕັ້ງຄ່າຮ້ານສຳເລັດແລ້ວ!');
            }}
            onSaveStaff={(newStaff) => {
              setStaffList(newStaff);
              saveStoredStaff(newStaff);
            }}
            onSavePackages={(newPkgs) => {
              setPackages(newPkgs);
              saveStoredPackages(newPkgs);
            }}
            bluetoothConnected={bluetoothConnected}
            onRefreshBluetoothStatus={() => {
              const status = getBluetoothStatus();
              setBluetoothConnected(status.connected);
            }}
          />
        )}
      </main>

      {/* Billing & Thermal Receipt Modal */}
      {activeBillingRecord && (
        <BillingModal
          bill={activeBillingRecord}
          settings={settings}
          onClose={() => setActiveBillingRecord(null)}
          onConfirmPayment={handleConfirmBillingPayment}
          bluetoothConnected={bluetoothConnected}
          onOpenBluetoothSetup={() => setShowBluetoothModal(true)}
          onSyncGoogleSheet={handleSyncBillToGoogleSheet}
        />
      )}

      {/* Google Sheets Sync Modal */}
      {showSheetsModal && (
        <GoogleSheetsSyncModal
          settings={settings}
          bills={bills}
          products={products}
          onClose={() => setShowSheetsModal(false)}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            saveStoredSettings(newSettings);
          }}
        />
      )}

      {/* Bluetooth Setup Modal */}
      {showBluetoothModal && (
        <BluetoothModal
          settings={settings}
          bluetoothConnected={bluetoothConnected}
          onClose={() => setShowBluetoothModal(false)}
          onRefreshStatus={() => {
            const status = getBluetoothStatus();
            setBluetoothConnected(status.connected);
          }}
        />
      )}
    </div>
  );
}
