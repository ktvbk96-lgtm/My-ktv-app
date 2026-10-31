import React, { useState } from 'react';
import {
  Settings,
  Printer,
  Bluetooth,
  KeyRound,
  Users,
  Store,
  DollarSign,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { AppSettings, StaffMember, RoomPackage } from '../types';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  isWebBluetoothSupported,
} from '../lib/bluetoothPrinter';

interface SettingsModalProps {
  settings: AppSettings;
  staffList: StaffMember[];
  packages: RoomPackage[];
  onSaveSettings: (newSettings: AppSettings) => void;
  onSaveStaff: (newStaff: StaffMember[]) => void;
  onSavePackages: (newPackages: RoomPackage[]) => void;
  bluetoothConnected: boolean;
  onRefreshBluetoothStatus: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  staffList,
  packages,
  onSaveSettings,
  onSaveStaff,
  onSavePackages,
  bluetoothConnected,
  onRefreshBluetoothStatus,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [localStaff, setLocalStaff] = useState<StaffMember[]>([...staffList]);
  const [localPackages, setLocalPackages] = useState<RoomPackage[]>([...packages]);

  const [activeTab, setActiveTab] = useState<'receipt' | 'security' | 'printer' | 'staff' | 'packages'>(
    'receipt'
  );

  // New Staff inputs
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [newStaffPhone, setNewStaffPhone] = useState<string>('');

  // Bluetooth connection states
  const [btLoading, setBtLoading] = useState<boolean>(false);
  const [btMessage, setBtMessage] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onSaveStaff(localStaff);
    onSavePackages(localPackages);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleConnectBt = async () => {
    setBtLoading(true);
    setBtMessage('');
    try {
      const res = await connectBluetoothPrinter();
      if (res.connected) {
        setBtMessage(`ເຊື່ອມຕໍ່ສຳເລັດ: ${res.deviceName}`);
        onRefreshBluetoothStatus();
      } else {
        setBtMessage(`ບໍ່ສາມາດເຊື່ອມຕໍ່ໄດ້: ${res.error}`);
      }
    } catch (err: any) {
      setBtMessage(`ຂໍ້ຜິດພາດ: ${err.message}`);
    } finally {
      setBtLoading(false);
    }
  };

  const handleDisconnectBt = async () => {
    await disconnectBluetoothPrinter();
    onRefreshBluetoothStatus();
    setBtMessage('ຕັດການເຊື່ອມຕໍ່ Bluetooth ແລ້ວ');
  };

  const handleAddStaff = () => {
    if (!newStaffName.trim()) return;
    const newMember: StaffMember = {
      id: 'staff-' + Date.now(),
      name: newStaffName.trim(),
      role: 'staff',
      phone: newStaffPhone.trim(),
      active: true,
    };
    const updated = [...localStaff, newMember];
    setLocalStaff(updated);
    setNewStaffName('');
    setNewStaffPhone('');
  };

  const handleRemoveStaff = (id: string) => {
    if (confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບພະນັກງານຄົນນີ້?')) {
      const updated = localStaff.filter((s) => s.id !== id);
      setLocalStaff(updated);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-black text-slate-100">
              ຕັ້ງຄ່າລະບົບ 689 KTV (System Settings)
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            ປັບແຕ່ງຫົວໃບບິນ, ລະຫັດ PIN, ເຊື່ອມຕໍ່ Bluetooth Printer, ແລະ ລາຍຊື່ພະນັກງານ
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>ບັນທຶກການຕັ້ງຄ່າສຳເລັດແລ້ວ!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'receipt', label: 'ຫົວໃບບິນ / ຮ້ານ', icon: Store },
          { id: 'printer', label: 'Bluetooth Printer', icon: Bluetooth },
          { id: 'security', label: 'ລະຫັດ PIN', icon: KeyRound },
          { id: 'staff', label: 'ພະນັກງານ', icon: Users },
          { id: 'packages', label: 'ແພັກເກັດຫ້ອງ', icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <form onSubmit={handleSaveAll} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {/* TAB 1: RECEIPT & SHOP SETTINGS */}
        {activeTab === 'receipt' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">
              ປັບແຕ່ງຫົວໃບບິນ ແລະ ຂໍ້ມູນຮ້ານ 689 KTV
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  ຊື່ຮ້ານໃນຫົວໃບບິນ (Shop Name):
                </label>
                <input
                  type="text"
                  required
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  placeholder="689 KTV"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  ຂໍ້ຄວາມຍ່ອຍຫົວໃບບິນ (Subheader):
                </label>
                <input
                  type="text"
                  value={formData.receiptHeader}
                  onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                  placeholder="ຄາຣາໂອເກະ ຄຸນນະພາບສູງ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  ເບີໂທລະສັບ (Phone):
                </label>
                <input
                  type="text"
                  value={formData.shopPhone}
                  onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
                  placeholder="020-5555-6899"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  WiFi Password (ສຳລັບລູກຄ້າ):
                </label>
                <input
                  type="text"
                  value={formData.wifiPassword || ''}
                  onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                  placeholder="Password: 689ktvvip"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">
                  ທີ່ຢູ່ຮ້ານ (Address):
                </label>
                <input
                  type="text"
                  value={formData.shopAddress}
                  onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                  placeholder="ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">
                  ຂໍ້ຄວາມທ້າຍໃບບິນ (Receipt Footer):
                </label>
                <input
                  type="text"
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="ຂໍຂອບໃຈລູກຄ້າທີ່ມາອຸດໜູນ ຍິນດີຕ້ອນຮັບສະເໝີ!"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  ສັນຍະລັກສະກຸນເງິນ (Currency Symbol):
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  ຄ່າຫ້ອງຕໍ່ຊົ່ວໂມງເລີ່ມຕົ້ນ ({formData.currencySymbol}/ຊມ):
                </label>
                <input
                  type="number"
                  step="10000"
                  value={formData.defaultHourlyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultHourlyRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BLUETOOTH PRINTER */}
        {activeTab === 'printer' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">
              ເຊື່ອມຕໍ່ Bluetooth Mini Thermal Printer
            </h3>

            <p className="text-xs text-slate-400">
              ຮອງຮັບ Bluetooth Thermal Printer ຂະໜາດ 58mm ແລະ 80mm ທຸກລຸ້ນ ທຸກຍີ່ຫໍ້ (ESC/POS) ເຊັ່ນ GOOJPRT, XP-58, PT-210, MPT-II, POS-58
            </p>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    bluetoothConnected
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
                  }`}
                >
                  <Bluetooth className={`w-6 h-6 ${bluetoothConnected ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">
                    {bluetoothConnected
                      ? 'Bluetooth Printer ເຊື່ອມຕໍ່ແລ້ວ (ພ້ອມພິມ)'
                      : 'ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່ Bluetooth Printer'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isWebBluetoothSupported()
                      ? 'Web Bluetooth API ພ້ອມໃຊ້ງານໃນ Browser ນີ້'
                      : 'Browser ບໍ່ຮອງຮັບ Web Bluetooth (ແນະນຳໃຊ້ Google Chrome / Edge)'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {bluetoothConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectBt}
                    className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    ຕັດການເຊື່ອມຕໍ່
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectBt}
                    disabled={btLoading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Bluetooth className="w-4 h-4" />
                    <span>{btLoading ? 'ກຳລັງຄົ້ນຫາ...' : 'ຄົ້ນຫາ & ເຊື່ອມຕໍ່ Bluetooth'}</span>
                  </button>
                )}
              </div>
            </div>

            {btMessage && (
              <div className="p-3 bg-slate-800 rounded-xl text-xs text-slate-300 font-mono">
                {btMessage}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PIN SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">
              ປ່ຽນລະຫັດ PIN 4 ຫຼັກ ສຳລັບເຂົ້າສູ່ລະບົບ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                <span className="font-bold text-xs text-amber-300 block">
                  👑 ລະຫັດ PIN Admin (ເຈົ້າຂອງຮ້ານ - 4 ຫຼັກ):
                </span>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={formData.adminPin}
                  onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                  placeholder="8888"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-lg font-mono font-bold text-amber-400 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  * ສາມາດເຂົ້າເມນູຕັ້ງຄ່າ, ລຶບຂໍ້ມູນ, ແລະ ເບິ່ງສະຫຼຸບຍອດທັງໝົດ
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-800/40 space-y-2">
                <span className="font-bold text-xs text-blue-300 block">
                  👤 ລະຫັດ PIN ພະນັກງານທົ່ວໄປ (Staff - 4 ຫຼັກ):
                </span>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={formData.staffPin}
                  onChange={(e) => setFormData({ ...formData, staffPin: e.target.value })}
                  placeholder="1234"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-lg font-mono font-bold text-blue-400 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400">
                  * ສາມາດຂາຍສິນຄ້າ, ເປີດຫ້ອງຄາຣາໂອເກະ, ແລະ ເຊັກບິນ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">
              ລາຍຊື່ພະນັກງານ ແລະ ຜູ້ຂາຍ
            </h3>

            {/* Add staff form */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="ຊື່ພະນັກງານ (ຕົວຢ່າງ: ນ້ອຍ, ຕຸກຕາ, ຄຳ...)"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="sm:col-span-6 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="ເບີໂທລະສັບ (ທາງເລືອກ)"
                value={newStaffPhone}
                onChange={(e) => setNewStaffPhone(e.target.value)}
                className="sm:col-span-4 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddStaff}
                className="sm:col-span-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ເພີ່ມ</span>
              </button>
            </div>

            {/* Staff list */}
            <div className="space-y-2">
              {localStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs">
                      {staff.name.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-100">{staff.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        {staff.role === 'admin' ? 'Admin / ເຈົ້າຂອງຮ້ານ' : 'ພະນັກງານ'}
                        {staff.phone ? ` • ${staff.phone}` : ''}
                      </p>
                    </div>
                  </div>

                  {staff.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(staff.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ROOM PACKAGES */}
        {activeTab === 'packages' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">
              ແພັກເກັດຫ້ອງຄາຣາໂອເກະ (Choice 1)
            </h3>

            <div className="space-y-3">
              {localPackages.map((pkg, idx) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => {
                        const updated = [...localPackages];
                        updated[idx].name = e.target.value;
                        setLocalPackages(updated);
                      }}
                      className="font-bold text-xs text-white bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="10000"
                        value={pkg.price}
                        onChange={(e) => {
                          const updated = [...localPackages];
                          updated[idx].price = parseFloat(e.target.value) || 0;
                          setLocalPackages(updated);
                        }}
                        className="w-28 text-right font-mono font-bold text-xs text-amber-400 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg"
                      />
                      <span className="text-xs text-slate-400">{formData.currencySymbol}</span>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={pkg.description}
                    onChange={(e) => {
                      const updated = [...localPackages];
                      updated[idx].description = e.target.value;
                      setLocalPackages(updated);
                    }}
                    placeholder="ລາຍລະອຽດແພັກເກັດ..."
                    className="w-full text-[11px] text-slate-300 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save button footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-xs shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ບັນທຶກການຕັ້ງຄ່າທັງໝົດ (Save Settings)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
