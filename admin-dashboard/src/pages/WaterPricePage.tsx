import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { WaterPrice } from '../types';
import { CircleDollarSign, History, Plus, Loader2, Layers, Calculator, Trash2 } from 'lucide-react';

interface SlabInput {
  tierName: string;
  minLitres: number;
  maxLitres: number | null;
  pricePerLitre: number;
}

export const WaterPricePage: React.FC = () => {
  const [activePrice, setActivePrice] = useState<WaterPrice | null>(null);
  const [history, setHistory] = useState<WaterPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [pricePerLitre, setPricePerLitre] = useState('5.00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Slab Inputs State
  const [slabs, setSlabs] = useState<SlabInput[]>([
    { tierName: 'Tier 1 - Essential', minLitres: 0, maxLitres: 20, pricePerLitre: 4.00 },
    { tierName: 'Tier 2 - Standard', minLitres: 21, maxLitres: 50, pricePerLitre: 5.00 },
    { tierName: 'Tier 3 - High Use', minLitres: 51, maxLitres: null, pricePerLitre: 6.50 },
  ]);

  // Live Simulator
  const [simLitres, setSimLitres] = useState<number>(40);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        API.get('/water-prices/active'),
        API.get('/water-prices/history'),
      ]);
      const act = activeRes.data?.data;
      if (act) {
        setActivePrice({
          ...act,
          pricePerLitre: Number(act.pricePerLitre || 5)
        });
        if (act.tiers && Array.isArray(act.tiers)) {
          setSlabs(act.tiers.map((t: any) => ({
            tierName: t.tierName || 'Slab',
            minLitres: Number(t.minLitres || 0),
            maxLitres: t.maxLitres !== null ? Number(t.maxLitres) : null,
            pricePerLitre: Number(t.pricePerLitre || 5)
          })));
        }
      }
      const hist = historyRes.data?.data;
      setHistory(Array.isArray(hist) ? hist : (act ? [act] : []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlab = () => {
    const lastSlab = slabs[slabs.length - 1];
    const newMin = lastSlab ? (lastSlab.maxLitres || lastSlab.minLitres) + 1 : 0;
    setSlabs([
      ...slabs,
      { tierName: `Tier ${slabs.length + 1}`, minLitres: newMin, maxLitres: newMin + 30, pricePerLitre: 6.00 }
    ]);
  };

  const handleRemoveSlab = (index: number) => {
    setSlabs(slabs.filter((_, i) => i !== index));
  };

  const handleSlabChange = (index: number, field: keyof SlabInput, value: any) => {
    const updated = [...slabs];
    updated[index] = { ...updated[index], [field]: value };
    setSlabs(updated);
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/water-prices', {
        pricePerLitre: parseFloat(pricePerLitre),
        notes,
        tiers: slabs.map(s => ({
          tierName: s.tierName,
          minLitres: s.minLitres,
          maxLitres: s.maxLitres ? Number(s.maxLitres) : null,
          pricePerLitre: Number(s.pricePerLitre)
        }))
      });
      setShowModal(false);
      fetchPricingData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update water price & slabs');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute Whole-Volume Slab Billed Total
  const computeSimulatedTotal = (litres: number) => {
    let rate = parseFloat(pricePerLitre) || 5;
    if (slabs.length > 0) {
      for (const slab of slabs) {
        const min = slab.minLitres || 0;
        const max = slab.maxLitres;
        if (litres >= min && (max === null || max === undefined || litres <= max)) {
          rate = Number(slab.pricePerLitre) || rate;
          break;
        }
      }
    }
    return {
      total: (litres * rate).toFixed(2),
      rate: rate.toFixed(2)
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dynamic Pricing & Consumption Slabs</h1>
          <p className="text-sm font-semibold text-slate-500">Configure base rates, custom litre slabs, and consumption pricing rules</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-2 shadow-md transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Configure Slabs & Rates</span>
        </button>
      </div>

      {/* Active Price & Slabs Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 rounded-2xl border border-blue-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white/10 text-white rounded-2xl border border-white/20">
              <CircleDollarSign className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-blue-200">Base Standard Rate</span>
              <h2 className="text-4xl font-black text-white mt-1">
                Rs. {activePrice ? Number(activePrice.pricePerLitre || 5).toFixed(2) : '5.00'}{' '}
                <span className="text-lg font-normal text-blue-200">/ Litre</span>
              </h2>
              <p className="text-xs text-blue-200 font-medium mt-1">
                Effective since: {activePrice?.effectiveFrom ? new Date(activePrice.effectiveFrom).toLocaleDateString() : 'Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Rate Simulator */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase">
            <Calculator className="w-4 h-4" /> Live Slab Calculator
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Supplied Volume (Litres)</label>
            <input
              type="number"
              value={simLitres}
              onChange={(e) => setSimLitres(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 font-mono focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="pt-2 border-t border-slate-200 space-y-1">
            <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
              <span>Applied Slab Rate:</span>
              <span className="font-bold text-blue-600">Rs. {computeSimulatedTotal(simLitres).rate} / L</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-bold text-slate-700">Total ({simLitres}L × Rs {computeSimulatedTotal(simLitres).rate}):</span>
              <span className="text-xl font-black text-emerald-600">
                Rs. {computeSimulatedTotal(simLitres).total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Active Price Slabs Display */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Layers className="w-4 h-4 text-blue-600" /> Active Dynamic Consumption Price Slabs
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Edit Slabs
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {slabs.map((s, idx) => (
            <div key={idx} className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-1 relative group">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">{s.tierName}</span>
              <h4 className="font-bold text-slate-900 text-sm">
                {s.minLitres} to {s.maxLitres ? `${s.maxLitres} Litres` : '∞ (Unlimited)'}
              </h4>
              <p className="text-lg font-black text-emerald-700">Rs. {Number(s.pricePerLitre).toFixed(2)} / L</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Revision Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-slate-50">
          <History className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-900 text-base">Water Rate & Slab Revision Audit Log</h3>
        </div>
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-100/90 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Base Price / L</th>
              <th className="px-6 py-4">Effective Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Updated By</th>
              <th className="px-6 py-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  Loading price history...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  No pricing records logged.
                </td>
              </tr>
            ) : (
              (Array.isArray(history) ? history : []).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-900">Rs. {Number(p.pricePerLitre || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{new Date(p.effectiveFrom).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        p.isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.isActive ? 'ACTIVE' : 'ARCHIVED'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-medium">{p.createdByName || 'Admin'}</td>
                  <td className="px-6 py-4 text-slate-600">{p.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dynamic Slabs Configuration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" /> Configure Price Slabs & Base Rate
            </h2>

            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Base Price Rate (Rs per litre)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={pricePerLitre}
                  onChange={(e) => setPricePerLitre(e.target.value)}
                  placeholder="e.g. 5.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Dynamic Slabs Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Consumption Slabs List</label>
                  <button
                    type="button"
                    onClick={handleAddSlab}
                    className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Price Slab
                  </button>
                </div>

                <div className="space-y-2">
                  {slabs.map((s, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          value={s.tierName}
                          onChange={(e) => handleSlabChange(i, 'tierName', e.target.value)}
                          placeholder="Slab Name"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          value={s.minLitres}
                          onChange={(e) => handleSlabChange(i, 'minLitres', Number(e.target.value))}
                          placeholder="Min L"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          value={s.maxLitres ?? ''}
                          onChange={(e) => handleSlabChange(i, 'maxLitres', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="Max L (Empty = ∞)"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          value={s.pricePerLitre}
                          onChange={(e) => handleSlabChange(i, 'pricePerLitre', Number(e.target.value))}
                          placeholder="Rs/L"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-700 font-mono"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSlab(i)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Revision Audit Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for rate/slab changes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md"
                >
                  {submitting ? 'Saving Slabs...' : 'Publish Rate & Slabs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
