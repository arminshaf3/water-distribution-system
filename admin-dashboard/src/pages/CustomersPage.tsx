import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Customer, Village, PagedResponse, Distribution } from '../types';
import { Search, Plus, Loader2, ChevronLeft, ChevronRight, History, Eye, X } from 'lucide-react';
import jsPDF from 'jspdf';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [villageId, setVillageId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Customer History Modal State
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);
  const [customerDistributions, setCustomerDistributions] = useState<Distribution[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCustomerHistory = async (customer: Customer) => {
    setSelectedHistoryCustomer(customer);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      let fetched: Distribution[] = [];
      try {
        const res = await API.get(`/customers/${customer.id}/distributions?size=200`);
        fetched = res.data?.data?.content || [];
      } catch (err) {
        const res = await API.get('/distributions?size=500');
        const allList: Distribution[] = res.data?.data?.content || [];
        fetched = allList.filter(
          (d) =>
            (d.customerCode && d.customerCode === customer.customerCode) ||
            (d.customerName && d.customerName.toLowerCase() === customer.fullName.toLowerCase())
        );
      }
      setCustomerDistributions(fetched);
    } catch (e) {
      console.error('Failed to fetch customer history', e);
    } finally {
      setHistoryLoading(false);
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

  useEffect(() => {
    fetchVillages();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [search, villageId, status, page]);

  const fetchVillages = async () => {
    try {
      const res = await API.get('/villages');
      setVillages(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/customers', {
        params: {
          search: search || undefined,
          villageId: villageId || undefined,
          status: status || undefined,
          page,
          size: 10,
        },
      });
      const pagedData: PagedResponse<Customer> = res.data.data;
      setCustomers(pagedData.content);
      setTotalPages(pagedData.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/customers', {
        fullName,
        phoneNumber,
        address,
        villageId: Number(selectedVillageId),
      });
      setShowModal(false);
      setFullName('');
      setPhoneNumber('');
      setAddress('');
      setSelectedVillageId('');
      fetchCustomers();
    } catch (err) {
      alert('Failed to register customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Household Customers</h1>
          <p className="text-sm font-semibold text-slate-500">Manage registered water recipients</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-2 shadow-md transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Register Household</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search code, name, phone, address..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <select
          value={villageId}
          onChange={(e) => {
            setVillageId(e.target.value);
            setPage(0);
          }}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
        >
          <option value="">All Villages</option>
          {villages.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Customer List Container (Responsive Cards on Mobile + Table on Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* MOBILE CARD VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="text-center py-10 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Fetching households...
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No registered households found.
            </div>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
                      {c.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{c.fullName}</h4>
                      <span className="font-mono text-xs font-bold text-blue-600">{c.customerCode}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Zone / Area</span>
                    <span className="font-bold text-slate-800 truncate block">{c.villageName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Phone</span>
                    <a href={`tel:${c.phoneNumber}`} className="font-bold text-blue-600 truncate block">
                      {c.phoneNumber}
                    </a>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Address</span>
                    <span className="font-medium text-slate-700 text-[11px] line-clamp-1">{c.address}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => openCustomerHistory(c)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 active:scale-98"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Water & Invoice History</span>
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
                <th className="px-6 py-4">Customer Code</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Village / Area</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Fetching customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No registered households found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-700">{c.customerCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{c.fullName}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{c.phoneNumber}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{c.villageName}</td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-xs">{c.address}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openCustomerHistory(c)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center space-x-1.5 cursor-pointer active:scale-95"
                      >
                        <History className="w-4 h-4" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-semibold text-slate-500">
            Page {page + 1} of {totalPages || 1}
          </span>
          <div className="flex space-x-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="p-2 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 rounded-xl text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="p-2 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 rounded-xl text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4">
            <h2 className="text-xl font-black text-slate-900">Register Household</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +94771234567"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Village / Sector</label>
                <select
                  required
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                >
                  <option value="">Select Village</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Address</label>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No, Street Name..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md"
                >
                  {submitting ? 'Registering...' : 'Save Household'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL CUSTOMER HISTORY MODAL */}
      {showHistoryModal && selectedHistoryCustomer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-6 space-y-5 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-blue-500/20">
                  {selectedHistoryCustomer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-black text-slate-900">{selectedHistoryCustomer.fullName}</h2>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-mono font-bold">
                      {selectedHistoryCustomer.customerCode}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {selectedHistoryCustomer.villageName} • {selectedHistoryCustomer.phoneNumber} • {selectedHistoryCustomer.address}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial & Water Volume KPI Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Total Paid Collections</span>
                <span className="text-lg font-black text-emerald-950 font-mono">
                  Rs. {customerDistributions.filter(d => d.paymentStatus === 'PAID').reduce((sum, d) => sum + (d.totalAmount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">Unpaid Outstanding</span>
                <span className="text-lg font-black text-rose-950 font-mono">
                  Rs. {customerDistributions.filter(d => d.paymentStatus !== 'PAID').reduce((sum, d) => sum + (d.totalAmount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-black text-sky-800 uppercase tracking-wider block">Total Water Litres</span>
                <span className="text-lg font-black text-sky-950 font-mono">
                  {customerDistributions.reduce((sum, d) => sum + (d.quantityLitres || 0), 0).toLocaleString()} L
                </span>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider block">Total Invoices</span>
                <span className="text-lg font-black text-indigo-950 font-mono">
                  {customerDistributions.length} Bills
                </span>
              </div>
            </div>

            {/* Distribution History Table */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Complete Household Meter & Distribution History</h3>
                <span className="text-[11px] font-semibold text-slate-500">{customerDistributions.length} total records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-200/70 text-[11px] uppercase font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Bill / Code</th>
                      <th className="px-4 py-3">Litres</th>
                      <th className="px-4 py-3">Total (Rs)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Collector / Method</th>
                      <th className="px-4 py-3 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {historyLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                          Loading customer billing history...
                        </td>
                      </tr>
                    ) : customerDistributions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          No distribution records found for this customer.
                        </td>
                      </tr>
                    ) : (
                      customerDistributions.map((dist) => {
                        const isPaid = dist.paymentStatus === 'PAID';
                        return (
                          <tr key={dist.id || dist.distributionCode} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                              {dist.distributionDate ? new Date(dist.distributionDate).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                              {dist.distributionCode}
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
                                {isPaid ? 'PAID' : 'PENDING'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                              {dist.collectorName || 'Collector'} ({dist.paymentMethod || 'CASH'})
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleDownloadInvoicePDF(dist)}
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

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  navigate(`/customers/${selectedHistoryCustomer.id}`);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                View Full Profile Page →
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
