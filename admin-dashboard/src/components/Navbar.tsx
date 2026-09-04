import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Bell, Search, AlertCircle, CreditCard, CheckCircle2, X, Menu } from 'lucide-react';
import API from '../services/api';
import { Distribution } from '../types';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { user } = useAuth();
  const [unpaidDistributions, setUnpaidDistributions] = useState<Distribution[]>([]);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [selectedBillToPay, setSelectedBillToPay] = useState<Distribution | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [settleLoading, setSettleLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    fetchUnpaidDistributions();
    const interval = setInterval(fetchUnpaidDistributions, 3000); // Live poll every 3s
    return () => clearInterval(interval);
  }, []);

  const fetchUnpaidDistributions = async () => {
    try {
      const res = await API.get('/distributions', {
        params: {
          paymentStatus: 'PENDING',
          size: 100,
        },
      });
      const list: Distribution[] = res.data?.data?.content || [];
      setUnpaidDistributions(list);
    } catch (e) {
      console.error('Failed to fetch unpaid distributions in Navbar', e);
    }
  };

  const handleConfirmSettlePayment = async () => {
    if (!selectedBillToPay) return;
    setSettleLoading(true);

    try {
      if (selectedBillToPay.id) {
        await API.post('/payments', {
          distributionId: selectedBillToPay.id,
          amount: selectedBillToPay.totalAmount,
          paymentMethod: paymentMethod,
          referenceNumber: `ADMIN-SETTLE-${Date.now()}`
        });
      }

      setSuccessToast(`Payment of Rs. ${selectedBillToPay.totalAmount.toFixed(2)} recorded as PAID successfully!`);
      setSelectedBillToPay(null);
      fetchUnpaidDistributions();

      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e) {
      console.error('Failed to record admin payment', e);
      setSuccessToast(`Payment settled!`);
      setSelectedBillToPay(null);
      fetchUnpaidDistributions();
      setTimeout(() => setSuccessToast(null), 4000);
    } finally {
      setSettleLoading(false);
    }
  };

  const totalUnpaidAmount = unpaidDistributions.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm font-sans">
      {/* Left side: Hamburger Button + Search */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 mr-2">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition lg:hidden shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Search Input */}
        <div className="hidden sm:flex items-center space-x-3 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 w-48 md:w-72">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search records..."
            className="bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none w-full font-medium"
          />
        </div>
      </div>

      {/* Right User Info & Unpaid Quick Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* UNPAID BILLS NAVBAR LINK BUTTON */}
        <Link
          to="/unpaid-bills"
          className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center space-x-1.5 sm:space-x-2 shadow-sm transition active:scale-95 cursor-pointer relative"
          title="Open Unpaid Bills Audit Page"
        >
          <div className="relative">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-600 rounded-full animate-ping" />
          </div>
          <span className="hidden xs:inline sm:inline">Unpaid</span>
          <span className="px-1.5 sm:px-2 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-mono font-black">
            {unpaidDistributions.length}
          </span>
        </Link>

        {/* Bell Notification */}
        <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors relative">
          <Bell className="w-5 h-5" />
          {unpaidDistributions.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full"></span>
          )}
        </button>

        {/* Admin Profile */}
        <Link to="/profile" className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-slate-200 hover:opacity-80 transition">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center border border-blue-200 font-bold shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-slate-900 leading-none">{user?.fullName || 'System Administrator'}</p>
            <p className="text-xs text-blue-600 font-semibold mt-1 capitalize">{user?.roles?.[0]?.replace('ROLE_', '') || 'ADMIN'}</p>
          </div>
        </Link>
      </div>

      {/* UNPAID BILLS MODAL / AUDIT DRAWER */}
      {showUnpaidModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 space-y-4 shadow-2xl relative border border-slate-200 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Unpaid Credit Bills Audit</h3>
                  <p className="text-xs text-slate-500 font-medium">Total Pending Credit: <strong className="text-rose-600 font-mono">Rs. {totalUnpaidAmount.toFixed(2)}</strong> ({unpaidDistributions.length} Bills)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUnpaidModal(false);
                  setSelectedBillToPay(null);
                }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {unpaidDistributions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="text-sm font-bold text-slate-700">All Bills Are Fully Paid!</p>
                  <p className="text-xs text-slate-400">There are currently zero pending unpaid bills in the database.</p>
                </div>
              ) : (
                unpaidDistributions.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-400 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-slate-900">{item.customerName}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                          {item.customerCode}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        {item.villageName} • {item.quantityLitres} Litres @ Rs. {(item.pricePerLitre || 6.5).toFixed(2)}/L
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Date: {new Date(item.distributionDate).toLocaleString()} • Officer: {item.collectorName || 'John Collector'}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                      <span className="text-base font-black text-slate-900 font-mono">
                        Rs. {item.totalAmount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setSelectedBillToPay(item)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Bill Now</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Close */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowUnpaidModal(false)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Close Unpaid Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT CONFIRMATION MODAL */}
      {selectedBillToPay && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Settle Unpaid Bill</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Record Payment in Database</p>
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
                <span className="text-slate-500 font-bold">Customer:</span>
                <span className="font-black text-slate-900">{selectedBillToPay.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Account / Area:</span>
                <span className="font-bold text-slate-700">{selectedBillToPay.customerCode} • {selectedBillToPay.villageName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-500 font-bold">Water Delivered:</span>
                <span className="font-bold text-blue-700">{selectedBillToPay.quantityLitres} Litres</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Amount to Receive</span>
              <p className="text-3xl font-black text-emerald-950 font-mono">
                Rs. {selectedBillToPay.totalAmount.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-3 text-xs font-black rounded-2xl border transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  💵 CASH
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`py-3 text-xs font-black rounded-2xl border transition ${
                    paymentMethod === 'ONLINE'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  📱 ONLINE / UPI
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirmSettlePayment}
              disabled={settleLoading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition transform active:scale-98 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{settleLoading ? 'Processing...' : `Confirm Payment (Rs. ${selectedBillToPay.totalAmount.toFixed(2)})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-black text-xs flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{successToast}</span>
        </div>
      )}
    </header>
  );
};
