import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Payment, PagedResponse, ClosedDayAuditRecord, Distribution } from '../types';
import {
  CreditCard,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  Calendar,
  Eye,
  Lock,
  Clock,
  Search,
} from 'lucide-react';
import jsPDF from 'jspdf';

export const PaymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RECEIPTS' | 'CLOSED_AUDITS'>('CLOSED_AUDITS');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab 1: Payment Receipts Log Search & Filter State
  const [receiptSearch, setReceiptSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Tab 2: Closed Day Audits History Search, Filter & Pagination State
  const [closedAudits, setClosedAudits] = useState<ClosedDayAuditRecord[]>([]);
  const [expandedAuditIds, setExpandedAuditIds] = useState<Set<string>>(new Set());
  const [auditSearch, setAuditSearch] = useState('');
  const [auditDateFilter, setAuditDateFilter] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const auditPageSize = 5;

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/payments', {
        params: {
          paymentMethod: paymentMethod || undefined,
          page,
          size: 50,
        },
      });
      const pagedData: PagedResponse<Payment> = res.data.data;
      setPayments(pagedData?.content || []);
      setTotalPages(pagedData?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setPayments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    loadClosedAudits();
  }, [paymentMethod, page]);

  const loadClosedAudits = async () => {
    try {
      // 1. Fetch all backend distributions to ensure full day history is populated
      let allDistributions: Distribution[] = [];
      try {
        const res = await API.get('/distributions', { params: { size: 500 } });
        allDistributions = res.data?.data?.content || [];
      } catch (err) {
        console.error('Could not fetch all distributions for audit enrichment', err);
      }

      const storedStr = localStorage.getItem('water_dist_closed_audits');
      let records: ClosedDayAuditRecord[] = storedStr ? JSON.parse(storedStr) : [];

      // If no closed audit stored yet, seed default sample closed day audit with full database records
      if (records.length === 0) {
        const todayStr = new Date().toISOString().slice(0, 10);

        // Filter all distributions for today or past days
        const matchingDists: Distribution[] = allDistributions.length > 0 ? allDistributions : [
          {
            id: 101,
            distributionCode: 'DIST-20260815-01',
            customerId: 1,
            customerCode: 'CUST-GVC-0001',
            customerName: 'Robert Smith',
            customerPhone: '+94771234567',
            villageName: 'Green Valley Sector A',
            collectorId: 2,
            collectorName: 'James Field Collector',
            quantityLitres: 60,
            pricePerLitre: 6.5,
            totalAmount: 390.0,
            distributionDate: new Date().toISOString(),
            paymentStatus: 'PAID',
            paymentMethod: 'CASH',
            receiptNumber: 'RCP-20260815-991',
          },
          {
            id: 102,
            distributionCode: 'DIST-20260815-02',
            customerId: 2,
            customerCode: 'CUST-GVC-0002',
            customerName: 'Alice Johnson',
            customerPhone: '+94772345678',
            villageName: 'Green Valley Sector B',
            collectorId: 2,
            collectorName: 'James Field Collector',
            quantityLitres: 60,
            pricePerLitre: 6.5,
            totalAmount: 390.0,
            distributionDate: new Date().toISOString(),
            paymentStatus: 'PAID',
            paymentMethod: 'CASH',
            receiptNumber: 'RCP-20260815-992',
          },
        ];

        const paid = matchingDists.filter(d => d.paymentStatus === 'PAID');
        const unpaid = matchingDists.filter(d => d.paymentStatus !== 'PAID');
        const paidSum = paid.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
        const unpaidSum = unpaid.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
        const totalLitres = matchingDists.reduce((sum, d) => sum + (d.quantityLitres || 0), 0);

        const sample1: ClosedDayAuditRecord = {
          id: 'audit-seed-1',
          auditRefCode: `AUDIT-SaaS-${todayStr}-100245`,
          closedDate: todayStr,
          closedTimestamp: new Date().toISOString(),
          totalPaidSum: paidSum,
          totalUnpaidSum: unpaidSum,
          totalRevenue: paidSum + unpaidSum,
          totalLitres: totalLitres,
          paidCount: paid.length,
          unpaidCount: unpaid.length,
          distributions: matchingDists,
        };
        records = [sample1];
        localStorage.setItem('water_dist_closed_audits', JSON.stringify(records));
      } else if (allDistributions.length > 0) {
        // Enrich existing records if distributions match closedDate
        records = records.map(r => {
          const dateDists = allDistributions.filter(d => d.distributionDate && d.distributionDate.slice(0, 10) === r.closedDate);
          if (dateDists.length > 0) {
            const paid = dateDists.filter(d => d.paymentStatus === 'PAID');
            const unpaid = dateDists.filter(d => d.paymentStatus !== 'PAID');
            return {
              ...r,
              distributions: dateDists,
              totalPaidSum: paid.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
              totalUnpaidSum: unpaid.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
              totalRevenue: dateDists.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
              totalLitres: dateDists.reduce((sum, d) => sum + (d.quantityLitres || 0), 0),
              paidCount: paid.length,
              unpaidCount: unpaid.length,
            };
          }
          return r;
        });
      }

      setClosedAudits(records);
      // All audits default to collapsed; user clicks to expand
    } catch (e) {
      console.error('Failed to load closed audits', e);
    }
  };

  const toggleExpandAudit = (id: string) => {
    setExpandedAuditIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtering & Pagination for Closed Day Audits
  const filteredClosedAudits = closedAudits.filter((audit) => {
    if (auditDateFilter && audit.closedDate !== auditDateFilter) return false;
    if (auditSearch.trim() !== '') {
      const q = auditSearch.toLowerCase();
      const matchRef = audit.auditRefCode.toLowerCase().includes(q);
      const matchDate = audit.closedDate.includes(q);
      const matchCustomer = audit.distributions.some(
        (d) =>
          (d.customerName || '').toLowerCase().includes(q) ||
          (d.customerCode || '').toLowerCase().includes(q) ||
          (d.collectorName || '').toLowerCase().includes(q)
      );
      return matchRef || matchDate || matchCustomer;
    }
    return true;
  });

  const auditTotalPages = Math.ceil(filteredClosedAudits.length / auditPageSize) || 1;
  const paginatedClosedAudits = filteredClosedAudits.slice(
    auditPage * auditPageSize,
    (auditPage + 1) * auditPageSize
  );

  // Remove old fetchPayments definition (now moved above useEffect)
  // Filtering for Payment Receipts Log — paymentMethod, statusFilter, and search all applied client-side
  const filteredPayments = payments.filter((p) => {
    // Payment method filter (also applied via API, but enforced client-side too)
    if (paymentMethod && (p.paymentMethod || '').toUpperCase() !== paymentMethod.toUpperCase()) return false;
    // Status filter
    if (statusFilter && (p.paymentStatus || '').toUpperCase() !== statusFilter.toUpperCase()) return false;
    // Search filter
    if (receiptSearch.trim() !== '') {
      const q = receiptSearch.toLowerCase();
      const matchRec = (p.receiptNumber || `PAY-${p.id}`).toLowerCase().includes(q);
      const matchCust = (p.customerName || '').toLowerCase().includes(q) || (p.customerCode || '').toLowerCase().includes(q);
      const matchColl = (p.collectorName || '').toLowerCase().includes(q);
      const matchDate = new Date(p.paymentDate).toLocaleString().toLowerCase().includes(q);
      return matchRec || matchCust || matchColl || matchDate;
    }
    return true;
  });

  // Helper: always show a sliding window of at least 5 page numbers around the current page
  const getPageNumbers = (current: number, total: number): (number | '...')[] => {
    const totalReal = Math.max(total, 1);
    if (totalReal <= 5) return Array.from({ length: 5 }, (_, i) => i);
    const half = 2;
    let start = Math.max(0, current - half);
    let end = Math.min(totalReal - 1, start + 4);
    if (end - start < 4) start = Math.max(0, end - 4);
    const pages: (number | '...')[] = [];
    if (start > 0) { pages.push(0); if (start > 1) pages.push('...'); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalReal - 1) { if (end < totalReal - 2) pages.push('...'); pages.push(totalReal - 1); }
    return pages;
  };

  const generateAuditPDFForRecord = (record: ClosedDayAuditRecord) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const effRatio = record.totalRevenue > 0 ? (record.totalPaidSum / record.totalRevenue) * 100 : 100;

    // 1. BIG PROMINENT WATERMARK BACKGROUND LOGO
    doc.setFillColor(241, 245, 249);
    doc.circle(297.64, 421.64, 190, 'F');
    doc.setFillColor(224, 242, 254);
    doc.circle(297.64, 421.64, 140, 'F');
    doc.setFillColor(186, 230, 253);
    doc.triangle(297.64, 330, 235, 435, 360, 435, 'F');
    doc.circle(297.64, 435, 62.5, 'F');

    doc.setTextColor(203, 213, 225);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('AQUADISTRIBUTE ENTERPRISE', 100, 520);
    doc.setFontSize(14);
    doc.text('OFFICIAL SAAS EXECUTIVE DAY AUDIT SEAL', 140, 545);

    // 2. MAIN HEADER
    doc.setTextColor(15, 41, 98);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Operations Audit Statement', 30, 42);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('This document covers the key audit metrics and daily revenue reconciliation of the water distribution network.', 30, 58);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(30, 70, 565, 70);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 41, 98);
    doc.text('──── »»»  Company Name: AquaDistribute SaaS Infrastructure  ««« ────', 150, 68);

    // 3. TOP BANNER
    doc.setFillColor(0, 32, 96);
    doc.rect(30, 80, 535, 26, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(30, 80, 535, 3.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Consolidated Daily Operations Audit (${record.closedDate})`, 42, 97);

    // 4. FINANCIAL KPI SUMMARY TABLE
    let yPos = 115;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);

    const summaryRows = [
      { label: 'Audit Statement Date', val: `${record.closedDate} (${new Date(record.closedTimestamp).toLocaleString()})` },
      { label: 'Total Billed Revenue', val: `Rs. ${record.totalRevenue.toFixed(2)}` },
      { label: 'Paid Cash Collections (Net Received)', val: `Rs. ${record.totalPaidSum.toFixed(2)} (${record.paidCount} Paid Accounts)` },
      { label: 'Unpaid Outstanding Credit Balance', val: `Rs. ${record.totalUnpaidSum.toFixed(2)} (${record.unpaidCount} Credit Bills)` },
      { label: 'Total Water Distributed Volume', val: `${record.totalLitres.toLocaleString()} Litres` },
      { label: 'Consolidated Collection Efficiency Ratio', val: `${effRatio.toFixed(1)}%` },
    ];

    summaryRows.forEach((row, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(30, yPos, 535, 16, 'FD');

      doc.setTextColor(15, 41, 98);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(row.label, 40, yPos + 11);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(row.val, 320, yPos + 11);

      yPos += 16;
    });

    yPos += 15;

    // 5. ITEMIZED TABLE
    doc.setFillColor(0, 32, 96);
    doc.rect(30, yPos, 535, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER / ACCOUNT NAME', 38, yPos + 14);
    doc.text('ACCOUNT CODE', 215, yPos + 14);
    doc.text('VOLUME (L)', 305, yPos + 14);
    doc.text('AMOUNT (RS)', 375, yPos + 14);
    doc.text('STATUS', 455, yPos + 14);
    doc.text('METHOD', 510, yPos + 14);

    yPos += 22;

    record.distributions.slice(0, 24).forEach((dist, idx) => {
      const isPaid = dist.paymentStatus === 'PAID';
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(30, yPos, 535, 17, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text((dist.customerName || 'Customer').slice(0, 26), 38, yPos + 12);

      doc.setFont('helvetica', 'normal');
      doc.text(dist.customerCode || 'CODE', 215, yPos + 12);
      doc.text(`${dist.quantityLitres} L`, 305, yPos + 12);
      doc.text(`${Number(dist.totalAmount).toFixed(2)}`, 375, yPos + 12);

      if (isPaid) {
        doc.setTextColor(5, 150, 105);
        doc.setFont('helvetica', 'bold');
        doc.text('PAID', 455, yPos + 12);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.setFont('helvetica', 'bold');
        doc.text('UNPAID', 455, yPos + 12);
      }

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text((dist.paymentMethod || 'CASH').slice(0, 8), 510, yPos + 12);

      yPos += 17;
    });

    // 6. TOTALS & FOOTER
    yPos += 4;
    doc.setFillColor(241, 245, 249);
    doc.rect(30, yPos, 535, 22, 'F');
    doc.setDrawColor(15, 41, 98);
    doc.setLineWidth(1.5);
    doc.line(30, yPos, 565, yPos);

    doc.setTextColor(15, 41, 98);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSOLIDATED NET REVENUE TOTALS:', 38, yPos + 14);

    doc.setTextColor(5, 150, 105);
    doc.text(`Paid: Rs. ${record.totalPaidSum.toFixed(2)}`, 305, yPos + 14);

    doc.setTextColor(225, 29, 72);
    doc.text(`Unpaid: Rs. ${record.totalUnpaidSum.toFixed(2)}`, 415, yPos + 14);

    doc.setTextColor(15, 41, 98);
    doc.setFont('courier', 'bold');
    doc.text(`Rs. ${record.totalRevenue.toFixed(2)}`, 495, yPos + 14);

    doc.setLineWidth(1);
    doc.line(30, yPos + 22, 565, yPos + 22);
    doc.line(30, yPos + 24, 565, yPos + 24);

    doc.setFillColor(16, 185, 129);
    doc.rect(30, 810, 535, 4, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`AquaDistribute SaaS Engine • Audit Ref: ${record.auditRefCode}`, 30, 824);
    doc.text('Page 1 of 1', 525, 824);

    doc.save(`Executive_Audit_Report_${record.closedDate}.pdf`);
  };

  const handleDownloadSingleInvoicePDF = (dist: Distribution) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const isPaid = dist.paymentStatus === 'PAID';

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
    doc.text(`Official Household Customer Water Invoice • Receipt: ${dist.receiptNumber || dist.distributionCode}`, 95, 56);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 105, 535, 85, 8, 8, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT HOLDER', 45, 125);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text(dist.customerName, 45, 145);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer Code: ${dist.customerCode}`, 45, 162);
    doc.text(`Location / Zone: ${dist.villageName}`, 45, 177);

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

    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.rect(30, 268, 535, 30, 'FD');
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('TOTAL NET PAYABLE AMOUNT', 42, 287);
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(isPaid ? 5 : 225, isPaid ? 150 : 29, isPaid ? 105 : 72);
    doc.text(`Rs. ${dist.totalAmount.toFixed(2)}`, 465, 287);

    doc.save(`Water_Bill_${dist.receiptNumber || dist.distributionCode}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments & Audit Settlement History</h1>
          <p className="text-sm font-semibold text-slate-500">Collected revenue receipts & expandable daily audit settlements</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl border border-slate-300/80 w-fit">
          <button
            onClick={() => setActiveTab('RECEIPTS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'RECEIPTS'
                ? 'bg-white text-blue-700 shadow-md border border-slate-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Receipts Log</span>
          </button>
          <button
            onClick={() => setActiveTab('CLOSED_AUDITS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'CLOSED_AUDITS'
                ? 'bg-white text-blue-700 shadow-md border border-slate-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Closed Day Audits History</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-mono">
              {closedAudits.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: PAYMENT RECEIPTS LOG */}
      {activeTab === 'RECEIPTS' && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                placeholder="Search receipt #, customer name, account code, collector..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(0);
                }}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="">All Methods</option>
                <option value="CASH">CASH</option>
                <option value="ONLINE">ONLINE</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>

          {/* Payment Receipts Container (Mobile Cards + Desktop Table) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* MOBILE CARDS VIEW (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="text-center py-10 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  Loading payment receipts...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  No matching payment receipt records found.
                </div>
              ) : (
                filteredPayments.map((p) => (
                  <div key={p.id} className="p-4 space-y-2.5 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{p.customerName}</h4>
                        <p className="text-xs text-slate-500 font-medium">
                          Receipt: <span className="font-mono text-blue-600 font-bold">{p.receiptNumber || `PAY-${p.id}`}</span>
                        </p>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-700 shrink-0">
                        Rs. {p.amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Method</span>
                        <span className="font-bold text-slate-800">{p.paymentMethod}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Collector</span>
                        <span className="font-bold text-slate-800 truncate block">{p.collectorName || 'Officer'}</span>
                      </div>
                      <div className="col-span-2 text-[11px] text-slate-500 pt-1 border-t border-emerald-100/60">
                        Date: {new Date(p.paymentDate).toLocaleDateString()} {new Date(p.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center space-x-1 ${
                          p.paymentStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {p.paymentStatus === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                        )}
                        <span>{p.paymentStatus}</span>
                      </span>
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
                    <th className="px-6 py-4">Receipt Number</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Amount Paid</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Collector</th>
                    <th className="px-6 py-4">Date / Time</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        Loading payment logs...
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No matching payment receipt records found.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-700">{p.receiptNumber || `PAY-${p.id}`}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {p.customerName}
                          <div className="text-xs font-normal text-slate-500">{p.customerCode}</div>
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-700">Rs. {p.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{p.collectorName}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{new Date(p.paymentDate).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit space-x-1 ${
                              p.paymentStatus === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {p.paymentStatus === 'COMPLETED' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                            )}
                            <span>{p.paymentStatus}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Numbered Pagination — always show min 5 page buttons */}
            <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <span className="text-xs font-semibold text-slate-500">
                Page {page + 1} of {Math.max(totalPages, 1)} • {filteredPayments.length} receipts shown
              </span>
              <div className="flex items-center space-x-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="p-2 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 rounded-xl text-slate-700 cursor-pointer transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getPageNumbers(page, totalPages).map((pg, idx) =>
                  pg === '...' ? (
                    <span key={`dots-${idx}`} className="min-w-[36px] h-9 flex items-center justify-center text-slate-400 text-xs font-bold select-none">...</span>
                  ) : (
                    <button
                      key={pg}
                      disabled={pg >= Math.max(totalPages, 1)}
                      onClick={() => { if (pg < Math.max(totalPages, 1)) setPage(pg as number); }}
                      className={`min-w-[36px] h-9 px-3 rounded-xl text-xs font-black border transition ${
                        pg >= Math.max(totalPages, 1)
                          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                          : page === pg
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md cursor-pointer'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'
                      }`}
                    >
                      {(pg as number) + 1}
                    </button>
                  )
                )}
                <button
                  disabled={page >= Math.max(totalPages, 1) - 1}
                  onClick={() => setPage(page + 1)}
                  className="p-2 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 rounded-xl text-slate-700 cursor-pointer transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLOSED DAY AUDITS HISTORY (EXPANDABLE ACCORDIONS WITH SEARCH, FILTERS & PAGINATION) */}
      {activeTab === 'CLOSED_AUDITS' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Closed Business Day Audit Settlements</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Every closed audit is archived here by date. Click <strong>Expand Full Day History</strong> to view every transaction ledger for that day.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold">
              {filteredClosedAudits.length} AUDITS FOUND
            </span>
          </div>

          {/* SEARCH & DATE FILTER BAR FOR CLOSED AUDITS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(0);
                }}
                placeholder="Search audit ref code (e.g. AUDIT-SaaS...), date, customer..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <input
                  type="date"
                  value={auditDateFilter}
                  onChange={(e) => {
                    setAuditDateFilter(e.target.value);
                    setAuditPage(0);
                  }}
                  className="bg-transparent focus:outline-none text-slate-900 font-mono cursor-pointer"
                />
              </div>

              {auditDateFilter && (
                <button
                  onClick={() => {
                    setAuditDateFilter('');
                    setAuditPage(0);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {paginatedClosedAudits.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800">No Closed Day Audits Match Filter</h3>
              <p className="text-xs text-slate-500">Try clearing the search query or date filter above.</p>
            </div>
          ) : (
            paginatedClosedAudits.map((audit) => {
              const isExpanded = expandedAuditIds.has(audit.id);
              return (
                <div
                  key={audit.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition hover:shadow-md"
                >
                  {/* ACCORDION HEADER BAR */}
                  <div
                    onClick={() => toggleExpandAudit(audit.id)}
                    className="p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:bg-slate-100/80 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl border border-blue-200">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-black text-slate-900 font-mono">{audit.closedDate}</span>
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black uppercase">
                            CLOSED & SETTLED
                          </span>
                        </div>
                        <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                          {audit.auditRefCode} • Closed at {new Date(audit.closedTimestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Summary Metrics Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                        <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">Paid Cash</span>
                        <span className="font-black text-emerald-950 font-mono">Rs. {audit.totalPaidSum.toFixed(2)}</span>
                      </div>
                      <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                        <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider block">Unpaid</span>
                        <span className="font-black text-rose-950 font-mono">Rs. {audit.totalUnpaidSum.toFixed(2)}</span>
                      </div>
                      <div className="px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-xs">
                        <span className="text-[10px] text-sky-700 font-extrabold uppercase tracking-wider block">Volume</span>
                        <span className="font-black text-sky-950 font-mono">{audit.totalLitres.toLocaleString()} L</span>
                      </div>

                      {/* PDF Report Export Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateAuditPDFForRecord(audit);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center space-x-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>A4 PDF Report</span>
                      </button>

                      {/* Expand Toggle Chevron Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandAudit(audit.id);
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition flex items-center space-x-1"
                      >
                        <span>{isExpanded ? 'Collapse' : 'Expand History'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE BODY: FULL DAY TRANSACTION HISTORY TABLE */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                            Full Day Transaction History ({audit.distributions.length} Total Field Bills)
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 font-mono">
                          Reconciled Shift Ledger for {audit.closedDate}
                        </span>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                              <tr>
                                <th className="px-4 py-3">Timestamp</th>
                                <th className="px-4 py-3">Bill / Code</th>
                                <th className="px-4 py-3">Customer / Account</th>
                                <th className="px-4 py-3">Volume (L)</th>
                                <th className="px-4 py-3">Amount (Rs)</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Collector / Method</th>
                                <th className="px-4 py-3 text-right">Receipt Invoice</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {audit.distributions.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="text-center py-6 text-slate-500 font-medium">
                                    No transaction ledgers registered for this closed day.
                                  </td>
                                </tr>
                              ) : (
                                audit.distributions.map((dist, idx) => {
                                  const isPaid = dist.paymentStatus === 'PAID';
                                  return (
                                    <tr key={dist.id || idx} className="hover:bg-slate-50 transition">
                                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                        {dist.distributionDate ? new Date(dist.distributionDate).toLocaleTimeString() : 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                                        {dist.distributionCode}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                                        {dist.customerName}
                                        <div className="text-[10px] font-normal text-slate-500 font-mono">{dist.customerCode}</div>
                                      </td>
                                      <td className="px-4 py-3 font-extrabold text-slate-900 whitespace-nowrap">
                                        {dist.quantityLitres} L
                                      </td>
                                      <td className="px-4 py-3 font-mono font-black text-slate-900 whitespace-nowrap">
                                        Rs. {Number(dist.totalAmount).toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span
                                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            isPaid
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                                          }`}
                                        >
                                          {isPaid ? 'PAID' : 'UNPAID'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                        {dist.collectorName || 'Collector'} ({dist.paymentMethod || 'CASH'})
                                      </td>
                                      <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button
                                          onClick={() => handleDownloadSingleInvoicePDF(dist)}
                                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 text-[11px] transition inline-flex items-center space-x-1 cursor-pointer"
                                        >
                                          <Eye className="w-3 h-3" />
                                          <span>PDF Bill</span>
                                        </button>
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
                </div>
              );
            })
          )}

          {/* CLOSED AUDITS NUMBERED PAGINATION — always show min 5 page buttons */}
          {filteredClosedAudits.length > 0 && (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Audit Page {auditPage + 1} of {auditTotalPages} • Showing {paginatedClosedAudits.length} of {filteredClosedAudits.length} closed day audits
              </span>
              <div className="flex items-center space-x-1">
                <button
                  disabled={auditPage === 0}
                  onClick={() => setAuditPage(auditPage - 1)}
                  className="p-2 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 rounded-xl text-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getPageNumbers(auditPage, auditTotalPages).map((pg, idx) =>
                  pg === '...' ? (
                    <span key={`adots-${idx}`} className="min-w-[36px] h-9 flex items-center justify-center text-slate-400 text-xs font-bold select-none">...</span>
                  ) : (
                    <button
                      key={pg}
                      disabled={pg >= auditTotalPages}
                      onClick={() => { if (pg < auditTotalPages) setAuditPage(pg as number); }}
                      className={`min-w-[36px] h-9 px-3 rounded-xl text-xs font-black border transition ${
                        pg >= auditTotalPages
                          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                          : auditPage === pg
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md cursor-pointer'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'
                      }`}
                    >
                      {(pg as number) + 1}
                    </button>
                  )
                )}
                <button
                  disabled={auditPage >= auditTotalPages - 1}
                  onClick={() => setAuditPage(auditPage + 1)}
                  className="p-2 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 rounded-xl text-slate-700 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
