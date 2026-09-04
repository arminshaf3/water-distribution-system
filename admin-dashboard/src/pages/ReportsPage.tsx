import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Customer, User as Collector, Village } from '../types';
import {
  Download,
  Printer,
  Search,
  RotateCcw,
  Droplets,
  Coins,
  TrendingUp,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';

interface GroupBreakdownStat {
  groupName: string;
  transactionsCount: number;
  totalLitres: number;
  totalAmount: number;
}

interface ReportSummary {
  startDate: string | null;
  endDate: string | null;
  totalLitres: number;
  totalTransactions: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  customerBreakdown: GroupBreakdownStat[];
  collectorBreakdown: GroupBreakdownStat[];
  villageBreakdown: GroupBreakdownStat[];
}

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedCollector, setSelectedCollector] = useState<string>('');
  const [selectedVillage, setSelectedVillage] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'customer' | 'collector' | 'village'>('customer');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    fetchFilterOptions();
    fetchReportSummary();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [custRes, collRes, vilRes] = await Promise.all([
        API.get('/customers?size=100'),
        API.get('/auth/collectors'),
        API.get('/villages')
      ]);
      setCustomers(custRes.data.data.content || []);
      setCollectors(collRes.data.data || []);
      setVillages(vilRes.data.data || []);
    } catch (e) {
      console.error('Failed to load report filter options', e);
    }
  };

  const fetchReportSummary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', `${startDate}T00:00:00`);
      if (endDate) params.append('endDate', `${endDate}T23:59:59`);
      if (selectedCustomer) params.append('customerId', selectedCustomer);
      if (selectedCollector) params.append('collectorId', selectedCollector);
      if (selectedVillage) params.append('villageId', selectedVillage);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);

      const res = await API.get(`/reports/summary?${params.toString()}`);
      setSummary(res.data.data);
    } catch (e) {
      console.error('Failed to compute report summary', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReportSummary();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCustomer('');
    setSelectedCollector('');
    setSelectedVillage('');
    setPaymentStatus('');
    setTimeout(fetchReportSummary, 50);
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', `${startDate}T00:00:00`);
      if (endDate) params.append('endDate', `${endDate}T23:59:59`);
      if (selectedCustomer) params.append('customerId', selectedCustomer);
      if (selectedCollector) params.append('collectorId', selectedCollector);
      if (selectedVillage) params.append('villageId', selectedVillage);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);

      const response = await API.get(`/reports/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `water_distribution_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!summary) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // 1. Corporate Header Banner (Dark Navy #0f172a)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 595.28, 90, 'F');

    // Vector Water Shield Emblem Logo
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(30, 20, 50, 50, 14, 14, 'F');
    doc.setFillColor(6, 182, 212);
    doc.triangle(55, 27, 42, 48, 68, 48, 'F');
    doc.circle(55, 48, 13, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(52, 44, 3.8, 'F');

    // Corporate Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('AQUADISTRIBUTE UTILITY SERVICES LTD.', 95, 40);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Administrative Executive Operations & Revenue Statement • ISO 9001:2025 Certified', 95, 55);

    // Right Badge Box
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(415, 20, 150, 50, 8, 8, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE AUDIT REPORT', 423, 38);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`REF-${Date.now().toString().slice(-6)}`, 423, 55);

    // 2. Executive Summary Metrics Grid
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 105, 535, 75, 8, 8, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL WATER DISTRIBUTED', 45, 122);
    doc.text('TOTAL REVENUE BILLED', 230, 122);
    doc.text('COLLECTED CASH (PAID)', 420, 122);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${(summary.totalLitres || 0).toLocaleString()} Litres`, 45, 142);
    doc.setTextColor(37, 99, 235);
    doc.text(`Rs. ${(summary.totalAmount || 0).toFixed(2)}`, 230, 142);
    doc.setTextColor(5, 150, 105);
    doc.text(`Rs. ${(summary.paidAmount || 0).toFixed(2)}`, 420, 142);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Audited Transactions: ${summary.totalTransactions || 0}`, 45, 162);
    doc.text(`Unpaid Pending Credit: Rs. ${(summary.pendingAmount || 0).toFixed(2)}`, 230, 162);
    doc.text(`Audit Date: ${new Date().toLocaleDateString()}`, 420, 162);

    // 3. Category Breakdown Table
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE REGIONAL & CATEGORY BREAKDOWN', 30, 205);

    doc.setFillColor(30, 41, 59);
    doc.rect(30, 215, 535, 24, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ZONE / CATEGORY NAME', 42, 230);
    doc.text('BILLS COUNT', 250, 230);
    doc.text('VOLUME (LITRES)', 360, 230);
    doc.text('AMOUNT (RS.)', 475, 230);

    const breakdownList: GroupBreakdownStat[] = (summary.villageBreakdown && summary.villageBreakdown.length > 0)
      ? summary.villageBreakdown
      : (summary.customerBreakdown || []);

    let startY = 239;
    breakdownList.forEach((item: GroupBreakdownStat, idx: number) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(30, startY, 535, 22, 'F');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(item.groupName, 42, startY + 15);
      doc.text(`${item.transactionsCount}`, 250, startY + 15);
      doc.text(`${item.totalLitres} L`, 360, startY + 15);
      doc.setFont('courier', 'bold');
      doc.text(`${item.totalAmount.toFixed(2)}`, 475, startY + 15);
      startY += 22;
    });

    // Security Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(30, 545, 565, 545);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('AquaDistribute Utility Infrastructure Services Ltd. • Official Administrative Report', 110, 558);

    doc.save(`Corporate_Water_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Administrative Reports</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Multi-Criteria Audit Reports & Executive Exports</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none flex items-center space-x-2 shadow-md transition"
          >
            <FileText className="w-4 h-4" />
            <span>Corporate PDF Report</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none flex items-center space-x-2 shadow-md transition"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-none flex items-center space-x-2 shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-5 rounded-none border border-slate-300 shadow-sm print:hidden space-y-4">
        <form onSubmit={handleApplyFilter} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-none px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-none px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Customer Household</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-none px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.customerCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Field Collector</label>
              <select
                value={selectedCollector}
                onChange={(e) => setSelectedCollector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-none px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">All Collectors</option>
                {collectors.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Village Sector</label>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-none px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">All Villages</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-none px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">All Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-none text-xs flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none text-xs flex items-center space-x-1.5 shadow-md"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-none border border-slate-300 shadow-sm flex items-center justify-between border-l-4 border-l-blue-600">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Litres Supplied</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1">{(summary.totalLitres || 0).toLocaleString()} L</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{summary.totalTransactions} transactions</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-none">
              <Droplets className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-none border border-slate-300 shadow-sm flex items-center justify-between border-l-4 border-l-slate-600">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Billed</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">Rs. {(summary.totalAmount || 0).toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Calculated revenue</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-800 border border-slate-200 rounded-none">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-none border border-slate-300 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-600">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Amount Paid</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">Rs. {(summary.paidAmount || 0).toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Collected revenue</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-none">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-none border border-slate-300 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Pending Amount</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">Rs. {(summary.pendingAmount || 0).toLocaleString()}</h3>
              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Outstanding collection</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-none">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Report Breakdown Tabs */}
      <div className="bg-white rounded-none border border-slate-300 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex border-b border-slate-200 pb-3 gap-3 print:hidden">
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 text-xs font-bold rounded-none transition ${
              activeTab === 'customer'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Customer Household Breakdown
          </button>
          <button
            onClick={() => setActiveTab('collector')}
            className={`px-4 py-2 text-xs font-bold rounded-none transition ${
              activeTab === 'collector'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Collector Performance Breakdown
          </button>
          <button
            onClick={() => setActiveTab('village')}
            className={`px-4 py-2 text-xs font-bold rounded-none transition ${
              activeTab === 'village'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Village Sector Breakdown
          </button>
        </div>

        {/* Tab 1: Customer Household Breakdown */}
        {activeTab === 'customer' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Customer Household</th>
                  <th className="px-4 py-3">Transactions</th>
                  <th className="px-4 py-3">Supplied (L)</th>
                  <th className="px-4 py-3">Billed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500 font-medium">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                      Loading report breakdown...
                    </td>
                  </tr>
                ) : !summary || !summary.customerBreakdown || summary.customerBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500 font-medium">
                      No records match the active filters.
                    </td>
                  </tr>
                ) : (
                  summary.customerBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.groupName}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{row.transactionsCount}</td>
                      <td className="px-4 py-3 font-bold text-blue-900">{row.totalLitres ? row.totalLitres.toLocaleString() : 0} L</td>
                      <td className="px-4 py-3 font-black text-emerald-700">Rs. {row.totalAmount ? row.totalAmount.toFixed(2) : '0.00'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Collector Breakdown */}
        {activeTab === 'collector' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Collector Name</th>
                  <th className="px-4 py-3">Transactions</th>
                  <th className="px-4 py-3">Litres Distributed</th>
                  <th className="px-4 py-3">Billed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!summary || !summary.collectorBreakdown || summary.collectorBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500 font-medium">
                      No collector data available for selected filters.
                    </td>
                  </tr>
                ) : (
                  summary.collectorBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.groupName}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{row.transactionsCount}</td>
                      <td className="px-4 py-3 font-bold text-blue-900">{row.totalLitres ? row.totalLitres.toLocaleString() : 0} L</td>
                      <td className="px-4 py-3 font-black text-emerald-700">Rs. {row.totalAmount ? row.totalAmount.toFixed(2) : '0.00'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Village Breakdown */}
        {activeTab === 'village' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Village / Sector Name</th>
                  <th className="px-4 py-3">Transactions</th>
                  <th className="px-4 py-3">Litres Distributed</th>
                  <th className="px-4 py-3">Billed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!summary || !summary.villageBreakdown || summary.villageBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500 font-medium">
                      No village data available for selected filters.
                    </td>
                  </tr>
                ) : (
                  summary.villageBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.groupName}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{row.transactionsCount}</td>
                      <td className="px-4 py-3 font-bold text-blue-900">{row.totalLitres ? row.totalLitres.toLocaleString() : 0} L</td>
                      <td className="px-4 py-3 font-black text-emerald-700">Rs. {row.totalAmount ? row.totalAmount.toFixed(2) : '0.00'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
