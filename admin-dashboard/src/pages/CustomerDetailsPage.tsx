import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Customer, Distribution, Payment } from '../types';
import { Phone, MapPin, Building, ArrowLeft, Droplets, Calendar, CreditCard, Loader2 } from 'lucide-react';

export const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'distributions' | 'payments'>('distributions');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCustomerDetails(id);
    }
  }, [id]);

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [custRes, distRes, payRes] = await Promise.all([
        API.get(`/customers/${customerId}`),
        API.get(`/customers/${customerId}/distributions?size=50`),
        API.get(`/customers/${customerId}/payments?size=50`)
      ]);

      setCustomer(custRes.data.data);
      setDistributions(distRes.data.data.content || []);
      setPayments(payRes.data.data.content || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch customer profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-8 text-center max-w-xl mx-auto my-12">
        <h3 className="text-xl font-bold text-rose-300 mb-2">Customer Not Found</h3>
        <p className="text-rose-200/80 mb-6">{error || 'The requested household customer record does not exist.'}</p>
        <button
          onClick={() => navigate('/customers')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
        >
          Return to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </button>
        <span
          className={`px-3 py-1 text-xs font-bold rounded-full border ${
            customer.status === 'ACTIVE'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          {customer.status}
        </span>
      </div>

      {/* Customer Profile Banner */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-cyan-500/20">
              {customer.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-100">{customer.fullName}</h1>
                <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-lg">
                  {customer.customerCode}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" /> {customer.address}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-sm">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block mb-1">Phone</span>
              <span className="text-slate-200 font-mono font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-400" /> {customer.phoneNumber}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block mb-1">Village</span>
              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-400" /> {customer.villageName || 'Sector ' + customer.villageId}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block mb-1">Registered</span>
              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('distributions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${
            activeTab === 'distributions'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Droplets className="w-4 h-4" /> Distribution History ({distributions.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${
            activeTab === 'payments'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Payment History ({payments.length})
        </button>
      </div>

      {/* Distribution History Tab */}
      {activeTab === 'distributions' && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {distributions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Droplets className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
              <p>No water distribution records found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Transaction Code</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Rate</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Collector</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {distributions.map((dist) => (
                    <tr key={dist.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono text-cyan-400 font-semibold">{dist.distributionCode}</td>
                      <td className="px-6 py-4 font-bold text-slate-100">{dist.quantityLitres} L</td>
                      <td className="px-6 py-4 font-mono text-slate-400">Rs. {dist.pricePerLitre}/L</td>
                      <td className="px-6 py-4 font-bold text-emerald-400">Rs. {dist.totalAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-400">{dist.collectorName}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            dist.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {dist.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(dist.distributionDate).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment History Tab */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
              <p>No payment records found for this customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Payment ID</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Collector</th>
                    <th className="px-6 py-4">Receipt #</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono text-cyan-400">PAY-{p.id}</td>
                      <td className="px-6 py-4 font-bold text-emerald-400">Rs. {p.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{p.collectorName}</td>
                      <td className="px-6 py-4 font-mono text-emerald-400 font-semibold">
                        {p.receiptNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(p.paymentDate).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
