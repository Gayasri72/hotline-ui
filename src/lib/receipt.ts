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
  taxTotal?: number;
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
}

const receiptStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', Arial, sans-serif; 
    font-size: 12px; 
    width: 80mm; 
    padding: 5mm;
    background: #fff;
  }
  .receipt { max-width: 72mm; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 3mm; border-bottom: 1px dashed #333; }
  .logo { font-size: 18px; font-weight: bold; color: #1a1a2e; margin-bottom: 2mm; }
  .shop-info { font-size: 10px; color: #666; }
  .section { padding: 3mm 0; border-bottom: 1px dashed #ccc; }
  .section-title { font-weight: bold; font-size: 11px; color: #333; margin-bottom: 2mm; text-transform: uppercase; letter-spacing: 0.5px; }
  .row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
  .row.total { font-weight: bold; font-size: 14px; border-top: 1px solid #333; padding-top: 2mm; margin-top: 2mm; }
  .item-name { flex: 1; }
  .item-qty { width: 15mm; text-align: center; color: #666; }
  .item-price { width: 22mm; text-align: right; }
  .label { color: #666; }
  .value { font-weight: 500; }
  .highlight { color: #0d6efd; }
  .footer { text-align: center; padding-top: 3mm; font-size: 10px; color: #666; }
  .footer .thanks { font-size: 12px; font-weight: bold; color: #333; margin-bottom: 2mm; }
  .meta { font-size: 10px; color: #888; }
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
          <div class="row">
            <span class="label">Tax</span>
            <span class="value">${formatCurrency(sale.taxTotal || 0)}</span>
          </div>
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
          </div>` : ''}
          <div class="row">
            <span class="label">Amount Received</span>
            <span class="value">${formatCurrency(repair.amountReceived || 0)}</span>
          </div>
          ${(repair.change || 0) > 0 ? `
          <div class="row">
            <span class="label">Change</span>
            <span class="value">${formatCurrency(repair.change || 0)}</span>
          </div>` : ''}
        </div>

        <div class="footer">
          <div class="thanks">Thank you for choosing us! 💙</div>
          <div>${shopFooter || 'Quality repairs, always'}</div>
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
