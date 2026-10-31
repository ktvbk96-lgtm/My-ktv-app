import React, { useState } from 'react';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  Share2,
  FileSpreadsheet,
  Clock,
  Sparkles,
  AlertCircle,
  Percent,
} from 'lucide-react';
import { BillRecord, AppSettings } from '../types';
import { formatCurrency } from '../lib/storage';
import { printViaBluetooth, isWebBluetoothSupported } from '../lib/bluetoothPrinter';

interface BillingModalProps {
  bill: BillRecord;
  settings: AppSettings;
  onClose: () => void;
  onConfirmPayment: (bill: BillRecord) => void;
  bluetoothConnected: boolean;
  onOpenBluetoothSetup: () => void;
  onSyncGoogleSheet?: (bill: BillRecord) => Promise<boolean>;
}

export const BillingModal: React.FC<BillingModalProps> = ({
  bill,
  settings,
  onClose,
  onConfirmPayment,
  bluetoothConnected,
  onOpenBluetoothSetup,
  onSyncGoogleSheet,
}) => {
  const [discount, setDiscount] = useState<number>(bill.discount || 0);
  const netTotal = Math.max(0, bill.subtotal - discount);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>(bill.payment.method);
  const [cashReceived, setCashReceived] = useState<string>(
    bill.payment.cashReceived?.toString() || netTotal.toString()
  );
  const [isPrintingBt, setIsPrintingBt] = useState<boolean>(false);
  const [printError, setPrintError] = useState<string>('');
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);

  const cashNum = parseFloat(cashReceived) || 0;
  const change = paymentMethod === 'cash' && cashNum > netTotal ? cashNum - netTotal : 0;

  // Handle discount adjustments
  const handleSetDiscount = (val: number) => {
    const safeDiscount = Math.min(bill.subtotal, Math.max(0, val));
    setDiscount(safeDiscount);
    const updatedTotal = Math.max(0, bill.subtotal - safeDiscount);
    if (paymentMethod === 'cash') {
      setCashReceived(updatedTotal.toString());
    }
  };

  const handleApplyPercent = (percent: number) => {
    const amount = Math.round((bill.subtotal * percent) / 100);
    handleSetDiscount(amount);
  };

  const handlePrintBluetooth = async () => {
    setIsPrintingBt(true);
    setPrintError('');
    setPrintSuccess(false);

    try {
      const updatedBill: BillRecord = {
        ...bill,
        discount,
        total: netTotal,
        payment: {
          method: paymentMethod,
          cashReceived: paymentMethod === 'cash' ? cashNum : undefined,
          change: paymentMethod === 'cash' ? change : undefined,
        },
      };
      await printViaBluetooth(updatedBill, settings);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 4000);
    } catch (err: any) {
      setPrintError(err.message || 'ບໍ່ສາມາດພິມຜ່ານ Bluetooth ໄດ້');
    } finally {
      setIsPrintingBt(false);
    }
  };

  const handleStandardPrint = () => {
    window.print();
  };

  const handleFinalConfirm = async () => {
    if (paymentMethod === 'cash' && cashNum < netTotal) {
      alert(`ເງິນສົດທີ່ຮັບມາບໍ່ພໍ! ຍອດລວມແມ່ນ: ${formatCurrency(netTotal, settings.currencySymbol)}`);
      return;
    }

    const finalBill: BillRecord = {
      ...bill,
      discount,
      total: netTotal,
      payment: {
        method: paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashNum : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
      },
    };

    if (settings.autoSyncGoogleSheets && onSyncGoogleSheet) {
      setIsSyncingSheet(true);
      try {
        await onSyncGoogleSheet(finalBill);
        finalBill.syncedToSheets = true;
      } catch (e) {
        console.error('Auto sync sheet error:', e);
      } finally {
        setIsSyncingSheet(false);
      }
    }

    onConfirmPayment(finalBill);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl text-white my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-100">
                ໃບບິນຮັບເງິນ / ເຊັກບິນ (689 KTV)
              </h3>
              <p className="text-xs text-slate-400">
                ເລກທີບິນ: <strong className="font-mono text-amber-400">{bill.billNumber}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Printable Receipt Paper Container (thermal preview) */}
        <div className="bg-slate-100 text-slate-900 p-5 rounded-2xl shadow-inner font-mono text-xs max-h-72 overflow-y-auto border border-slate-300 print:max-h-none print:shadow-none print:m-0 print:p-2 print:border-none print-receipt-container">
          {/* Header 689 KTV */}
          <div className="text-center pb-2 border-b border-dashed border-slate-400">
            <h2 className="text-base font-black tracking-wider text-slate-950">
              {settings.shopName}
            </h2>
            <p className="text-[11px] font-semibold text-slate-700">{settings.receiptHeader}</p>
            {settings.shopAddress && <p className="text-[10px] text-slate-600">{settings.shopAddress}</p>}
            {settings.shopPhone && <p className="text-[10px] text-slate-600">Tel: {settings.shopPhone}</p>}
            {settings.wifiPassword && (
              <p className="text-[10px] text-slate-600">WiFi: {settings.wifiPassword}</p>
            )}
          </div>

          {/* Bill Meta */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span>ເລກທີບິນ:</span>
              <span className="font-bold">{bill.billNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>ວັນທີ-ເວລາ:</span>
              <span>{new Date(bill.endTime).toLocaleString('lo-LA')}</span>
            </div>
            <div className="flex justify-between">
              <span>ພະນັກງານ:</span>
              <span>{bill.staffName}</span>
            </div>
            {bill.roomName && (
              <div className="flex justify-between font-bold text-slate-900 pt-1">
                <span>ຫ້ອງ KTV:</span>
                <span>{bill.roomName}</span>
              </div>
            )}
            {bill.startTime && (
              <div className="flex justify-between font-bold text-slate-950 py-0.5 bg-slate-200/80 px-1.5 rounded">
                <span>ເວລາເປີດ - ສິ້ນສຸດ:</span>
                <span className="font-mono">
                  {new Date(bill.startTime).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', hour12: false })} ຫາ {new Date(bill.endTime).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
            )}
            {bill.timeRangeFormatted && (
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>ກຳນົດໄລຍະເວລາ:</span>
                <span>{bill.timeRangeFormatted}</span>
              </div>
            )}
            {bill.durationMinutes !== undefined && bill.durationMinutes > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>ໄລຍະເວລາໃຊ້ງານຈິງ:</span>
                <span>
                  {Math.floor(bill.durationMinutes / 60)} ຊມ {bill.durationMinutes % 60} ນາທີ ({bill.durationMinutes} ນາທີ)
                </span>
              </div>
            )}
          </div>

          {/* Items breakdown */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5">
            {bill.roomCharge > 0 && (
              <div className="flex justify-between font-semibold">
                <span>ຄ່າຫ້ອງຄາຣາໂອເກະ</span>
                <span>{formatCurrency(bill.roomCharge, settings.currencySymbol)}</span>
              </div>
            )}

            {bill.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-medium truncate max-w-[200px]">
                    {item.productName}
                  </span>
                  <span>{formatCurrency(item.total, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>
                    {item.quantity} {item.unit} x {formatCurrency(item.price, '')}
                  </span>
                  {item.sellerName && <span>ເສີບ: {item.sellerName}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-700">
              <span>ລວມເງິນ:</span>
              <span>{formatCurrency(bill.subtotal, settings.currencySymbol)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>ສ່ວນຫຼຸດ (Discount):</span>
                <span>-{formatCurrency(discount, settings.currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-950 pt-1 border-t border-slate-400">
              <span>ຍອດສຸດທິ (TOTAL):</span>
              <span>{formatCurrency(netTotal, settings.currencySymbol)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px] text-slate-700">
            <div className="flex justify-between">
              <span>ວິທີຊຳລະ:</span>
              <span className="font-bold">
                {paymentMethod === 'cash' ? 'ເງິນສົດ (CASH)' : 'ໂອນເງິນ / QR'}
              </span>
            </div>
            {paymentMethod === 'cash' && cashNum > 0 && (
              <>
                <div className="flex justify-between">
                  <span>ຮັບເງິນສົດ:</span>
                  <span>{formatCurrency(cashNum, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>ເງິນທອນ:</span>
                  <span>{formatCurrency(change, settings.currencySymbol)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 text-center text-[10px] text-slate-600 space-y-0.5">
            <p>{settings.receiptFooter}</p>
            <p className="font-black text-slate-900">*** 689 KTV ***</p>
          </div>
        </div>

        {/* Dynamic Discount Controls (ກົດສ່ວນຫຼຸດຕາມໃຈ) */}
        <div className="mt-3 bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              <span>ກົດສ່ວນຫຼຸດຕາມໃຈ (Discount Controls):</span>
            </div>
            {discount > 0 && (
              <button
                type="button"
                onClick={() => handleSetDiscount(0)}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
              >
                ລ້າງສ່ວນຫຼຸດ (0 ₭)
              </button>
            )}
          </div>

          {/* Quick percentage pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400">ເປີເຊັນ:</span>
            {[5, 10, 15, 20, 30, 50, 100].map((p) => {
              const isSelected = discount === Math.round((bill.subtotal * p) / 100);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleApplyPercent(p)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p === 100 ? 'ຟຣີ (100%)' : `${p}%`}
                </button>
              );
            })}
          </div>

          {/* Quick cash discount presets & custom amount input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-1 flex-wrap">
              {[10000, 20000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSetDiscount(amt)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300 cursor-pointer"
                >
                  -{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[11px] text-slate-400">ປ້ອນເອງ:</span>
              <input
                type="number"
                step="5000"
                min="0"
                max={bill.subtotal}
                value={discount || ''}
                onChange={(e) => handleSetDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-xs text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-400">{settings.currencySymbol}</span>
            </div>
          </div>
        </div>

        {/* Payment and Print Settings */}
        <div className="mt-3 space-y-3">
          {/* Method Choice */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>ເງິນສົດ (Cash)</span>
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'transfer'
                  ? 'bg-blue-600 border-blue-500 text-white shadow'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>ໂອນເງິນ / QR</span>
            </button>
          </div>

          {/* Cash input */}
          {paymentMethod === 'cash' && (
            <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300 font-medium">ຈຳນວນເງິນສົດທີ່ຮັບ:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-right font-mono text-sm text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-400">{settings.currencySymbol}</span>
              </div>
            </div>
          )}

          {/* Bluetooth Print Status / Error */}
          {printError && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{printError}</span>
            </div>
          )}

          {printSuccess && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ສັ່ງພິມໃບບິນຜ່ານ Bluetooth ສຳເລັດແລ້ວ!</span>
            </div>
          )}

          {/* Print & Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Bluetooth Thermal Print */}
            <button
              onClick={handlePrintBluetooth}
              disabled={isPrintingBt}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                bluetoothConnected
                  ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Bluetooth className={`w-4 h-4 ${isPrintingBt ? 'animate-spin' : ''}`} />
              <span>
                {isPrintingBt
                  ? 'ກຳລັງພິມ...'
                  : bluetoothConnected
                  ? 'ພິມຜ່ານ Bluetooth'
                  : 'ເຊື່ອມຕໍ່ & ພິມ BT'}
              </span>
            </button>

            {/* Standard Browser Print */}
            <button
              onClick={handleStandardPrint}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>ພິມແບບທົ່ວໄປ (Print)</span>
            </button>
          </div>

          {/* Confirm & Close */}
          <div className="pt-2">
            <button
              onClick={handleFinalConfirm}
              disabled={isSyncingSheet}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-sm font-black shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isSyncingSheet ? 'ກຳລັງບັນທຶກ Google Sheets...' : 'ຢືນຢັນການຊຳລະເງິນ & ສຳເລັດ'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
