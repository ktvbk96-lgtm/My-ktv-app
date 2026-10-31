import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Layers,
  PieChart,
  FileSpreadsheet,
  Download,
  Filter,
  Beer,
  Coffee,
  UtensilsCrossed,
  DoorOpen,
  ArrowUpRight,
  Receipt,
  User,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { BillRecord, Product, AppSettings } from '../types';
import { formatCurrency } from '../lib/storage';

interface SalesSummaryProps {
  bills: BillRecord[];
  products: Product[];
  settings: AppSettings;
  onSyncAllToSheets?: () => void;
  isSyncingSheets?: boolean;
}

export const SalesSummary: React.FC<SalesSummaryProps> = ({
  bills,
  products,
  settings,
  onSyncAllToSheets,
  isSyncingSheets,
}) => {
  // Choice 1: Overall Summary vs Choice 2: Itemized Breakdown
  const [activeChoice, setActiveChoice] = useState<'overall' | 'itemized'>('overall');

  // Timeframe filter: daily, monthly, yearly
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );

  // Bill inspect modal
  const [inspectedBill, setInspectedBill] = useState<BillRecord | null>(null);

  // Filter bills by chosen timeframe
  const filteredBills = bills.filter((b) => {
    const billDate = new Date(b.endTime);
    if (timeframe === 'daily') {
      const dateStr = billDate.toISOString().split('T')[0];
      return dateStr === selectedDate;
    } else if (timeframe === 'monthly') {
      const monthStr = billDate.toISOString().slice(0, 7);
      return monthStr === selectedMonth;
    } else if (timeframe === 'yearly') {
      const yearStr = billDate.getFullYear().toString();
      return yearStr === selectedYear;
    }
    return true;
  });

  // Calculate Overall Totals
  const totalRevenue = filteredBills.reduce((acc, b) => acc + b.total, 0);
  const totalRoomCharge = filteredBills.reduce((acc, b) => acc + b.roomCharge, 0);
  const totalItemsCharge = filteredBills.reduce(
    (acc, b) => acc + b.items.reduce((sum, item) => sum + item.total, 0),
    0
  );
  const totalDiscount = filteredBills.reduce((acc, b) => acc + b.discount, 0);
  const totalCash = filteredBills
    .filter((b) => b.payment.method === 'cash')
    .reduce((acc, b) => acc + b.total, 0);
  const totalTransfer = filteredBills
    .filter((b) => b.payment.method === 'transfer')
    .reduce((acc, b) => acc + b.total, 0);

  // Choice 2: Calculate Itemized Breakdown (Qty sold & Revenue per item)
  const itemMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      unit: string;
      totalQty: number;
      totalRevenue: number;
      sellers: Map<string, number>;
    }
  >();

  filteredBills.forEach((b) => {
    b.items.forEach((item) => {
      const existing = itemMap.get(item.productId) || {
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        totalQty: 0,
        totalRevenue: 0,
        sellers: new Map<string, number>(),
      };

      existing.totalQty += item.quantity;
      existing.totalRevenue += item.total;

      if (item.sellerName) {
        const curSellerQty = existing.sellers.get(item.sellerName) || 0;
        existing.sellers.set(item.sellerName, curSellerQty + item.quantity);
      }

      itemMap.set(item.productId, existing);
    });
  });

  const itemizedList = Array.from(itemMap.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header and Choice Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-rose-500" />
            <h1 className="text-xl font-black text-slate-100">
              ສະຫຼຸບຍອດຂາຍ 689 KTV (Sales Reports)
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            ເລືອກເບິ່ງສະຫຼຸບລວມທັງໝົດ ຫຼື ສະຫຼຸບແຍກລາຍການສິນຄ້າ (ນ້ຳ, ເບຍ, ອາຫານ)
          </p>
        </div>

        {/* Choice 1 vs Choice 2 Tabs */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80">
          <button
            onClick={() => setActiveChoice('overall')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeChoice === 'overall'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Choice 1: ສະຫຼຸບລວມທັງໝົດ
          </button>
          <button
            onClick={() => setActiveChoice('itemized')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeChoice === 'itemized'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Choice 2: ສະຫຼຸບແຍກລາຍການ
          </button>
        </div>
      </div>

      {/* Timeframe Filter Bar (Daily, Monthly, Yearly) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setTimeframe('daily')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'daily'
                ? 'bg-slate-700 text-white border border-slate-600'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ລາຍວັນ (Daily)
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'monthly'
                ? 'bg-slate-700 text-white border border-slate-600'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ລາຍເດືອນ (Monthly)
          </button>
          <button
            onClick={() => setTimeframe('yearly')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'yearly'
                ? 'bg-slate-700 text-white border border-slate-600'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ລາຍປີ (Yearly)
          </button>
        </div>

        {/* Date Selector input depending on timeframe */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {timeframe === 'daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          )}

          {timeframe === 'monthly' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          )}

          {timeframe === 'yearly' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y.toString()}>
                  ປີ {y}
                </option>
              ))}
            </select>
          )}

          {onSyncAllToSheets && (
            <button
              onClick={onSyncAllToSheets}
              disabled={isSyncingSheets}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isSyncingSheets ? 'ກຳລັງຊິ້ງ...' : 'ຊິ້ງລົງ Google Sheets'}</span>
            </button>
          )}
        </div>
      </div>

      {/* CHOICE 1: OVERALL SUMMARY */}
      {activeChoice === 'overall' && (
        <div className="space-y-6">
          {/* 4 Cards Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>ຍອດຂາຍລວມທັງໝົດ</span>
                <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-400">
                {formatCurrency(totalRevenue, settings.currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                ຈຳນວນ {filteredBills.length} ໃບບິນ
              </p>
            </div>

            {/* Card 2: Room Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>ຄ່າຫ້ອງຄາຣາໂອເກະ</span>
                <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400">
                  <DoorOpen className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-purple-400">
                {formatCurrency(totalRoomCharge, settings.currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {((totalRoomCharge / (totalRevenue || 1)) * 100).toFixed(1)}% ຂອງຍອດຂາຍ
              </p>
            </div>

            {/* Card 3: Food & Drinks Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>ຄ່າເຄື່ອງດື່ມ & ອາຫານ</span>
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Beer className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-amber-400">
                {formatCurrency(totalItemsCharge, settings.currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {((totalItemsCharge / (totalRevenue || 1)) * 100).toFixed(1)}% ຂອງຍອດຂາຍ
              </p>
            </div>

            {/* Card 4: Payment Split */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>ຊ່ອງທາງຊຳລະເງິນ</span>
                <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <PieChart className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">💵 ເງິນສົດ:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrency(totalCash, settings.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">📱 ໂອນ/QR:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {formatCurrency(totalTransfer, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bills History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-500" />
                <span>ປະຫວັດໃບບິນໃນຊ່ວງເວລານີ້ ({filteredBills.length} ບິນ)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                    <th className="py-3 px-4">ເລກທີບິນ</th>
                    <th className="py-3 px-4">ເວລາ</th>
                    <th className="py-3 px-4">ປະເພດ / ຫ້ອງ</th>
                    <th className="py-3 px-4">ພະນັກງານ</th>
                    <th className="py-3 px-4 text-right">ຄ່າຫ້ອງ</th>
                    <th className="py-3 px-4 text-right">ຄ່າສິນຄ້າ</th>
                    <th className="py-3 px-4 text-right">ຍອດສຸດທິ</th>
                    <th className="py-3 px-4 text-center">ຊຳລະ</th>
                    <th className="py-3 px-4 text-center">ເບິ່ງບິນ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        ບໍ່ພົບໃບບິນໃນຊ່ວງເວລານີ້
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {b.billNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(b.endTime).toLocaleTimeString('lo-LA')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              b.type === 'ktv_room'
                                ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {b.roomName || 'ຂາຍໜ້າຮ້ານ (POS)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{b.staffName}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatCurrency(b.roomCharge, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatCurrency(
                            b.items.reduce((s, i) => s + i.total, 0),
                            settings.currencySymbol
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-400">
                          {formatCurrency(b.total, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              b.payment.method === 'cash'
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-blue-950 text-blue-400'
                            }`}
                          >
                            {b.payment.method === 'cash' ? 'ເງິນສົດ' : 'ໂອນ'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setInspectedBill(b)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CHOICE 2: ITEMIZED PRODUCT BREAKDOWN */}
      {activeChoice === 'itemized' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-100 mb-1 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              <span>
                ລາຍລະອຽດສິນຄ້າທີ່ຂາຍໄດ້ (ແຍກຕາມຈຳນວນຂາຍ ແລະ ຍອດເງິນ)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              ຕົວຢ່າງ: ນ້ຳດື່ມຂາຍໄດ້ທັງໝົດຈັກຕຸກ, ເບຍລາວຂາຍໄດ້ຈັກແກ້ວ, ຍອດຂາຍແຕ່ລະລາຍການເທົ່າໃດ
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                    <th className="py-3 px-4">ຊື່ສິນຄ້າ (Product Name)</th>
                    <th className="py-3 px-4 text-center">ຈຳນວນທີ່ຂາຍໄດ້ (Units Sold)</th>
                    <th className="py-3 px-4 text-right">ຍອດຂາຍລວມ (Total Revenue)</th>
                    <th className="py-3 px-4 text-left">ພະນັກງານທີ່ຂາຍ/ເສີບ (Sellers)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {itemizedList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        ບໍ່ມີລາຍການຂາຍສິນຄ້າໃນຊ່ວງເວລານີ້
                      </td>
                    </tr>
                  ) : (
                    itemizedList.map((item, idx) => {
                      const sellersArr = Array.from(item.sellers.entries());
                      return (
                        <tr key={item.productId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-100 flex items-center gap-2">
                              <span className="w-5 text-center text-slate-500 font-mono">
                                #{idx + 1}
                              </span>
                              <span>{item.productName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono text-sm font-extrabold text-amber-400">
                              {item.totalQty}
                            </span>{' '}
                            <span className="text-[11px] text-slate-400">{item.unit}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 text-sm">
                            {formatCurrency(item.totalRevenue, settings.currencySymbol)}
                          </td>
                          <td className="py-3 px-4">
                            {sellersArr.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {sellersArr.map(([sellerName, qty]) => (
                                  <span
                                    key={sellerName}
                                    className="bg-purple-950/60 border border-purple-800/50 text-purple-300 text-[10px] px-1.5 py-0.5 rounded"
                                  >
                                    {sellerName}: {qty} {item.unit}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Individual Bill Details */}
      {inspectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-100">
                  ລາຍລະອຽດໃບບິນ: {inspectedBill.billNumber}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {new Date(inspectedBill.endTime).toLocaleString('lo-LA')}
                </p>
              </div>
              <button
                onClick={() => setInspectedBill(null)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs mb-4 max-h-60 overflow-y-auto pr-1">
              {inspectedBill.startTime && (
                <div className="flex justify-between py-1 border-b border-slate-800 text-[11px] text-slate-300">
                  <span>ເວລາເປີດ - ສິ້ນສຸດ:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {new Date(inspectedBill.startTime).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', hour12: false })} ຫາ {new Date(inspectedBill.endTime).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              )}
              {inspectedBill.timeRangeFormatted && (
                <div className="flex justify-between py-0.5 text-[10px] text-slate-400">
                  <span>ກຳນົດໄລຍະເວລາ:</span>
                  <span>{inspectedBill.timeRangeFormatted}</span>
                </div>
              )}
              {inspectedBill.roomCharge > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>ຄ່າຫ້ອງ ({inspectedBill.roomName})</span>
                  <span className="font-mono text-amber-400">
                    {formatCurrency(inspectedBill.roomCharge, settings.currencySymbol)}
                  </span>
                </div>
              )}

              {inspectedBill.items.map((it, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-slate-800/60">
                  <div>
                    <span className="font-semibold text-slate-200">{it.productName}</span>
                    <span className="text-[10px] text-slate-400 block">
                      {it.quantity} {it.unit} x {formatCurrency(it.price, '')}
                      {it.sellerName ? ` (ເສີບ: ${it.sellerName})` : ''}
                    </span>
                  </div>
                  <span className="font-mono text-slate-200">
                    {formatCurrency(it.total, settings.currencySymbol)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>ລວມເງິນ:</span>
                <span>{formatCurrency(inspectedBill.subtotal, settings.currencySymbol)}</span>
              </div>
              {inspectedBill.discount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>ສ່ວນຫຼຸດ:</span>
                  <span>-{formatCurrency(inspectedBill.discount, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-rose-400 pt-1 border-t border-slate-700">
                <span>ຍອດສຸດທິ:</span>
                <span>{formatCurrency(inspectedBill.total, settings.currencySymbol)}</span>
              </div>
            </div>

            <button
              onClick={() => setInspectedBill(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              ປິດ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
