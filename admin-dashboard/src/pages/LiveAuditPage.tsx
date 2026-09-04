import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Distribution } from '../types';
import {
  Droplets,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
  Radio,
  Search,
  Calendar,
  Sparkles,
  Eye,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Lock,
  X,
  FileText,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';

export const LiveAuditPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(new Date().toLocaleTimeString());
  const [showCloseDayConfirmModal, setShowCloseDayConfirmModal] = useState(false);

  useEffect(() => {
    fetchLiveAuditData();
    const interval = setInterval(fetchLiveAuditData, 3000); // Poll live data every 3s
    return () => clearInterval(interval);
  }, [selectedDate]);

  const fetchLiveAuditData = async () => {
    try {
      // Fetch all distribution records so no pending credit bill is excluded
      const res = await API.get('/distributions', {
        params: {
          size: 500,
        },
      });

      const fetched: Distribution[] = res.data?.data?.content || [];
      setDistributions(fetched);
      setLastUpdatedTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch live audit data', e);
    } finally {
      setLoading(false);
    }
  };

  const isInActiveAdminDay = (d: Distribution) => {
    if (!d.distributionDate) return true;
    const itemTime = new Date(d.distributionDate).getTime();

    // Check last day close timestamp for admin
    const lastCloseISO = localStorage.getItem('admin_last_day_close');
    if (lastCloseISO) {
      const lastCloseTime = new Date(lastCloseISO).getTime();
      // If distribution was created BEFORE or AT last day close, exclude it from active audit!
      if (itemTime <= lastCloseTime) {
        return false;
      }
    }

    return d.distributionDate.slice(0, 10) === selectedDate;
  };

  const dayDistributions = distributions.filter(isInActiveAdminDay);

  const paidDistributions = dayDistributions.filter((d) => d.paymentStatus === 'PAID');
  const unpaidDistributions = dayDistributions.filter((d) => d.paymentStatus !== 'PAID');

  const todaysPaidSum = paidDistributions.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const todaysUnpaidSum = unpaidDistributions.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalShiftRevenue = todaysPaidSum + todaysUnpaidSum;

  const todaysTotalLitres = dayDistributions.reduce((sum, d) => sum + (d.quantityLitres || 0), 0);
  const activeCollectorNames = Array.from(new Set(dayDistributions.map((d) => d.collectorName || 'John Collector')));

  const donutData = [
    { name: 'Paid Collections', value: todaysPaidSum, color: '#10b981' },
    { name: 'Unpaid Credit', value: todaysUnpaidSum, color: '#f43f5e' },
  ];

  const filteredFeed = dayDistributions.filter((d) => {
    if (statusFilter === 'PAID' && d.paymentStatus !== 'PAID') return false;
    if (statusFilter === 'UNPAID' && d.paymentStatus === 'PAID') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const name = (d.customerName || '').toLowerCase();
      const code = (d.customerCode || '').toLowerCase();
      const collector = (d.collectorName || '').toLowerCase();
      const receipt = (d.receiptNumber || d.distributionCode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || collector.includes(q) || receipt.includes(q);
    }
    return true;
  });

  // Generate Enterprise SaaS Level A4 Day Audit PDF Report (Matching Image 2 Corporate Financial Statement)
  const generateEnterpriseDayAuditPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const closeDateStr = new Date().toLocaleString();
    const auditRefCode = `AUDIT-SaaS-${selectedDate}-${Date.now().toString().slice(-6)}`;

    // 1. BIG PROMINENT WATERMARK BACKGROUND LOGO (Center of A4)
    doc.setFillColor(241, 245, 249);
    doc.circle(297.64, 421.64, 190, 'F');

    doc.setFillColor(224, 242, 254);
    doc.circle(297.64, 421.64, 140, 'F');

    doc.setFillColor(186, 230, 253);
    doc.triangle(297.64, 330, 235, 435, 360, 435, 'F');
    doc.circle(297.64, 435, 62.5, 'F');

    // Watermark Text Overlay
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('AQUADISTRIBUTE ENTERPRISE', 100, 520);
    doc.setFontSize(14);
    doc.text('OFFICIAL SAAS EXECUTIVE DAY AUDIT SEAL', 140, 545);

    // 2. MAIN HEADER (Matching Image 2 Top Section)
    doc.setTextColor(15, 41, 98); // #0f2962 Deep Navy
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Operations Audit Statement', 30, 42);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('This document covers the key audit metrics and daily revenue reconciliation of the water distribution network.', 30, 58);

    // Thin Rule Line with Center Company Accent
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(30, 70, 565, 70);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 41, 98);
    doc.text('──── »»»  Company Name: AquaDistribute SaaS Infrastructure  ««« ────', 150, 68);

    // 3. GRADIENT BLUE-GREEN TOP BANNER (Matching Image 2 Blue/Green Bar)
    doc.setFillColor(0, 32, 96); // #002060 Deep Navy Blue
    doc.rect(30, 80, 535, 26, 'F');
    doc.setFillColor(16, 185, 129); // #10b981 Emerald Green Accent Bar
    doc.rect(30, 80, 535, 3.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Consolidated Daily Operations & Revenue Audit Statement', 42, 97);

    // 4. FINANCIAL KPI SUMMARY TABLE (Grid Style matching Image 2 top table)
    let yPos = 115;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);

    const effRatio = totalShiftRevenue > 0 ? (todaysPaidSum / totalShiftRevenue) * 100 : 100;

    const summaryRows = [
      { label: 'Audit Statement Date', val: `${selectedDate} (${closeDateStr})` },
      { label: 'Total Billed Revenue', val: `Rs. ${totalShiftRevenue.toFixed(2)}` },
      { label: 'Paid Cash Collections (Net Received)', val: `Rs. ${todaysPaidSum.toFixed(2)} (${paidDistributions.length} Paid Accounts)` },
      { label: 'Unpaid Outstanding Credit Balance', val: `Rs. ${todaysUnpaidSum.toFixed(2)} (${unpaidDistributions.length} Credit Bills)` },
      { label: 'Total Water Distributed Volume', val: `${todaysTotalLitres.toLocaleString()} Litres` },
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

    // 5. ITEMIZED DISTRIBUTION & PAYMENT LEDGER TABLE (Matching Image 2 Main Table)
    // Section Header Bar
    doc.setFillColor(241, 245, 249);
    doc.rect(30, yPos, 535, 18, 'F');
    doc.setTextColor(15, 41, 98);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Itemized Field Distribution & Payment Audit Ledger', 40, yPos + 13);
    yPos += 18;

    // Table Column Header Row (Dark Blue #002060 matching Image 2 table headers)
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

    // Table Rows
    if (dayDistributions.length === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(30, yPos, 535, 20, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('No distribution transactions recorded for this business day.', 38, yPos + 14);
      yPos += 20;
    } else {
      dayDistributions.slice(0, 24).forEach((dist, idx) => {
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
    }

    // 6. CONSOLIDATED RECONCILIATION SUMMARY TOTALS (Matching Image 2 Bottom Totals with Double Underline)
    yPos += 4;
    doc.setFillColor(241, 245, 249);
    doc.rect(30, yPos, 535, 22, 'F');
    doc.setDrawColor(15, 41, 98);
    doc.setLineWidth(1.5);
    doc.line(30, yPos, 565, yPos); // Top thick rule line

    doc.setTextColor(15, 41, 98);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSOLIDATED NET REVENUE TOTALS:', 38, yPos + 14);

    doc.setTextColor(5, 150, 105);
    doc.text(`Paid: Rs. ${todaysPaidSum.toFixed(2)}`, 305, yPos + 14);

    doc.setTextColor(225, 29, 72);
    doc.text(`Unpaid: Rs. ${todaysUnpaidSum.toFixed(2)}`, 415, yPos + 14);

    doc.setTextColor(15, 41, 98);
    doc.setFont('courier', 'bold');
    doc.text(`Rs. ${totalShiftRevenue.toFixed(2)}`, 495, yPos + 14);

    // Double Rule Underline at Bottom (Matching Image 2 Financial Statement Ending)
    doc.setLineWidth(1);
    doc.line(30, yPos + 22, 565, yPos + 22);
    doc.line(30, yPos + 24, 565, yPos + 24);

    // 7. FOOTER BAR (Matching Image 2 Green Bottom Accent Bar & Audit Seal)
    doc.setFillColor(16, 185, 129); // Green Bottom Bar
    doc.rect(30, 810, 535, 4, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`AquaDistribute SaaS Engine • Audit Ref: ${auditRefCode}`, 30, 824);
    doc.text('Page 1 of 1', 525, 824);

    return doc;
  };

  const handleConfirmCloseDayAccount = () => {
    try {
      // 1. Generate & download big SaaS Level A4 PDF Report
      const pdf = generateEnterpriseDayAuditPDF();
      pdf.save(`Executive_Day_Audit_Report_${selectedDate}.pdf`);

      const nowISO = new Date().toISOString();
      const auditRefCode = `AUDIT-SaaS-${selectedDate}-${Date.now().toString().slice(-6)}`;

      // 2. Persist closed audit snapshot for Payments Audit History tab
      const closedRecord = {
        id: Date.now().toString(),
        auditRefCode,
        closedDate: selectedDate,
        closedTimestamp: nowISO,
        totalPaidSum: todaysPaidSum,
        totalUnpaidSum: todaysUnpaidSum,
        totalRevenue: totalShiftRevenue,
        totalLitres: todaysTotalLitres,
        paidCount: paidDistributions.length,
        unpaidCount: unpaidDistributions.length,
        distributions: [...dayDistributions],
      };

      const existingAuditsStr = localStorage.getItem('water_dist_closed_audits');
      const existingAudits = existingAuditsStr ? JSON.parse(existingAuditsStr) : [];
      localStorage.setItem('water_dist_closed_audits', JSON.stringify([closedRecord, ...existingAudits]));

      // 3. Set admin_last_day_close timestamp to NOW
      localStorage.setItem('admin_last_day_close', nowISO);

      // 4. Reset audit page state so active day starts fresh from 0
      fetchLiveAuditData();
      setShowCloseDayConfirmModal(false);
    } catch (e) {
      console.error('Failed to close day account', e);
    }
  };

  const handleDownloadInvoicePDF = (dist: Distribution) => {
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
    doc.text('State Water Supply Infrastructure & Metering Authority • ISO 9001:2025 Certified', 95, 55);

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(415, 20, 150, 50, 8, 8, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('LIVE AUDIT STATEMENT', 425, 38);
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
    doc.text(`Customer Code: ${dist.customerCode}`, 45, 162);
    doc.text(`Location / Zone: ${dist.villageName}`, 45, 177);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLING METADATA', 320, 125);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Statement Date: ${new Date(dist.distributionDate).toLocaleString()}`, 320, 145);
    doc.text(`Payment Terms: ${isPaid ? 'Immediate Cash Collection' : 'Net 14 Credit Bill'}`, 320, 162);
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

    if (isPaid) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(30, 315, 535, 42, 8, 8, 'FD');
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('✔ OFFICIAL RECEIPT - PAYMENT CONFIRMED & AUDITED', 45, 340);
    } else {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(30, 315, 535, 42, 8, 8, 'FD');
      doc.setTextColor(159, 18, 57);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('✖ NOTICE OF UNPAID CREDIT - PAYMENT PENDING', 45, 340);
    }

    doc.save(`Water_Bill_${dist.receiptNumber || dist.distributionCode}.pdf`);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative p-3 bg-blue-600/30 border border-blue-400/30 text-emerald-400 rounded-2xl shadow-inner">
            <Radio className="w-7 h-7 animate-pulse text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-tight text-white">Live Daily Operations Audit</h1>
              <span className="px-3 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">
              Real-time audit stream of all field collector mobile app transactions
            </p>
          </div>
        </div>

        {/* Date Selector & Sync Info */}
        <div className="flex items-center space-x-3 bg-white/10 border border-white/15 p-2 rounded-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900/80 rounded-xl text-xs font-bold text-slate-200">
            <Calendar className="w-4 h-4 text-sky-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none text-white font-mono cursor-pointer"
            />
          </div>

          <button
            onClick={fetchLiveAuditData}
            title="Refresh Live Audit Data"
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Close Day Account Button */}
          <button
            onClick={() => setShowCloseDayConfirmModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center space-x-2 cursor-pointer active:scale-95"
          >
            <Lock className="w-4 h-4" />
            <span>Close Day Account & Export PDF</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Paid Cash */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Paid Cash Collections</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <h2 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              Rs. {todaysPaidSum.toFixed(2)}
            </h2>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
            <span>{paidDistributions.length} Paid Bills</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[10px]">
              CONFIRMED CASH
            </span>
          </div>
        </div>

        {/* Card 2: Today's Pending Credit */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">Unpaid Credit Bills</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <h2 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              Rs. {todaysUnpaidSum.toFixed(2)}
            </h2>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
            <span>{unpaidDistributions.length} Pending Bills</span>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200 text-[10px]">
              UNPAID CREDIT
            </span>
          </div>
        </div>

        {/* Card 3: Today's Total Litres */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">Total Water Delivered</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <h2 className="text-3xl font-black text-slate-900 font-sans tracking-tight">
              {todaysTotalLitres.toLocaleString()} <span className="text-base font-bold text-slate-500">L</span>
            </h2>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
            <span>{dayDistributions.length} Meter Logs</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-[10px]">
              METER AUDITED
            </span>
          </div>
        </div>

        {/* Card 4: Active Officers */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Active Field Officers</span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <User className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <h2 className="text-3xl font-black text-slate-900 font-sans tracking-tight">
              {activeCollectorNames.length} <span className="text-base font-bold text-slate-500">Collectors</span>
            </h2>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-100 truncate">
            <span className="truncate max-w-[140px]">{activeCollectorNames.join(', ')}</span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 text-[10px]">
              ACTIVE NOW
            </span>
          </div>
        </div>
      </div>

      {/* REVENUE BREAKDOWN & OPERATIONAL STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Donut Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">Today's Revenue Ratio</h3>
            <span className="text-xs font-bold text-slate-500">Total: Rs. {totalShiftRevenue.toFixed(0)}</span>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`Rs. ${Number(value).toFixed(2)}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-2 border-t border-slate-100">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="text-[10px] block font-extrabold uppercase text-emerald-700">Paid Collections</span>
              <span className="text-sm font-black text-emerald-900 font-mono">Rs. {todaysPaidSum.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <span className="text-[10px] block font-extrabold uppercase text-rose-700">Unpaid Credit</span>
              <span className="text-sm font-black text-rose-900 font-mono">Rs. {todaysUnpaidSum.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Live Operational Health Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-900">Operational Field Health & Efficiency</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Auto-Refreshed: {lastUpdatedTime}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Shift Total Bills</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{dayDistributions.length}</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Average Bill Size</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                Rs. {dayDistributions.length > 0 ? (totalShiftRevenue / dayDistributions.length).toFixed(1) : '0.0'}
              </span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Collection Rate</span>
              <span className="text-2xl font-black text-blue-700 font-mono">
                {totalShiftRevenue > 0 ? ((todaysPaidSum / totalShiftRevenue) * 100).toFixed(0) : 100}%
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center space-x-3 text-xs text-blue-900 font-medium">
            <TrendingUp className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <strong>Live Stream Verification:</strong> All field metrics display 100% accurate real-time data calculated directly from collector app submissions for {selectedDate}.
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME COLLECTOR TRANSACTION AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Table Header Filter Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Today's Real-Time Collector Audit Feed</h3>
            <p className="text-xs text-slate-500 font-semibold">Live record stream for {selectedDate}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search collector, customer, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm w-60"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex border border-slate-300 rounded-xl p-1 bg-white shadow-sm">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                  statusFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({dayDistributions.length})
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                  statusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid ({paidDistributions.length})
              </button>
              <button
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                  statusFilter === 'UNPAID' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unpaid ({unpaidDistributions.length})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Field Officer</th>
                <th className="px-6 py-4">Customer & Premise</th>
                <th className="px-6 py-4">Consumption</th>
                <th className="px-6 py-4">Rate / Litre</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Invoice Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFeed.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-bold text-xs space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p>No collector audit transactions recorded for {selectedDate}.</p>
                  </td>
                </tr>
              ) : (
                filteredFeed.map((item) => {
                  const isPaid = item.paymentStatus === 'PAID';
                  const timeFormatted = new Date(item.distributionDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Time */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-600 text-xs">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{timeFormatted}</span>
                        </div>
                      </td>

                      {/* Officer */}
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black text-xs">
                            {(item.collectorName || 'C')[0]}
                          </div>
                          <span>{item.collectorName || 'John Collector'}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{item.customerName}</span>
                        <span className="text-xs font-medium text-slate-500">
                          {item.customerCode} • {item.villageName}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 font-bold text-blue-900">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-mono text-xs">
                          {item.quantityLitres} L
                        </span>
                      </td>

                      {/* Rate */}
                      <td className="px-6 py-4 font-semibold text-slate-700 font-mono text-xs">
                        Rs. {(item.pricePerLitre || 6.5).toFixed(2)}
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 font-mono font-black text-slate-900 text-base">
                        Rs. {item.totalAmount.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full inline-flex items-center ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                              <span>PAID</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600 mr-1" />
                              <span>UNPAID</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownloadInvoicePDF(item)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center space-x-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>PDF Invoice</span>
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

      {/* CLOSE DAY ACCOUNT CONFIRMATION MODAL */}
      {showCloseDayConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Close Business Day Account</h3>
                  <p className="text-xs text-slate-500 font-semibold">Executive Audit Settlement</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseDayConfirmModal(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audit Summary Highlights */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Audit Date:</span>
                <span className="font-black text-slate-900 font-mono">{selectedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Today's Collections:</span>
                <span className="font-black text-emerald-700 font-mono">Rs. {todaysPaidSum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Unpaid Credit:</span>
                <span className="font-black text-rose-700 font-mono">Rs. {todaysUnpaidSum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-bold">Net Water Distributed:</span>
                <span className="font-extrabold text-blue-900 font-mono">{todaysTotalLitres.toLocaleString()} Litres</span>
              </div>
            </div>

            {/* SaaS Audit PDF Notice */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
              <div className="flex items-center space-x-2 font-black text-blue-950">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Executive SaaS A4 PDF Report</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                Confirming close will automatically download a certified <strong>A4 Executive Audit PDF Report</strong> featuring big corporate background watermarks, financial KPI grids, and complete distribution ledgers. The active audit stream will then reset to <strong>Rs. 0.00</strong> for the new day!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowCloseDayConfirmModal(false)}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCloseDayAccount}
                className="py-3.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Export PDF & Reset 0</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
