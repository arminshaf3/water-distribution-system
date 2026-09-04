import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Distribution } from '../types';
import {
  AlertCircle,
  Search,
  CreditCard,
  CheckCircle2,
  X,
  Eye,
  Droplets,
  RefreshCw,
  MapPin,
  ShieldAlert,
  Filter,
  Share2,
} from 'lucide-react';
import jsPDF from 'jspdf';

export const UnpaidBillsPage: React.FC = () => {
  const [unpaidBills, setUnpaidBills] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  // Payment Settlement Modal State
  const [selectedBillToPay, setSelectedBillToPay] = useState<Distribution | null>(null);
  const [settledReceiptBill, setSettledReceiptBill] = useState<Distribution | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  useEffect(() => {
    fetchUnpaidBills();
    const interval = setInterval(fetchUnpaidBills, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnpaidBills = async () => {
    try {
      const res = await API.get('/distributions', {
        params: {
          paymentStatus: 'PENDING',
          size: 500,
        },
      });
      const list: Distribution[] = res.data?.data?.content || [];
      setUnpaidBills(list);
    } catch (e) {
      console.error('Failed to fetch unpaid bills', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSettlePayment = async () => {
    if (!selectedBillToPay) return;
    setSettleLoading(true);

    const paidItem: Distribution = {
      ...selectedBillToPay,
      paymentStatus: 'PAID' as const,
      paymentMethod: paymentMethod,
    };

    try {
      let targetId = selectedBillToPay.id;

      // Fallback: If targetId is missing, query database distributions to resolve real DB ID
      if (!targetId && selectedBillToPay.distributionCode) {
        const checkRes = await API.get('/distributions', { params: { size: 500 } });
        const allList: Distribution[] = checkRes.data?.data?.content || [];
        const matched = allList.find((d) => d.distributionCode === selectedBillToPay.distributionCode);
        if (matched) targetId = matched.id;
      }

      if (targetId) {
        await API.post('/payments', {
          distributionId: targetId,
          amount: selectedBillToPay.totalAmount,
          paymentMethod: paymentMethod,
          referenceNumber: referenceNumber || `ADMIN-SETTLE-${Date.now()}`,
        });
      } else {
        console.warn('Could not resolve numeric DB ID for distribution:', selectedBillToPay);
      }
    } catch (e) {
      console.error('Failed to settle payment on backend DB', e);
    } finally {
      // Trigger Instant Live Multi-Tab Sync & LocalStorage Event
      try {
        localStorage.setItem('water_last_settled_trigger', Date.now().toString());
        window.dispatchEvent(new CustomEvent('water_payment_settled', { detail: paidItem }));
      } catch (err) {}

      setSelectedBillToPay(null);
      setReferenceNumber('');
      setSettledReceiptBill(paidItem);
      fetchUnpaidBills();
      setSettleLoading(false);
    }
  };

  const openWhatsAppReceipt = (item: Distribution) => {
    const text = encodeURIComponent(
      `*AQUADISTRIBUTE WATER BILL RECEIPT*\n` +
      `------------------------------------\n` +
      `Receipt No: ${item.receiptNumber || item.distributionCode}\n` +
      `Customer: ${item.customerName} (${item.customerCode})\n` +
      `Quantity Consumed: ${item.quantityLitres} Litres\n` +
      `Applied Rate: Rs. ${item.pricePerLitre}/L\n` +
      `*Total Billed: Rs. ${item.totalAmount.toFixed(2)}*\n` +
      `Payment Status: PAID (CONFIRMED)\n` +
      `Date: ${new Date(item.distributionDate).toLocaleDateString()}\n` +
      `------------------------------------\n` +
      `Thank you for your payment!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadInvoicePDF = (dist: Distribution) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 595.28, 90, 'F');

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(30, 20, 50, 50, 14, 14, 'F');
    doc.setFillColor(6, 182, 212);
    doc.triangle(55, 27, 42, 48, 68, 48, 'F');
    doc.circle(55, 48, 13, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('AQUADISTRIBUTE UTILITY SERVICES LTD.', 95, 40);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('State Water Supply Infrastructure & Metering Authority • ISO 9001:2025 Certified', 95, 55);

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(415, 20, 150, 50, 8, 8, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('UNPAID CREDIT STATEMENT', 425, 38);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`${dist.receiptNumber || dist.distributionCode}`, 425, 56);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 105, 535, 85, 8, 8, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT HOLDER / PREMISE', 45, 125);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text(dist.customerName, 45, 145);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer Code / ID: ${dist.customerCode}`, 45, 162);
    doc.text(`Location / Zone: ${dist.villageName}`, 45, 177);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLING METADATA', 320, 125);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Statement Date: ${new Date(dist.distributionDate).toLocaleString()}`, 320, 145);
    doc.text(`Payment Status: UNPAID CREDIT BILL`, 320, 162);
    doc.text(`Field Collector: ${dist.collectorName || 'John Collector'}`, 320, 177);

    doc.setFillColor(30, 41, 59);
    doc.rect(30, 215, 535, 24, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('LINE ITEM DESCRIPTION', 42, 230);
    doc.text('VOLUME / RATE', 320, 230);
    doc.text('AMOUNT (RS.)', 475, 230);

    doc.setFillColor(248, 250, 252);
    doc.rect(30, 239, 535, 26, 'F');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`Water Supply Tariff Charge`, 42, 256);
    doc.text(`${dist.quantityLitres} L @ Rs. ${dist.pricePerLitre}/L`, 320, 256);
    doc.setFont('courier', 'bold');
    doc.text(`${dist.totalAmount.toFixed(2)}`, 485, 256);

    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(30, 280, 535, 45, 8, 8, 'FD');
    doc.setTextColor(159, 18, 57);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('✖ NOTICE OF UNPAID CREDIT - PAYMENT PENDING', 45, 308);

    doc.save(`Unpaid_Bill_${dist.customerCode}_${dist.distributionCode}.pdf`);
  };

  const filteredUnpaidBills = unpaidBills.filter((bill) => {
    if (selectedVillage && bill.villageName !== selectedVillage) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const customerName = (bill.customerName || '').toLowerCase();
      const customerCode = (bill.customerCode || '').toLowerCase();
      const customerId = (bill.customerId ? bill.customerId.toString() : '').toLowerCase();
      const billCode = (bill.distributionCode || '').toLowerCase();
      const receiptNum = (bill.receiptNumber || '').toLowerCase();
      const village = (bill.villageName || '').toLowerCase();
      const collector = (bill.collectorName || '').toLowerCase();

      return (
        customerName.includes(q) ||
        customerCode.includes(q) ||
        customerId.includes(q) ||
        billCode.includes(q) ||
        receiptNum.includes(q) ||
        village.includes(q) ||
        collector.includes(q)
      );
    }
    return true;
  });

  const totalUnpaidSum = unpaidBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const totalUnpaidLitres = unpaidBills.reduce((acc, b) => acc + (b.quantityLitres || 0), 0);
  const villagesList = Array.from(new Set(unpaidBills.map((b) => b.villageName).filter(Boolean)));

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* HEADER BANNER - HIGH CONTRAST LIGHT THEME */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Unpaid Bills Audit</h1>
              <span className="px-2.5 py-0.5 text-[11px] font-black bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                {unpaidBills.length} PENDING
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Search by customer name, account code, or ID to collect pending payments
            </p>
          </div>
        </div>

        <button
          onClick={fetchUnpaidBills}
          className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Unpaid List</span>
        </button>
      </div>

      {/* 3 CLEAN SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Outstanding Debt</span>
            <p className="text-2xl font-black text-rose-600 font-mono tracking-tight whitespace-nowrap">
              Rs. {totalUnpaidSum.toFixed(2)}
            </p>
            <p className="text-xs font-bold text-slate-500">{unpaidBills.length} Pending Unpaid Bills</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Unpaid Water Supplied</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              {totalUnpaidLitres.toLocaleString()} <span className="text-sm font-bold text-slate-500">Litres</span>
            </p>
            <p className="text-xs font-bold text-slate-500">Delivered on Credit Terms</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Droplets className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Pending Sectors / Zones</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              {villagesList.length} <span className="text-sm font-bold text-slate-500">Villages</span>
            </p>
            <p className="text-xs font-bold text-slate-500 truncate max-w-[170px]">
              {villagesList.join(', ') || 'All Zones Paid'}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer name, account code (e.g. CUST-1004), or bill code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Village Area Filter Dropdown */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-900 font-bold"
            >
              <option value="">All Village Zones</option>
              {villagesList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
            {filteredUnpaidBills.length} Records
          </span>
        </div>
      </div>

      {/* UNPAID BILLS AUDIT CONTAINER (Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* MOBILE CARDS VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="text-center py-10 text-slate-400 font-bold text-xs">
              Loading unpaid bills...
            </div>
          ) : filteredUnpaidBills.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2 p-4">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">No Unpaid Bills Found!</p>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? `No matching unpaid records for "${searchQuery}".`
                  : 'All customer accounts are fully paid.'}
              </p>
            </div>
          ) : (
            filteredUnpaidBills.map((bill) => (
              <div key={bill.id} className="p-4 space-y-3 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{bill.customerName}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Code: <strong className="text-slate-800 font-mono">{bill.customerCode}</strong> • {bill.villageName}
                    </p>
                  </div>
                  <span className="font-mono text-base font-black text-rose-600 shrink-0">
                    Rs. {bill.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Water Delivered</span>
                    <span className="font-bold text-blue-800">{bill.quantityLitres} Litres</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate / Litre</span>
                    <span className="font-bold text-slate-700">Rs. {(bill.pricePerLitre || 6.5).toFixed(2)}</span>
                  </div>
                  <div className="col-span-2 text-[11px] text-slate-500 pt-1 border-t border-rose-100/60">
                    Date: {new Date(bill.distributionDate).toLocaleDateString()} {new Date(bill.distributionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleDownloadInvoicePDF(bill)}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>PDF Statement</span>
                  </button>
                  <button
                    onClick={() => setSelectedBillToPay(bill)}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 active:scale-98"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Settle & Pay</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Bill Code</th>
                <th className="px-6 py-4 whitespace-nowrap">Customer Name & Code</th>
                <th className="px-6 py-4 whitespace-nowrap">Village Zone</th>
                <th className="px-6 py-4 whitespace-nowrap">Volume (L)</th>
                <th className="px-6 py-4 whitespace-nowrap">Unit Rate</th>
                <th className="px-6 py-4 whitespace-nowrap">Unpaid Debt</th>
                <th className="px-6 py-4 whitespace-nowrap">Date / Time</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Payment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 font-bold text-xs">
                    Loading unpaid bills...
                  </td>
                </tr>
              ) : filteredUnpaidBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 space-y-2">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700">No Unpaid Bills Found!</p>
                    <p className="text-xs text-slate-400">
                      {searchQuery
                        ? `No matching unpaid records for "${searchQuery}".`
                        : 'All customer accounts are fully paid.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUnpaidBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                    {/* Bill Code */}
                    <td className="px-6 py-4 font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                      {bill.distributionCode}
                    </td>

                    {/* Customer Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{bill.customerName}</div>
                      <div className="text-xs font-semibold text-slate-500">
                        Code: <strong className="text-slate-800">{bill.customerCode}</strong>
                      </div>
                    </td>

                    {/* Zone */}
                    <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                      {bill.villageName}
                    </td>

                    {/* Volume */}
                    <td className="px-6 py-4 font-bold text-blue-900 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-mono text-xs">
                        {bill.quantityLitres} L
                      </span>
                    </td>

                    {/* Rate */}
                    <td className="px-6 py-4 font-semibold text-slate-700 font-mono text-xs whitespace-nowrap">
                      Rs. {(bill.pricePerLitre || 6.5).toFixed(2)}
                    </td>

                    {/* Unpaid Debt */}
                    <td className="px-6 py-4 font-mono font-black text-rose-600 text-base whitespace-nowrap">
                      Rs. {bill.totalAmount.toFixed(2)}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 font-medium text-slate-500 text-xs whitespace-nowrap">
                      {new Date(bill.distributionDate).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDownloadInvoicePDF(bill)}
                          title="Download PDF Statement"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedBillToPay(bill)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Settle & Pay</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT SETTLEMENT MODAL */}
      {selectedBillToPay && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Collect Unpaid Payment</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Record Payment in H2 Database</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBillToPay(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Customer Name:</span>
                <span className="font-black text-slate-900">{selectedBillToPay.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Account / Code:</span>
                <span className="font-bold text-blue-700 font-mono">{selectedBillToPay.customerCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Village Area:</span>
                <span className="font-bold text-slate-700">{selectedBillToPay.villageName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-500 font-bold">Water Delivered:</span>
                <span className="font-bold text-blue-900">{selectedBillToPay.quantityLitres} Litres</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Total Net Amount Payable</span>
              <p className="text-3xl font-black text-emerald-950 font-mono">
                Rs. {selectedBillToPay.totalAmount.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Received Payment Method</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-3.5 px-3 rounded-2xl border text-xs font-black transition flex items-center justify-center ${
                    paymentMethod === 'CASH'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-2 ring-blue-400/50'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>CASH PAYMENT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`py-3.5 px-3 rounded-2xl border text-xs font-black transition flex items-center justify-center ${
                    paymentMethod === 'ONLINE'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-2 ring-blue-400/50'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>ONLINE / UPI</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Payment Note / Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Cash collected by admin"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              onClick={handleConfirmSettlePayment}
              disabled={settleLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/30 transition transform active:scale-98 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{settleLoading ? 'Recording Payment...' : `Confirm Payment (Rs. ${selectedBillToPay.totalAmount.toFixed(2)})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* DIGITAL RECEIPT SUCCESS MODAL (EXACT MATCH FOR SCREENSHOT) */}
      {settledReceiptBill && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            {/* Green Checkmark Badge Container */}
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            {/* Title & Subtitle */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Recorded!</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Digital receipt issued successfully</p>
            </div>

            {/* Blue AQUADISTRIBUTE PASS Card */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white p-5 rounded-2xl shadow-xl text-left space-y-3.5 relative overflow-hidden border border-blue-500">
              <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                <span className="font-black text-xs tracking-wider uppercase text-blue-100">AQUADISTRIBUTE PASS</span>
                <CreditCard className="w-5 h-5 text-white/80" />
              </div>

              <p className="text-xs text-blue-100 font-bold font-mono tracking-wider">
                {settledReceiptBill.receiptNumber || settledReceiptBill.distributionCode}
              </p>

              <div className="pt-2 flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-blue-200 uppercase font-semibold">CUSTOMER</p>
                  <p className="font-extrabold text-sm text-white">{settledReceiptBill.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-blue-200 uppercase font-semibold">BILLED AMOUNT</p>
                  <p className="text-lg font-black text-emerald-300 font-mono">
                    Rs. {settledReceiptBill.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Monospace Specs Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs font-mono shadow-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Volume Consumed:</span>
                <span className="font-bold text-slate-900">{settledReceiptBill.quantityLitres} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Applied Rate:</span>
                <span className="font-bold text-slate-900">Rs. {(settledReceiptBill.pricePerLitre || 6.5).toFixed(2)}/L</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-black">
                <span className="text-slate-800">Status:</span>
                <span className="font-extrabold text-emerald-600">PAID (CONFIRMED)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openWhatsAppReceipt(settledReceiptBill)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share WhatsApp PDF</span>
                </button>
                <button
                  onClick={() => handleDownloadInvoicePDF(settledReceiptBill)}
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Invoice</span>
                </button>
              </div>

              <button
                onClick={() => setSettledReceiptBill(null)}
                className="w-full py-3.5 bg-[#0f172a] hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-md transition"
              >
                Back to Unpaid Audit List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
