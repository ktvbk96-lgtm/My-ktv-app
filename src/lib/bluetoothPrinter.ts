import { BillRecord, AppSettings } from '../types';

// Web Bluetooth thermal printer driver (ESC/POS)
let bluetoothDevice: any = null;
let printerCharacteristic: any = null;

export interface BluetoothPrinterStatus {
  connected: boolean;
  deviceName?: string;
  error?: string;
}

export const isWebBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

export const connectBluetoothPrinter = async (): Promise<BluetoothPrinterStatus> => {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome or Edge.');
  }

  try {
    // Request device with common Bluetooth thermal printer service UUIDs or accept all devices
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Serial/Printer
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
        0xffe0, // Common Chinese mini thermal printers (GOOJPRT, PT-210, etc.)
        0x18f0,
      ],
    });

    device.addEventListener('gattserverdisconnected', onDisconnected);
    const server = await device.gatt.connect();

    // Look for write characteristic
    const services = await server.getPrimaryServices();
    let writeChar = null;

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error('No writable printer characteristic found on this device');
    }

    bluetoothDevice = device;
    printerCharacteristic = writeChar;

    return {
      connected: true,
      deviceName: device.name || 'Bluetooth Mini Printer',
    };
  } catch (err: any) {
    console.error('Bluetooth connection failed:', err);
    return {
      connected: false,
      error: err.message || 'Failed to connect to Bluetooth printer',
    };
  }
};

const onDisconnected = () => {
  bluetoothDevice = null;
  printerCharacteristic = null;
  window.dispatchEvent(new Event('689ktv_bluetooth_disconnected'));
};

export const disconnectBluetoothPrinter = async () => {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    await bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  printerCharacteristic = null;
};

export const getBluetoothStatus = (): BluetoothPrinterStatus => {
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected && printerCharacteristic) {
    return {
      connected: true,
      deviceName: bluetoothDevice.name || 'Bluetooth Thermal Printer',
    };
  }
  return { connected: false };
};

// Generate ESC/POS commands
export const generateEscPosReceipt = (bill: BillRecord, settings: AppSettings): Uint8Array => {
  const encoder = new TextEncoder();
  const chunks: number[] = [];

  const addBytes = (...bytes: number[]) => {
    chunks.push(...bytes);
  };

  const addText = (text: string) => {
    const encoded = encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) {
      chunks.push(encoded[i]);
    }
  };

  // Initialize printer: ESC @
  addBytes(0x1b, 0x40);

  // Center align: ESC a 1
  addBytes(0x1b, 0x61, 0x01);
  // Double height & width for header
  addBytes(0x1d, 0x21, 0x11);
  addText(`${settings.shopName}\n`);

  // Normal font
  addBytes(0x1d, 0x21, 0x00);
  addText(`${settings.receiptHeader}\n`);
  if (settings.shopAddress) addText(`${settings.shopAddress}\n`);
  if (settings.shopPhone) addText(`Tel: ${settings.shopPhone}\n`);
  if (settings.wifiPassword) addText(`WiFi: ${settings.wifiPassword}\n`);

  addText('--------------------------------\n');

  // Left align: ESC a 0
  addBytes(0x1b, 0x61, 0x00);
  addText(`Bill No : ${bill.billNumber}\n`);
  addText(`Date    : ${new Date(bill.endTime).toLocaleString('en-GB')}\n`);
  addText(`Staff   : ${bill.staffName}\n`);

  if (bill.type === 'ktv_room') {
    addText(`Room    : ${bill.roomName}\n`);
    if (bill.startTime) {
      const s = new Date(bill.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const e = new Date(bill.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      addText(`Time    : ${s} - ${e}\n`);
      if (bill.timeRangeFormatted) {
        addText(`Booked  : ${bill.timeRangeFormatted}\n`);
      }
      addText(`Duration: ${bill.durationMinutes || 0} mins\n`);
    }
    addText(`Room Fee: ${bill.roomCharge.toLocaleString()} Kip\n`);
  }

  addText('--------------------------------\n');
  addText('Item             Qty       Total\n');
  addText('--------------------------------\n');

  bill.items.forEach((item) => {
    const name = item.productName.substring(0, 15).padEnd(16, ' ');
    const qty = `${item.quantity} ${item.unit}`.padEnd(8, ' ');
    const total = `${item.total.toLocaleString()} K`.padStart(8, ' ');
    addText(`${name}${qty}${total}\n`);
    if (item.sellerName) {
      addText(`  (Server: ${item.sellerName})\n`);
    }
  });

  addText('--------------------------------\n');

  // Right align: ESC a 2
  addBytes(0x1b, 0x61, 0x02);
  addText(`Subtotal: ${bill.subtotal.toLocaleString()} Kip\n`);
  if (bill.discount > 0) {
    addText(`Discount: -${bill.discount.toLocaleString()} Kip\n`);
  }
  // Double size for total
  addBytes(0x1d, 0x21, 0x01);
  addText(`TOTAL: ${bill.total.toLocaleString()} Kip\n`);
  addBytes(0x1d, 0x21, 0x00);

  addText(`Payment: ${bill.payment.method === 'cash' ? 'CASH' : 'QR / TRANSFER'}\n`);
  if (bill.payment.cashReceived) {
    addText(`Received: ${bill.payment.cashReceived.toLocaleString()} Kip\n`);
    addText(`Change  : ${(bill.payment.change || 0).toLocaleString()} Kip\n`);
  }

  // Center align: ESC a 1
  addBytes(0x1b, 0x61, 0x01);
  addText('--------------------------------\n');
  addText(`${settings.receiptFooter}\n`);
  addText('*** 689 KTV ***\n\n\n\n');

  // Cut paper: GS V 66 0
  addBytes(0x1d, 0x56, 0x42, 0x00);

  return new Uint8Array(chunks);
};

export const printViaBluetooth = async (bill: BillRecord, settings: AppSettings): Promise<boolean> => {
  if (!printerCharacteristic) {
    const conn = await connectBluetoothPrinter();
    if (!conn.connected || !printerCharacteristic) {
      throw new Error(conn.error || 'Bluetooth printer is not connected');
    }
  }

  const data = generateEscPosReceipt(bill, settings);

  // Send chunks (max 512 bytes per packet for BLE stability)
  const chunkSize = 128;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (printerCharacteristic.writeValueWithoutResponse) {
      await printerCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await printerCharacteristic.writeValue(chunk);
    }
    await new Promise((res) => setTimeout(res, 30));
  }

  return true;
};
