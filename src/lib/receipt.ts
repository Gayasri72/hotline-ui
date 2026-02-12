import { getReceiptHeader, getReceiptFooter } from './settings';

// Declare type for electronPrint
declare global {
  interface Window {
    electronPrint?: {
      silentPrint: (html: string) => Promise<{ success: boolean }>;
    };
  }
}

interface SaleItem {
  productName?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SaleData {
  saleNumber?: string;
  items?: SaleItem[];
  subtotal?: number;
  discountTotal?: number;

  grandTotal?: number;
  amountPaid?: number;
  changeGiven?: number;
}

interface RepairData {
  jobNumber: string;
  customer: { name: string; phone: string };
  device: { brand: string; model: string };
  problemDescription?: string;
  repairNotes?: string;
  partsUsed?: { productName: string; quantity: number; unitPrice: number; total: number }[];
  partsTotal?: number;
  laborCost?: number;
  totalCost?: number;
  advancePayment?: number;
  amountReceived?: number;
  change?: number;
  payments?: { method: string; amount: number }[];
}

interface DeviceReceivedData {
  jobNumber: string;
  customer: { name: string; phone: string; email?: string };
  device: { 
    brand: string; 
    model: string; 
    imei?: string;
    serialNumber?: string;
    color?: string;
    accessories?: string[];
  };
  problemDescription?: string;
  estimatedCost?: number;
  advancePayment?: number;
  receivedAt?: string;
  createdAt?: string;
  receivedBy?: { username?: string };
}

const receiptStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', Arial, sans-serif; 
    font-size: 12px; 
    width: 80mm; 
    padding: 5mm;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt { max-width: 72mm; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 3mm; border-bottom: 2px dashed #333; }
  .logo { font-size: 16px; font-weight: bold; color: #000; margin-bottom: 2mm; }
  .shop-info { font-size: 10px; color: #333; line-height: 1.4; }
  .section { padding: 3mm 0; border-bottom: 1px dashed #999; }
  .section-title { font-weight: bold; font-size: 11px; color: #000; margin-bottom: 2mm; text-transform: uppercase; letter-spacing: 0.5px; background: #eee; padding: 1mm 2mm; }
  .row { display: flex; justify-content: space-between; margin-bottom: 1mm; gap: 2mm; }
  .row.total { font-weight: bold; font-size: 13px; border-top: 2px solid #000; padding-top: 2mm; margin-top: 2mm; }
  .item-name { flex: 1; word-wrap: break-word; overflow-wrap: break-word; }
  .item-qty { min-width: 12mm; text-align: center; color: #333; }
  .item-price { min-width: 22mm; text-align: right; white-space: nowrap; }
  .label { color: #333; min-width: 25mm; }
  .value { font-weight: 600; color: #000; text-align: right; word-wrap: break-word; flex: 1; }
  .highlight { color: #0066cc; font-weight: 600; }
  .footer { text-align: center; padding-top: 4mm; font-size: 10px; color: #333; border-top: 2px dashed #333; margin-top: 2mm; }
  .footer .thanks { font-size: 12px; font-weight: bold; color: #000; margin-bottom: 2mm; }
  .meta { font-size: 10px; color: #555; }
  .note { font-size: 9px; color: #666; font-style: italic; margin-top: 2mm; text-align: center; padding: 2mm; background: #f5f5f5; border-radius: 2mm; }
`;

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(): string {
  return new Date().toLocaleString('en-LK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function generateSaleReceiptHTML(sale: SaleData): string {
  const shopHeader = getReceiptHeader();
  const shopFooter = getReceiptFooter();

  const itemsHTML = sale.items?.map(item => `
    <div class="row">
      <span class="item-name">${item.productName || 'Item'}</span>
      <span class="item-qty">×${item.quantity}</span>
      <span class="item-price">${formatCurrency(item.total)}</span>
    </div>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${sale.saleNumber}</title>
      <style>${receiptStyles}</style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo">✦ ${shopHeader.split('\n')[0] || 'HOTLINE POS'} ✦</div>
          <div class="shop-info">${shopHeader.split('\n').slice(1).join('<br>')}</div>
        </div>

        <div class="section">
          <div class="row meta">
            <span>Receipt #: ${sale.saleNumber || 'N/A'}</span>
            <span>${formatDate()}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Items</div>
          ${itemsHTML}
        </div>

        <div class="section">
          <div class="row">
            <span class="label">Subtotal</span>
            <span class="value">${formatCurrency(sale.subtotal || 0)}</span>
          </div>
          ${(sale.discountTotal || 0) > 0 ? `
          <div class="row">
            <span class="label highlight">Discount</span>
            <span class="value highlight">-${formatCurrency(sale.discountTotal || 0)}</span>
          </div>` : ''}
          <div class="row total">
            <span>TOTAL</span>
            <span>${formatCurrency(sale.grandTotal || 0)}</span>
          </div>
        </div>

        <div class="section">
          <div class="row">
            <span class="label">Amount Paid</span>
            <span class="value">${formatCurrency(sale.amountPaid || 0)}</span>
          </div>
          ${(sale.changeGiven || 0) > 0 ? `
          <div class="row">
            <span class="label">Change</span>
            <span class="value">${formatCurrency(sale.changeGiven || 0)}</span>
          </div>` : ''}
        </div>

        <div class="footer">
          <div class="thanks">Thank you for your visit! 💙</div>
          <div>${shopFooter || 'Come again soon'}</div>
          <div style="margin-top: 2mm; font-size: 9px; color: #888;">System by Pixzoralabs</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateRepairReceiptHTML(repair: RepairData): string {
  const shopHeader = getReceiptHeader();
  const shopFooter = getReceiptFooter();

  const partsHTML = repair.partsUsed?.map(part => `
    <div class="row">
      <span class="item-name">${part.productName}</span>
      <span class="item-qty">×${part.quantity}</span>
      <span class="item-price">${formatCurrency(part.total)}</span>
    </div>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Repair Receipt - ${repair.jobNumber}</title>
      <style>${receiptStyles}</style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo">✦ ${shopHeader.split('\n')[0] || 'HOTLINE POS'} ✦</div>
          <div class="shop-info">${shopHeader.split('\n').slice(1).join('<br>')}</div>
        </div>

        <div class="section">
          <div class="row meta">
            <span>Job #: ${repair.jobNumber}</span>
            <span>${formatDate()}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Customer</div>
          <div class="row">
            <span class="label">Name</span>
            <span class="value">${repair.customer.name}</span>
          </div>
          <div class="row">
            <span class="label">Phone</span>
            <span class="value">${repair.customer.phone}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Device</div>
          <div class="row">
            <span class="label">Device</span>
            <span class="value">${repair.device.brand} ${repair.device.model}</span>
          </div>
          <div class="row">
            <span class="label">Issue</span>
            <span class="value">${repair.problemDescription?.slice(0, 30) || 'N/A'}</span>
          </div>
        </div>

        ${repair.partsUsed?.length ? `
        <div class="section">
          <div class="section-title">Parts Used</div>
          ${partsHTML}
        </div>` : ''}

        <div class="section">
          <div class="row">
            <span class="label">Parts Total</span>
            <span class="value">${formatCurrency(repair.partsTotal || 0)}</span>
          </div>
          <div class="row">
            <span class="label">Labor Cost</span>
            <span class="value">${formatCurrency(repair.laborCost || 0)}</span>
          </div>
          <div class="row total">
            <span>TOTAL COST</span>
            <span>${formatCurrency(repair.totalCost || 0)}</span>
          </div>
        </div>

        <div class="section">
          ${(repair.advancePayment || 0) > 0 ? `
          <div class="row">
            <span class="label highlight">Advance Paid</span>
            <span class="value highlight">-${formatCurrency(repair.advancePayment || 0)}</span>
          </div>
          <div class="row">
            <span class="label">Balance Due</span>
            <span class="value">${formatCurrency(Math.max(0, (repair.totalCost || 0) - (repair.advancePayment || 0)))}</span>
          </div>` : ''}
          ${repair.payments && repair.payments.length > 1 ? `
          <div class="section-title">Payment Split</div>
          ${repair.payments.map(p => `
          <div class="row">
            <span class="label">${p.method === 'CASH' ? '💵 Cash' : p.method === 'CARD' ? '💳 Card' : p.method}</span>
            <span class="value">${formatCurrency(p.amount)}</span>
          </div>`).join('')}
          <div class="row">
            <span class="label">Total Paid</span>
            <span class="value">${formatCurrency(repair.amountReceived || 0)}</span>
          </div>` : `
          <div class="row">
            <span class="label">${repair.payments?.[0]?.method === 'CARD' ? '💳 Card Payment' : '💵 Cash Received'}</span>
            <span class="value">${formatCurrency(repair.amountReceived || 0)}</span>
          </div>`}
          ${(repair.change || 0) > 0 ? `
          <div class="row">
            <span class="label">Change</span>
            <span class="value">${formatCurrency(repair.change || 0)}</span>
          </div>` : ''}
        </div>

        <div class="footer">
          <div class="thanks">Thank you for choosing us! 💙</div>
          <div>${shopFooter || 'Quality repairs, always'}</div>
          <div style="margin-top: 2mm; font-size: 9px; color: #888;">System by Pixzoralabs</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateDeviceReceivedReceiptHTML(repair: DeviceReceivedData): string {
  const shopHeader = getReceiptHeader();

  const receivedDate = repair.receivedAt || repair.createdAt 
    ? new Date(repair.receivedAt || repair.createdAt!).toLocaleString('en-LK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      })
    : formatDate();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Device Received - ${repair.jobNumber}</title>
      <style>${receiptStyles}</style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo">✦ ${shopHeader.split('\n')[0] || 'HOTLINE POS'} ✦</div>
          <div class="shop-info">${shopHeader.split('\n').slice(1).join('<br>')}</div>
        </div>

        <div class="section">
          <div class="section-title">📋 DEVICE RECEIVED SLIP</div>
          <div class="row meta">
            <span>Job #: ${repair.jobNumber}</span>
            <span>${receivedDate}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">👤 Customer</div>
          <div class="row">
            <span class="label">Name</span>
            <span class="value">${repair.customer.name}</span>
          </div>
          <div class="row">
            <span class="label">Phone</span>
            <span class="value">${repair.customer.phone}</span>
          </div>
          ${repair.customer.email ? `<div class="row">
            <span class="label">Email</span>
            <span class="value">${repair.customer.email}</span>
          </div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">📱 Device</div>
          <div class="row">
            <span class="label">Device</span>
            <span class="value">${repair.device.brand} ${repair.device.model}</span>
          </div>
          ${repair.device.imei ? `<div class="row">
            <span class="label">IMEI</span>
            <span class="value">${repair.device.imei}</span>
          </div>` : ''}
          ${repair.device.serialNumber ? `<div class="row">
            <span class="label">Serial</span>
            <span class="value">${repair.device.serialNumber}</span>
          </div>` : ''}
          ${repair.device.color ? `<div class="row">
            <span class="label">Color</span>
            <span class="value">${repair.device.color}</span>
          </div>` : ''}
          ${repair.device.accessories?.length ? `<div class="row">
            <span class="label">Accessories</span>
            <span class="value">${repair.device.accessories.join(', ')}</span>
          </div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">🔧 Problem</div>
          <div style="font-size: 11px; color: #000; line-height: 1.4;">
            ${repair.problemDescription || 'N/A'}
          </div>
        </div>

        <div class="section">
          <div class="section-title">💰 Payment</div>
          <div class="row">
            <span class="label">Est. Cost</span>
            <span class="value">${formatCurrency(repair.estimatedCost || 0)}</span>
          </div>
          <div class="row">
            <span class="label highlight">Advance</span>
            <span class="value highlight">${formatCurrency(repair.advancePayment || 0)}</span>
          </div>
          <div class="row total">
            <span>Balance (Est)</span>
            <span>${formatCurrency((repair.estimatedCost || 0) - (repair.advancePayment || 0))}</span>
          </div>
        </div>

        <div class="section">
          <div class="row meta">
            <span>Received by: ${repair.receivedBy?.username || 'Staff'}</span>
          </div>
        </div>

        <div class="footer">
          <div class="thanks">📋 Please keep this slip safe</div>
          <div>Please bring this receipt for collection.</div>
          <div style="margin-top: 2mm; font-size: 9px; color: #888;">System by Pixzoralabs</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function printReceipt(html: string): Promise<boolean> {
  // Try Electron silent print first
  if (window.electronPrint?.silentPrint) {
    try {
      const result = await window.electronPrint.silentPrint(html);
      return result.success;
    } catch (error) {
      console.error('Silent print failed:', error);
      // Fallback to browser print
    }
  }

  // Fallback: Open window and print (for development/browser)
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
    return true;
  }
  return false;
}
