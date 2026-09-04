import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Distribution, PagedResponse } from '../types';
import { Droplets, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export const DistributionsPage: React.FC = () => {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchDistributions();
  }, [paymentStatus, page]);

  const fetchDistributions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/distributions', {
        params: {
          paymentStatus: paymentStatus || undefined,
          page,
          size: 10,
        },
      });
      const pagedData: PagedResponse<Distribution> = res.data.data;
      setDistributions(pagedData.content);
      setTotalPages(pagedData.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Water Distributions</h1>
          <p className="text-sm font-semibold text-slate-500">Complete distribution activity audit trail</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Droplets className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Filter by Payment Status:</span>
        </div>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(0);
          }}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="PAID">PAID</option>
        </select>
      </div>

      {/* Distribution Records (Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* MOBILE CARD VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="text-center py-10 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Loading deliveries...
            </div>
          ) : distributions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No distribution records logged.
            </div>
          ) : (
            distributions.map((d) => {
              const qty = d.quantityLitres || 0;
              let exactTierPrice = d.pricePerLitre;
              if (!exactTierPrice || exactTierPrice === 0) {
                if (qty <= 20) exactTierPrice = 4.0;
                else if (qty <= 50) exactTierPrice = 5.0;
                else exactTierPrice = 6.5;
              }

              return (
                <div key={d.id} className="p-4 space-y-2.5 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{d.customerName}</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {d.villageName} • <span className="font-mono text-blue-600 font-bold">{d.distributionCode}</span>
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                        d.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {d.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Volume</span>
                      <span className="font-black text-blue-900">{d.quantityLitres.toLocaleString()} L</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate</span>
                      <span className="font-bold text-slate-800">Rs. {exactTierPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                      <span className="font-black text-slate-950 font-mono">Rs. {d.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Officer: <strong className="text-slate-600 font-semibold">{d.collectorName}</strong></span>
                    <span>{new Date(d.distributionDate).toLocaleDateString()} {new Date(d.distributionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Distribution Code</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Collector</th>
                <th className="px-6 py-4">Quantity (L)</th>
                <th className="px-6 py-4">Price / L</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Date / Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading distribution logs...
                  </td>
                </tr>
              ) : distributions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No distribution records logged.
                  </td>
                </tr>
              ) : (
                distributions.map((d) => {
                  const qty = d.quantityLitres || 0;
                  let exactTierPrice = d.pricePerLitre;
                  if (!exactTierPrice || exactTierPrice === 0) {
                    if (qty <= 20) exactTierPrice = 4.0;
                    else if (qty <= 50) exactTierPrice = 5.0;
                    else exactTierPrice = 6.5;
                  }

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">{d.distributionCode}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {d.customerName}
                        <div className="text-xs font-normal text-slate-500">{d.villageName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{d.collectorName}</td>
                      <td className="px-6 py-4 font-bold text-blue-900">{d.quantityLitres.toLocaleString()} L</td>
                      <td className="px-6 py-4 font-bold text-slate-900">Rs. {exactTierPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 font-black text-slate-900">Rs. {d.totalAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs">{new Date(d.distributionDate).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full ${
                            d.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
                              : 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                          }`}
                        >
                          {d.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
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
    </div>
  );
};
