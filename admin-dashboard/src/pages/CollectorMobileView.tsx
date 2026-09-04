import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import { Customer, Distribution, WaterPrice } from '../types';
import { Droplets, Search, CheckCircle2, LogOut, ArrowLeft, Gauge, User, Home, FileText, PieChart, CreditCard, Sparkles, Eye, Share2, X, ShieldCheck, Download, UserCheck, AlertCircle, ChevronDown, ChevronUp, Lock, Bell } from 'lucide-react';
import jsPDF from 'jspdf';

export interface CollectorNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  distributionId?: number;
}

export const CollectorMobileView: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('collector_token') || localStorage.getItem('water_dist_token'));
  const [username, setUsername] = useState<string>('collector1');
  const [password, setPassword] = useState<string>('collector123');

  // Real-time admin payment notice state
  const [adminPaymentNotice, setAdminPaymentNotice] = useState<string | null>(null);
  const [activeNoticeId, setActiveNoticeId] = useState<string>('');

  // Notifications Inbox State & Dismissed Live Banners
  const [notifications, setNotifications] = useState<CollectorNotification[]>(() => {
    try {
      const saved = localStorage.getItem('water_dist_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('water_dist_dismissed_notices');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dismissedNoticeIdsRef = useRef<string[]>(dismissedNoticeIds);
  useEffect(() => {
    dismissedNoticeIdsRef.current = dismissedNoticeIds;
  }, [dismissedNoticeIds]);

  const [notifiedPaymentIds, setNotifiedPaymentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('water_dist_notified_payment_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const notifiedPaymentIdsRef = useRef<string[]>(notifiedPaymentIds);
  useEffect(() => {
    notifiedPaymentIdsRef.current = notifiedPaymentIds;
  }, [notifiedPaymentIds]);

  // Always-fresh ref to latest historyDistributions for use inside async interval
  const historyRef = useRef<Distribution[]>([]);

  // App Navigation State
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'search' | 'record' | 'receipt' | 'history' | 'close_account' | 'notifications'>('dashboard');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);
  const [showShiftCloseSuccessModal, setShowShiftCloseSuccessModal] = useState<boolean>(false);

  // Operational Data
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activePrice, setActivePrice] = useState<WaterPrice | null>(null);

  // History & Persistence Data
  const [historyDistributions, setHistoryDistributions] = useState<Distribution[]>(() => {
    try {
      const saved = localStorage.getItem('water_dist_history');
      const parsed = saved ? JSON.parse(saved) : [];
      historyRef.current = parsed;
      return parsed;
    } catch {
      return [];
    }
  });

  const [todaysTotal, setTodaysTotal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('water_dist_todays_total');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [selectedInvoice, setSelectedInvoice] = useState<Distribution | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [showSlabsModal, setShowSlabsModal] = useState<boolean>(false);

  // Payment Settlement Engine State
  const [showSettlePaymentModal, setShowSettlePaymentModal] = useState<boolean>(false);
  const [settlingBill, setSettlingBill] = useState<Distribution | null>(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [settleReference, setSettleReference] = useState<string>('');
  const [settleLoading, setSettleLoading] = useState<boolean>(false);

  // Meter Reading Engine State
  const [calcMode, setCalcMode] = useState<'METER' | 'DIRECT'>('METER');
  const [previousReading, setPreviousReading] = useState<number>(120);
  const [currentReading, setCurrentReading] = useState<number>(180);
  const [directLitres, setDirectLitres] = useState<number>(60);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');

  // Computed Values
  const computedLitres = calcMode === 'METER' ? Math.max(0, currentReading - previousReading) : directLitres;

  // Whole-Volume Slab Rate Calculation Engine
  const tiersToUse = (activePrice?.tiers && activePrice.tiers.length > 0) ? activePrice.tiers : [
    { minLitres: 0, maxLitres: 20, pricePerLitre: 4.00, tierName: 'Tier 1 - Essential (0-20L)' },
    { minLitres: 21, maxLitres: 50, pricePerLitre: 5.00, tierName: 'Tier 2 - Standard (21-50L)' },
    { minLitres: 51, maxLitres: null, pricePerLitre: 6.50, tierName: 'Tier 3 - High Use (51+L)' },
  ];

  let matchingSlabRate = activePrice?.pricePerLitre || 5.00;
  let matchingSlabName = 'Base Rate';

  for (const tier of tiersToUse) {
    const min = Number(tier.minLitres) || 0;
    const rawMax = tier.maxLitres;
    const max = (rawMax !== null && rawMax !== undefined && Number(rawMax) > 0)
      ? Number(rawMax)
      : null;

    if (computedLitres >= min && (max === null || computedLitres <= max)) {
      matchingSlabRate = Number(tier.pricePerLitre) || matchingSlabRate;
      matchingSlabName = tier.tierName || 'Slab Rate';
      break;
    }
  }

  const unitPrice = matchingSlabRate;
  const computedTotal = computedLitres * unitPrice;

  // Results
  const [lastDistribution, setLastDistribution] = useState<Distribution | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollectorData();
    const interval = setInterval(fetchCollectorData, 2000); // Live poll every 2s

    const handleRealtimeTrigger = () => {
      fetchCollectorData();
    };

    window.addEventListener('water_payment_settled', handleRealtimeTrigger);
    window.addEventListener('storage', handleRealtimeTrigger);

    return () => {
      clearInterval(interval);
      window.removeEventListener('water_payment_settled', handleRealtimeTrigger);
      window.removeEventListener('storage', handleRealtimeTrigger);
    };
  }, []);

  // Keep historyRef in sync with state so interval callback always reads fresh data
  useEffect(() => {
    historyRef.current = historyDistributions;
    try {
      localStorage.setItem('water_dist_history', JSON.stringify(historyDistributions));
      localStorage.setItem('water_dist_todays_total', todaysTotal.toString());
    } catch (e) {
      console.error('LocalStorage sync error', e);
    }
  }, [historyDistributions, todaysTotal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await API.post('/auth/login', { username, password });
      const authData = res.data.data;
      localStorage.setItem('collector_token', authData.accessToken);
      localStorage.setItem('water_dist_token', authData.accessToken);
      setToken(authData.accessToken);
      setCurrentScreen('dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('collector_token');
    localStorage.removeItem('water_dist_token');
    setToken(null);
  };

  const isPaidStatus = (status?: string) => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s === 'PAID' || s === 'COMPLETED';
  };

  const fetchCollectorData = async () => {
    try {
      const [priceResult, , historyResult] = await Promise.allSettled([
        API.get('/water-prices/active'),
        API.get('/payments/today'),
        API.get('/distributions?size=500')
      ]);

      if (priceResult.status === 'fulfilled' && priceResult.value.data?.data) {
        setActivePrice(priceResult.value.data.data);
      }

      let fetchedItems: Distribution[] = [];
      if (historyResult.status === 'fulfilled' && historyResult.value.data?.data?.content) {
        fetchedItems = historyResult.value.data.data.content;
      }

      if (!Array.isArray(fetchedItems) || fetchedItems.length === 0) return;

      // Always update historyDistributions with latest server data so UI reflects status immediately
      historyRef.current = fetchedItems;
      setHistoryDistributions(fetchedItems);
      try {
        localStorage.setItem('water_dist_history', JSON.stringify(fetchedItems));
      } catch (e) {}

      // Detect any paid distribution that has not been notified to the collector yet
      const newlyPaidNotices: { noticeId: string; noticeMsg: string }[] = [];
      const updatedNotifiedIds = [...notifiedPaymentIdsRef.current];

      fetchedItems.forEach((fetchedDist) => {
        if (isPaidStatus(fetchedDist.paymentStatus)) {
          const noticeId = `NOTICE-${fetchedDist.distributionCode || fetchedDist.id}`;
          if (!updatedNotifiedIds.includes(noticeId)) {
            updatedNotifiedIds.push(noticeId);
            const noticeMsg = `Notice: Payment of Rs. ${Number(fetchedDist.totalAmount).toFixed(2)} for ${fetchedDist.customerName || 'Customer'} (${fetchedDist.customerCode || 'BILL'}) was PAID & settled by Admin!`;
            newlyPaidNotices.push({ noticeId, noticeMsg });
          }
        }
      });

      if (newlyPaidNotices.length > 0) {
        setNotifiedPaymentIds(updatedNotifiedIds);
        try {
          localStorage.setItem('water_dist_notified_payment_ids', JSON.stringify(updatedNotifiedIds));
        } catch (e) {}

        newlyPaidNotices.forEach(({ noticeId, noticeMsg }) => {
          setNotifications((prevNotes) => {
            if (prevNotes.some((n) => n.id === noticeId)) return prevNotes;
            const newNote: CollectorNotification = {
              id: noticeId,
              title: '⚡ Live Admin Sync',
              message: noticeMsg,
              timestamp: new Date().toLocaleTimeString(),
              read: false,
            };
            const updatedNotes = [newNote, ...prevNotes];
            try {
              localStorage.setItem('water_dist_notifications', JSON.stringify(updatedNotes));
            } catch (e) {}
            return updatedNotes;
          });

          if (!dismissedNoticeIdsRef.current.includes(noticeId)) {
            setAdminPaymentNotice(noticeMsg);
            setActiveNoticeId(noticeId);
          }
        });
      }

      // Recompute today's total strictly for current active shift
      const paidTodaySum = fetchedItems
        .filter((d) => isPaidStatus(d.paymentStatus) && isInActiveShift(d.distributionDate))
        .reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

      setTodaysTotal(paidTodaySum);
      try {
        localStorage.setItem('water_dist_todays_total', paidTodaySum.toString());
      } catch (e) {}

    } catch (e) {
      console.error('Failed to load collector data', e);
    }
  };

  const handleSearchCustomers = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/customers?search=${encodeURIComponent(searchQuery)}&size=20`);
      const fetched = res.data?.data?.content || [];
      if (fetched.length > 0) {
        setCustomers(fetched);
      } else {
        setCustomers([
          { id: 1, customerCode: 'CUST-GVC-0001', fullName: 'Robert Smith', phoneNumber: '+94771234567', address: '45 Water Tank Road, Sector 3', villageId: 1, villageName: 'Green Valley Central', status: 'ACTIVE', lastMeterReading: 120, createdAt: '' },
          { id: 2, customerCode: 'CUST-GVC-0002', fullName: 'Sarah Jenkins', phoneNumber: '+94772345678', address: '12 Palm Grove, Main Street', villageId: 1, villageName: 'Green Valley Central', status: 'ACTIVE', lastMeterReading: 85, createdAt: '' },
          { id: 3, customerCode: 'CUST-GVC-0003', fullName: 'Michael Brown', phoneNumber: '+94773456789', address: '88 Lakeview Avenue', villageId: 1, villageName: 'Green Valley Central', status: 'ACTIVE', lastMeterReading: 210, createdAt: '' },
        ]);
      }
    } catch (e) {
      console.error(e);
      setCustomers([
        { id: 1, customerCode: 'CUST-GVC-0001', fullName: 'Robert Smith', phoneNumber: '+94771234567', address: '45 Water Tank Road, Sector 3', villageId: 1, villageName: 'Green Valley Central', status: 'ACTIVE', lastMeterReading: 120, createdAt: '' },
        { id: 2, customerCode: 'CUST-GVC-0002', fullName: 'Sarah Jenkins', phoneNumber: '+94772345678', address: '12 Palm Grove, Main Street', villageId: 1, villageName: 'Green Valley Central', status: 'ACTIVE', lastMeterReading: 85, createdAt: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    const prevMeter = (c.lastMeterReading !== undefined && c.lastMeterReading !== null) ? Number(c.lastMeterReading) : 120;
    setPreviousReading(prevMeter);
    setCurrentReading(prevMeter + 60);
    setDirectLitres(60);
    setCurrentScreen('record');
    fetchCollectorData();
  };

  // Record Billing (Supports PAID vs NOT PAID options)
  const handleRecordDistribution = async (isPaid: boolean = true) => {
    if (!selectedCustomer) return;
    try {
      setLoading(true);
      setError(null);

      const distRes = await API.post('/distributions', {
        customerId: selectedCustomer.id,
        quantityLitres: computedLitres,
        previousMeterReading: calcMode === 'METER' ? previousReading : undefined,
        currentMeterReading: calcMode === 'METER' ? currentReading : undefined,
      });
      const dist = distRes.data.data;

      let receiptNo = `WTR-${Date.now().toString().slice(-6)}`;
      let statusStr = 'PENDING';

      if (isPaid) {
        const payRes = await API.post('/payments', {
          distributionId: dist.id,
          paymentMethod: paymentMethod,
          referenceNumber: `REF-${Date.now()}`
        });
        receiptNo = payRes.data.data.receiptNumber || receiptNo;
        statusStr = 'PAID';
        setTodaysTotal((prev) => prev + computedTotal);
      }

      const newDistObj: Distribution = {
        ...dist,
        receiptNumber: receiptNo,
        paymentStatus: statusStr
      };

      setLastDistribution(newDistObj);
      setHistoryDistributions((prev) => [newDistObj, ...prev]);
      setSelectedCustomer((prev) => prev ? { ...prev, lastMeterReading: currentReading } : null);

      setCurrentScreen('receipt');
      fetchCollectorData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process water billing. Re-try.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissLiveBanner = () => {
    if (activeNoticeId) {
      setDismissedNoticeIds((prev) => {
        if (prev.includes(activeNoticeId)) return prev;
        const updated = [...prev, activeNoticeId];
        try {
          localStorage.setItem('water_dist_dismissed_notices', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
    setAdminPaymentNotice(null);
  };

  // Account Close / Shift Reset Function & Auto-Logout
  const handleConfirmCloseAccount = async () => {
    try {
      setLoading(true);

      // 1. Generate & download official Shift Audit PDF Report automatically!
      try {
        const summaryPDF = generateShiftSummaryPDF();
        summaryPDF.save(`Shift_Summary_Audit_${new Date().toISOString().slice(0, 10)}.pdf`);
      } catch (pdfErr) {
        console.error('Failed to generate Shift Summary PDF', pdfErr);
      }

      // 2. Reset today's shift collections total to 0
      setTodaysTotal(0);
      localStorage.setItem('water_dist_todays_total', '0');

      // 3. Clear Notifications Inbox & popups
      setNotifications([]);
      setAdminPaymentNotice(null);
      localStorage.removeItem('water_dist_notifications');
      localStorage.removeItem('water_dist_dismissed_notices');

      // 4. Mark all existing paid bills as notified so old notifications NEVER re-trigger on re-login
      const currentPaidNoticeIds = historyDistributions
        .filter((d) => isPaidStatus(d.paymentStatus))
        .map((d) => `NOTICE-${d.distributionCode || d.id}`);

      const mergedNotified = Array.from(new Set([...notifiedPaymentIds, ...currentPaidNoticeIds]));
      setNotifiedPaymentIds(mergedNotified);
      localStorage.setItem('water_dist_notified_payment_ids', JSON.stringify(mergedNotified));

      // 5. Save shift close timestamp & reset cached history
      localStorage.setItem('water_dist_last_shift_close', new Date().toISOString());
      setHistoryDistributions([]);
      localStorage.removeItem('water_dist_history');

      // 6. Automatically log out phone app for fresh start on next login
      localStorage.removeItem('collector_token');
      localStorage.removeItem('water_dist_token');
      setToken(null);
      setCurrentScreen('dashboard');
    } catch (e) {
      console.error('Failed to close shift account', e);
    } finally {
      setLoading(false);
    }
  };

  const openSettlePaymentModal = (item: Distribution) => {
    setSettlingBill(item);
    setSettlePaymentMethod('CASH');
    setSettleReference('');
    setShowSettlePaymentModal(true);
  };

  const handleConfirmSettlePayment = async () => {
    if (!settlingBill) return;
    setSettleLoading(true);

    const paidAmount = settlingBill.totalAmount || 0;

    try {
      if (settlingBill.id) {
        await API.post('/payments', {
          distributionId: settlingBill.id,
          amount: paidAmount,
          paymentMethod: settlePaymentMethod,
          referenceNumber: settleReference || `FIELD-SETTLE-${Date.now()}`
        });
      }
    } catch (err) {
      console.warn('Backend payment record fallback used:', err);
    }

    // Update history state & local storage
    const updatedHistory: Distribution[] = historyDistributions.map(d => {
      if (d.id === settlingBill.id || (settlingBill.distributionCode && d.distributionCode === settlingBill.distributionCode)) {
        return {
          ...d,
          paymentStatus: 'PAID' as const,
          paymentMethod: settlePaymentMethod,
        };
      }
      return d;
    });

    setHistoryDistributions(updatedHistory);
    try {
      localStorage.setItem('water_dist_history', JSON.stringify(updatedHistory));
      const newTotal = todaysTotal + paidAmount;
      setTodaysTotal(newTotal);
      localStorage.setItem('water_dist_todays_total', newTotal.toString());
    } catch (e) {
      console.error(e);
    }

    const paidItem: Distribution = {
      ...settlingBill,
      paymentStatus: 'PAID' as const,
      paymentMethod: settlePaymentMethod,
    };

    setShowSettlePaymentModal(false);
    setSettlingBill(null);
    setLastDistribution(paidItem);
    setCurrentScreen('receipt');
    setSettleLoading(false);
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
      `Collector / Officer: ${item.collectorName || 'John Collector'}\n` +
      `Payment Status: ${item.paymentStatus === 'PAID' ? 'PAID (Confirmed)' : 'UNPAID (Pending Bill)'}\n` +
      `Date: ${new Date(item.distributionDate).toLocaleDateString()}\n` +
      `------------------------------------\n` +
      `Thank you for your water service!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Corporate Enterprise jsPDF PDF Document Generator Function (With Vector Emblem Logo & Security Barcode Art)
  const generateRealPDFDocument = (dist: Distribution): jsPDF => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const isPaid = dist.paymentStatus === 'PAID';

    // 1. Corporate Header Banner (Dark Navy #0f172a)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 595.28, 90, 'F');

    // Vector Water Shield Logo Emblem
    // Outer Emblem Badge (Royal Blue #2563eb)
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(30, 20, 50, 50, 14, 14, 'F');

    // Inner Cyan Droplet (#06b6d4)
    doc.setFillColor(6, 182, 212);
    doc.triangle(55, 27, 42, 48, 68, 48, 'F');
    doc.circle(55, 48, 13, 'F');

    // Droplet White Highlight
    doc.setFillColor(255, 255, 255);
    doc.circle(52, 44, 3.8, 'F');

    // Enterprise Title & Accreditation Tagline
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('AQUADISTRIBUTE UTILITY SERVICES LTD.', 95, 40);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Muted Silver
    doc.text('State Water Supply Infrastructure & Metering Authority • ISO 9001:2025 Certified', 95, 55);

    // Right-aligned Corporate Badge Box
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(415, 20, 150, 50, 8, 8, 'F');

    doc.setTextColor(56, 189, 248); // Sky Blue
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL UTILITY STATEMENT', 425, 38);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dist.receiptNumber || dist.distributionCode}`, 425, 56);

    // 2. Customer & Premise Info Box (2-Column Premium Grid)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 105, 535, 85, 8, 8, 'FD');

    // Account Details (Left Column)
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT HOLDER / PREMISE', 45, 125);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(dist.customerName, 45, 145);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer Code: ${dist.customerCode}`, 45, 162);
    doc.text(`Location / Zone: ${dist.villageName}`, 45, 177);

    // Document Audit Specs (Right Column)
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLING METADATA', 320, 125);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Statement Date: ${new Date(dist.distributionDate).toLocaleDateString()}`, 320, 145);
    doc.text(`Payment Terms: ${isPaid ? 'Immediate Cash Collection' : 'Net 14 Credit Bill'}`, 320, 162);
    doc.text(`Auth Collector: ${dist.collectorName || 'John Collector'}`, 320, 177);

    // 3. Financial Ledger Summary Table
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMIZED FINANCIAL CHARGES / BUTIRAN CAJ', 30, 215);

    // Table Header Bar (Dark Navy Fill)
    doc.setFillColor(30, 41, 59);
    doc.rect(30, 225, 535, 24, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('LINE ITEM DESCRIPTION', 42, 240);
    doc.text('VOLUME / RATE', 320, 240);
    doc.text('AMOUNT (RS.)', 475, 240);

    // Row 1: Previous Balance
    doc.setFillColor(255, 255, 255);
    doc.rect(30, 249, 535, 24, 'F');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text('Previous Outstanding Balance', 42, 265);
    doc.text('-', 340, 265);
    doc.setFont('courier', 'bold');
    doc.text('0.00', 495, 265);

    // Row 2: Water Supply Charge
    doc.setFillColor(248, 250, 252);
    doc.rect(30, 273, 535, 26, 'F');
    doc.setFont('helvetica', 'normal');
    doc.text(`Water Supply Tariff Charge (Tier Slab)`, 42, 290);
    doc.text(`${dist.quantityLitres} L @ Rs. ${dist.pricePerLitre}/L`, 320, 290);
    doc.setFont('courier', 'bold');
    doc.text(`${dist.totalAmount.toFixed(2)}`, 485, 290);

    // Row 3: Total Payable Bar
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.rect(30, 299, 535, 30, 'FD');
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('TOTAL NET PAYABLE AMOUNT', 42, 318);
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(isPaid ? 5 : 225, isPaid ? 150 : 29, isPaid ? 105 : 72);
    doc.text(`Rs. ${dist.totalAmount.toFixed(2)}`, 465, 318);

    // 4. Water Meter Technical Readings Block
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('METER READINGS & AUDIT SPECIFICATIONS', 30, 355);

    doc.setFillColor(241, 245, 249);
    doc.rect(30, 365, 535, 22, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('PREVIOUS READING', 42, 379);
    doc.text('CURRENT READING', 230, 379);
    doc.text('NET CONSUMPTION', 420, 379);

    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dist.previousMeterReading ?? 120} Litres`, 42, 402);
    doc.text(`${dist.currentMeterReading ?? 180} Litres`, 230, 402);
    doc.setTextColor(5, 150, 105);
    doc.text(`${dist.quantityLitres} Litres`, 420, 402);

    // 5. Official Verification Stamp (Green for PAID, Red for UNPAID)
    if (isPaid) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(30, 425, 535, 42, 8, 8, 'FD');
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('✔ OFFICIAL RECEIPT - PAYMENT CONFIRMED & AUDITED', 45, 450);
      doc.setFontSize(9);
      doc.text('STATE WATER SUPPLY AUTHORITY AUTHORIZED STAMP', 320, 450);
    } else {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(30, 425, 535, 42, 8, 8, 'FD');
      doc.setTextColor(159, 18, 57);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('✖ NOTICE OF UNPAID CREDIT - PAYMENT PENDING', 45, 450);
      doc.setFontSize(9);
      doc.text('PLEASE REMIT PAYMENT TO AUTHORIZED OFFICERS', 310, 450);
    }

    // 6. Security Barcode & Officer Signature Art Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 480, 535, 50, 8, 8, 'FD');

    // Vector Barcode Simulation Lines Art
    doc.setDrawColor(30, 41, 59);
    const barcodeStartX = 45;
    const barcodeHeights = [20, 25, 18, 25, 20, 25, 15, 25, 20, 25, 18, 25, 20, 25, 15, 25, 20, 25, 18, 25];
    for (let i = 0; i < 24; i++) {
      const lineWidth = (i % 3 === 0) ? 2 : 1;
      doc.setLineWidth(lineWidth);
      doc.line(barcodeStartX + i * 4, 492, barcodeStartX + i * 4, 492 + (barcodeHeights[i % barcodeHeights.length]));
    }

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`DIGITAL HASH: SHA256-${dist.distributionCode || 'AQUADIST'}-SECURE`, 45, 523);

    // Field Officer Stamp (Right side of box)
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED FIELD OFFICER', 380, 498);

    doc.setTextColor(3, 105, 161);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(dist.collectorName || 'John Collector', 380, 514);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.text('Certified Meter Inspector', 380, 524);

    // 7. Corporate Legal Fine Print Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(30, 545, 565, 545);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('AquaDistribute Utility Infrastructure Services Ltd. • Customer Helpline: +94 11 234 5678 • support@aquadistribute.com', 75, 558);
    doc.text('This is a certified digital system document. Generated automatically by AquaDistribute Enterprise Engine.', 88, 570);

    return doc;
  };

  // Generate Official Shift Summary Audit PDF Report
  const generateShiftSummaryPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const closeDateStr = new Date().toLocaleString();

    // 1. Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 595, 80, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIFT ACCOUNT AUDIT SUMMARY REPORT', 30, 36);

    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`AquaDistribute Enterprise System • Daily Revenue Audit & Shift Reset`, 30, 54);
    doc.text(`Generated: ${closeDateStr}`, 360, 54);

    // 2. Collector Information Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 95, 535, 50, 8, 8, 'FD');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('FIELD COLLECTOR', 45, 112);
    doc.text('SHIFT CLOSE TIMESTAMP', 240, 112);
    doc.text('AUDIT STATUS', 430, 112);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${username} (Collector)`, 45, 130);
    doc.text(new Date().toLocaleTimeString(), 240, 130);
    doc.setTextColor(5, 150, 105);
    doc.text('VERIFIED & CLOSED', 430, 130);

    // 3. Key Financial Summary Cards
    // Card 1: Paid Collections
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(30, 155, 170, 65, 8, 8, 'FD');
    doc.setTextColor(6, 95, 70);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAID COLLECTIONS', 42, 172);
    doc.setFontSize(14);
    doc.text(`Rs. ${todaysPaidSum.toFixed(2)}`, 42, 195);
    doc.setFontSize(8);
    doc.text(`${todaysPaidCount} Paid Bills Settled`, 42, 210);

    // Card 2: Unpaid Credit
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(212, 155, 170, 65, 8, 8, 'FD');
    doc.setTextColor(159, 18, 57);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('UNPAID CREDIT BALANCE', 224, 172);
    doc.setFontSize(14);
    doc.text(`Rs. ${todaysUnpaidSum.toFixed(2)}`, 224, 195);
    doc.setFontSize(8);
    doc.text(`${todaysUnpaidCount} Credit Bills Pending`, 224, 210);

    // Card 3: Total Billed
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(395, 155, 170, 65, 8, 8, 'FD');
    doc.setTextColor(3, 105, 161);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL SHIFT BILLED', 407, 172);
    doc.setFontSize(14);
    doc.text(`Rs. ${totalShiftAmount.toFixed(2)}`, 407, 195);
    doc.setFontSize(8);
    doc.text(`Collection Ratio: ${paidPercent.toFixed(1)}%`, 407, 210);

    // 4. Detailed Paid Bills Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(30, 235, 535, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER / ACCOUNT', 42, 249);
    doc.text('WATER LITRES', 210, 249);
    doc.text('AMOUNT (RS)', 330, 249);
    doc.text('STATUS', 440, 249);
    doc.text('METHOD', 505, 249);

    // 5. Table Rows
    let yPos = 270;
    const paidDistributionsToday = historyDistributions.filter(d => isPaidStatus(d.paymentStatus));

    if (paidDistributionsToday.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('No paid transactions recorded in this shift.', 42, yPos);
      yPos += 20;
    } else {
      paidDistributionsToday.slice(0, 15).forEach((dist, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(30, yPos - 12, 535, 18, 'F');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${dist.customerName || 'Customer'} (${dist.customerCode || 'CODE'})`, 42, yPos);

        doc.setFont('helvetica', 'normal');
        doc.text(`${dist.quantityLitres} L`, 210, yPos);
        doc.text(`Rs. ${Number(dist.totalAmount).toFixed(2)}`, 330, yPos);

        doc.setTextColor(5, 150, 105);
        doc.setFont('helvetica', 'bold');
        doc.text('PAID', 440, yPos);

        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.text(dist.paymentMethod || 'CASH', 505, yPos);

        yPos += 20;
      });
    }

    // 6. Security Audit & Footer
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 750, 535, 45, 8, 8, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL CERTIFIED AUDIT REPORT • SHIFT ACCOUNT SUCCESSFULLY CLOSED & RESET', 45, 768);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('This PDF report serves as an immutable digital proof of daily collection settlement for field auditors.', 45, 782);

    return doc;
  };

  // Download PDF Binary File
  const handleDownloadPDF = (dist: Distribution) => {
    const pdfDoc = generateRealPDFDocument(dist);
    pdfDoc.save(`Water_Bill_${dist.receiptNumber || dist.distributionCode}.pdf`);
  };

  // Share Real Binary PDF File via WhatsApp / Native Share Engine
  const handleShareWhatsAppPDF = async (item: Distribution) => {
    const pdfDoc = generateRealPDFDocument(item);
    const pdfBlob = pdfDoc.output('blob');
    const fileName = `Water_Bill_${item.receiptNumber || item.distributionCode}.pdf`;

    try {
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Water Bill ${item.receiptNumber || item.distributionCode}`,
          text: `Official Water Bill PDF Invoice for ${item.customerName} (Rs. ${item.totalAmount.toFixed(2)})`
        });
        return;
      }
    } catch (e) {
      console.log('Native PDF file share fallback used', e);
    }

    // Direct Desktop Fallback
    pdfDoc.save(fileName);
    openWhatsAppReceipt(item);
  };

  const openFormalInvoiceModal = (dist: Distribution) => {
    setSelectedInvoice(dist);
    setShowInvoiceModal(true);
  };

  const isInActiveShift = (dateStr?: string) => {
    if (!dateStr) return true;
    const itemTime = new Date(dateStr).getTime();

    // Read shift close timestamp
    const lastCloseISO = localStorage.getItem('water_dist_last_shift_close');
    if (lastCloseISO) {
      const lastCloseTime = new Date(lastCloseISO).getTime();
      // If distribution was created BEFORE or AT the last shift close, it belongs to closed shift!
      if (itemTime <= lastCloseTime) {
        return false;
      }
    }

    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  };

  // Active Shift History (Only distributions created AFTER last shift close!)
  const activeShiftDistributions = historyDistributions.filter(d => isInActiveShift(d.distributionDate));

  // Active Shift Counters & Sums
  const paidCount = activeShiftDistributions.filter(d => isPaidStatus(d.paymentStatus)).length;
  const unpaidCount = activeShiftDistributions.filter(d => !isPaidStatus(d.paymentStatus)).length;
  const totalBilledAmount = activeShiftDistributions.reduce((acc, d) => acc + (d.totalAmount || 0), 0);

  const todaysPaidSum = activeShiftDistributions
    .filter(d => isPaidStatus(d.paymentStatus))
    .reduce((acc, d) => acc + (d.totalAmount || 0), 0);

  const todaysUnpaidSum = activeShiftDistributions
    .filter(d => !isPaidStatus(d.paymentStatus))
    .reduce((acc, d) => acc + (d.totalAmount || 0), 0);

  const todaysPaidCount = activeShiftDistributions
    .filter(d => isPaidStatus(d.paymentStatus)).length;

  const todaysUnpaidCount = activeShiftDistributions
    .filter(d => !isPaidStatus(d.paymentStatus)).length;

  const totalShiftAmount = todaysPaidSum + todaysUnpaidSum;
  const paidPercent = totalShiftAmount > 0 ? (todaysPaidSum / totalShiftAmount) * 100 : 100;

  const filteredHistory = activeShiftDistributions.filter(d => {
    if (historyFilter === 'PAID') return isPaidStatus(d.paymentStatus);
    if (historyFilter === 'UNPAID') return !isPaidStatus(d.paymentStatus);
    return true;
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 p-7 space-y-6 shadow-2xl">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
              <Droplets className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">AquaCollector</h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">Water Meter Billing & Collections</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 text-sm transition transform active:scale-98"
            >
              {loading ? 'Signing In...' : 'Sign In as Collector'}
            </button>
            <a
              href="/"
              className="w-full py-3 text-center text-xs font-bold text-slate-500 hover:text-blue-600 block transition"
            >
              ⬅ Return to Admin Dashboard
            </a>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-6 px-3">
      {/* Top Bar for Admin Return */}
      <div className="w-full max-w-sm flex justify-between items-center mb-3 px-2">
        <a
          href="/"
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1.5 transition bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Admin Portal</span>
        </a>
        <span className="text-[11px] font-bold text-blue-400">Collector Mobile Simulator</span>
      </div>

      {/* Smartphone Outer Container Wrapper */}
      <div className="bg-slate-50 w-full max-w-sm rounded-[40px] border-[8px] border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden relative min-h-[780px]">

        {/* REAL-TIME ADMIN PAYMENT SETTLEMENT NOTIFICATION BANNER - GUARANTEED INLINE ROUNDED CORNERS */}
        {adminPaymentNotice && (
          <div
            style={{ borderRadius: '24px' }}
            className="absolute top-3 left-3 right-3 z-50 bg-[#0f172a] text-white p-3.5 shadow-2xl border border-blue-400/40 ring-1 ring-blue-500/20 flex items-center space-x-3 overflow-hidden animate-in fade-in zoom-in duration-200"
          >
            {/* Curved Green Bell Icon Box */}
            <div
              style={{ borderRadius: '16px' }}
              className="w-10 h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner"
            >
              <Bell className="w-5 h-5 text-emerald-400 animate-bounce" />
            </div>

            {/* Notice Message Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">LIVE ADMIN SYNC</span>
              </div>
              <p className="text-[11px] font-extrabold text-slate-100 leading-snug">
                {adminPaymentNotice}
              </p>
            </div>

            {/* Circular Close Button */}
            <button
              onClick={handleDismissLiveBanner}
              style={{ borderRadius: '9999px' }}
              className="w-7 h-7 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 border border-white/15 transition cursor-pointer"
              title="Dismiss Notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SCREEN 1: MAIN HOME DASHBOARD */}
        {currentScreen === 'dashboard' && (
          <div className="flex-1 flex flex-col pb-20 overflow-y-auto">
            {/* Top Blue Curved Header with User Profile */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white px-6 pt-7 pb-14 rounded-b-[36px] relative shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-inner">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight leading-tight">John Collector</h2>
                    <p className="text-[11px] text-blue-100 font-medium">Field Officer • Sector 3</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  {/* Notifications Inbox Button */}
                  <button
                    onClick={() => setCurrentScreen('notifications')}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-full text-white backdrop-blur-md relative transition active:scale-95 cursor-pointer"
                    title="Notifications Inbox"
                  >
                    <Bell className="w-4 h-4 text-white" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-900 text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  <button onClick={handleLogout} className="p-2 bg-white/15 hover:bg-white/25 rounded-full text-white backdrop-blur-md">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Overlapping White Floating Card */}
            <div className="px-5 -mt-10 z-10">
              <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/60 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Today's Collection</span>
                  <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>LIVE</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    Rs. {todaysTotal.toFixed(2)}
                  </h1>
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div onClick={() => setShowSlabsModal(true)} className="cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition border border-transparent hover:border-slate-200">
                    <span className="text-slate-400 font-medium block text-[10px]">Active Rate (Click for Slabs)</span>
                    <span className="font-extrabold text-blue-600">Rs. {unitPrice.toFixed(2)} / L</span>
                  </div>
                  <div onClick={() => setShowSlabsModal(true)} className="cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition border border-transparent hover:border-slate-200">
                    <span className="text-slate-400 font-medium block text-[10px]">Current Slab</span>
                    <span className="font-extrabold text-slate-800 truncate block">{matchingSlabName.split('-')[0]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Quick Action Grid Buttons */}
            <div className="px-5 mt-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Quick Services</h3>
              <div className="grid grid-cols-2 gap-3.5">
                {/* Button 1: Meter Billing */}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    handleSearchCustomers();
                    setCurrentScreen('search');
                  }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 transition flex flex-col items-center text-center space-y-2.5 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">Record Meter</p>
                    <p className="text-[10px] text-slate-400 font-medium">Household billing</p>
                  </div>
                </button>

                {/* Button 2: Receipts / History */}
                <button
                  onClick={() => setCurrentScreen('history')}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-amber-500 transition flex flex-col items-center text-center space-y-2.5 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">All Bill History</p>
                    <p className="text-[10px] text-slate-400 font-medium">Paid & Unpaid Bills</p>
                  </div>
                </button>

                {/* Button 3: Households */}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    handleSearchCustomers();
                    setCurrentScreen('search');
                  }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-500 transition flex flex-col items-center text-center space-y-2.5 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">Households</p>
                    <p className="text-[10px] text-slate-400 font-medium">Customer List</p>
                  </div>
                </button>

                {/* Button 4: Unpaid Bills Action Card (REPLACED RATES & SLABS PLACE) */}
                <button
                  onClick={() => {
                    setHistoryFilter('UNPAID');
                    setCurrentScreen('history');
                  }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-rose-500 transition flex flex-col items-center text-center space-y-2.5 group cursor-pointer relative"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition relative">
                    <AlertCircle className="w-6 h-6 text-rose-600" />
                    {unpaidCount > 0 && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full shadow-sm animate-pulse">
                        {unpaidCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">Unpaid Bills</p>
                    <p className="text-[10px] text-rose-600 font-black">
                      {unpaidCount > 0 ? `${unpaidCount} Pending Credit` : 'All Paid & Clear'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Account Close Card (Shift Close-Out & Round Donut Summary) */}
            <div className="px-5 mt-4">
              <button
                onClick={() => setCurrentScreen('close_account')}
                className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between hover:opacity-95 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-white">End Shift / Account Close</p>
                    <p className="text-[10px] text-slate-400 font-medium">View Paid vs Unpaid & Reset 0</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
                  CLOSE SHIFT
                </span>
              </button>
            </div>

            {/* Bottom Promo Card */}
            <div className="px-5 mt-4">
              <div
                onClick={() => setShowSlabsModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between cursor-pointer hover:opacity-95 transition"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-blue-200 tracking-wide block">Active System Tariff</span>
                  <p className="text-xs font-extrabold text-white">Tier 3 High Usage (51+ L)</p>
                  <p className="text-[10px] text-blue-100">Click to view complete slab table</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: SEARCH HOUSEHOLD */}
        {currentScreen === 'search' && (
          <div className="flex-1 flex flex-col pb-20 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex items-center space-x-3 shadow-md">
              <button onClick={() => setCurrentScreen('dashboard')} className="p-1 rounded-full hover:bg-white/10">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h2 className="text-base font-black tracking-tight">Select Household</h2>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Search customer name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                />
                <button
                  onClick={handleSearchCustomers}
                  className="px-4 bg-blue-600 text-white font-bold rounded-2xl text-xs flex items-center shadow-md shadow-blue-600/30"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500 cursor-pointer transition shadow-sm flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-slate-900">{c.fullName}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                          {c.customerCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Meter #{c.meterNumber || 'MTR-1001'} • {c.address}</p>
                      <p className="text-[11px] text-emerald-600 font-bold">Last Reading: {c.lastMeterReading ?? 120} L</p>
                    </div>
                    <button className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm">
                      Bill
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: RECORD METER BILLING (WITH PAID vs NOT PAID OPTIONS) */}
        {currentScreen === 'record' && selectedCustomer && (
          <div className="flex-1 flex flex-col pb-20 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex items-center space-x-3 shadow-md">
              <button onClick={() => setCurrentScreen('search')} className="p-1 rounded-full hover:bg-white/10">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h2 className="text-base font-black tracking-tight">Record Water Meter</h2>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-black text-sm text-slate-900">{selectedCustomer.fullName}</p>
                  <p className="text-xs text-slate-500 font-medium">{selectedCustomer.customerCode} • {selectedCustomer.address}</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white font-extrabold text-[10px] rounded-full">ACTIVE</span>
              </div>

              <div className="flex border border-slate-200 rounded-2xl p-1 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setCalcMode('METER')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
                    calcMode === 'METER' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600'
                  }`}
                >
                  Household Meter
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('DIRECT')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
                    calcMode === 'DIRECT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600'
                  }`}
                >
                  Direct Litres
                </button>
              </div>

              {calcMode === 'METER' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Previous Reading</label>
                    <input
                      type="number"
                      value={previousReading}
                      onChange={(e) => setPreviousReading(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-900 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Current Reading</label>
                    <input
                      type="number"
                      value={currentReading}
                      onChange={(e) => setCurrentReading(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-900 shadow-sm focus:border-blue-600"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Quantity (Litres)</label>
                  <input
                    type="number"
                    value={directLitres}
                    onChange={(e) => setDirectLitres(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-900 shadow-sm"
                  />
                </div>
              )}

              <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl space-y-3 shadow-xl border border-slate-800">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Volume Consumed:</span>
                  <span className="font-extrabold text-blue-400">{computedLitres} Litres</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Admin Matching Tier:</span>
                  <span className="font-extrabold text-amber-400">{matchingSlabName}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Whole Volume Rate:</span>
                  <span className="font-extrabold text-emerald-400">Rs. {unitPrice.toFixed(2)} / L</span>
                </div>
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-300 uppercase">Calculated Total:</span>
                  <span className="text-2xl font-black text-emerald-400">Rs. {computedTotal.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-3 rounded-2xl font-black text-xs border transition ${
                      paymentMethod === 'CASH'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    CASH
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ONLINE')}
                    className={`py-3 rounded-2xl font-black text-xs border transition ${
                      paymentMethod === 'ONLINE'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    ONLINE
                  </button>
                </div>
              </div>

              {/* TWO ACTION BUTTONS: CONFIRM PAID vs GENERATE BILL ONLY (NOT PAID) */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleRecordDistribution(true)}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 text-sm transition"
                >
                  {loading ? 'Processing Billing...' : 'Confirm Payment & Collect'}
                </button>

                <button
                  onClick={() => handleRecordDistribution(false)}
                  disabled={loading}
                  className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black rounded-2xl border border-rose-200 text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Generate Bill Only (Not Paid)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: DIGITAL RECEIPT */}
        {currentScreen === 'receipt' && lastDistribution && (
          <div className="flex-1 flex flex-col p-6 space-y-5 justify-center text-center pb-20 overflow-y-auto">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md ${
              lastDistribution.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {lastDistribution.paymentStatus === 'PAID' ? (
                <CheckCircle2 className="w-10 h-10" />
              ) : (
                <AlertCircle className="w-10 h-10" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {lastDistribution.paymentStatus === 'PAID' ? 'Payment Recorded!' : 'Bill Generated (Unpaid)'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {lastDistribution.paymentStatus === 'PAID'
                  ? 'Digital receipt issued successfully'
                  : 'Customer credit bill created. Marked as UNPAID.'}
              </p>
            </div>

            <div className={`text-white p-5 rounded-3xl shadow-xl text-left space-y-3 relative overflow-hidden ${
              lastDistribution.paymentStatus === 'PAID'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                : 'bg-gradient-to-r from-slate-800 to-rose-950'
            }`}>
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <span className="font-black text-sm tracking-wide uppercase">AQUADISTRIBUTE PASS</span>
                <CreditCard className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-xs text-blue-100 font-bold">{lastDistribution.receiptNumber}</p>
              <div className="pt-2 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-blue-200 uppercase font-semibold">Customer</p>
                  <p className="font-extrabold text-sm text-white">{lastDistribution.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-blue-200 uppercase font-semibold">Billed Amount</p>
                  <p className={`text-lg font-black ${
                    lastDistribution.paymentStatus === 'PAID' ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    Rs. {lastDistribution.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs font-mono shadow-sm">
              <div className="flex justify-between"><span className="text-slate-400">Volume Consumed:</span><span className="font-bold text-slate-900">{lastDistribution.quantityLitres} L</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Applied Rate:</span><span className="font-bold text-slate-900">Rs. {lastDistribution.pricePerLitre}/L</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-black">
                <span className="text-slate-800">Status:</span>
                <span className={`font-extrabold ${
                  lastDistribution.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {lastDistribution.paymentStatus === 'PAID' ? 'PAID (CONFIRMED)' : 'UNPAID (CREDIT RECORD)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShareWhatsAppPDF(lastDistribution)}
                className="py-3 bg-emerald-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-md hover:bg-emerald-700 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp PDF</span>
              </button>
              <button
                onClick={() => openFormalInvoiceModal(lastDistribution)}
                className="py-3 bg-blue-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-md hover:bg-blue-700 transition"
              >
                <Eye className="w-4 h-4" />
                <span>View Invoice</span>
              </button>
            </div>

            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl text-xs shadow-lg transition"
            >
              Back to Home Dashboard
            </button>
          </div>
        )}

        {/* SCREEN 5: ALL BILL HISTORY (EXPANDABLE ACCORDION CARDS WITH PAID & UNPAID FILTERS) */}
        {currentScreen === 'history' && (
          <div className="flex-1 flex flex-col pb-20 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <button onClick={() => setCurrentScreen('dashboard')} className="p-1 rounded-full hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h2 className="text-base font-black tracking-tight">All Bill History</h2>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 bg-white/20 rounded-full text-white">
                {historyDistributions.length} Records
              </span>
            </div>

            {/* TOP SUMMARY STATS BANNER */}
            <div className="bg-slate-900 text-white p-3.5 px-4 flex justify-between items-center text-xs font-bold border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total Billed</span>
                <span className="font-black text-white text-sm">Rs. {totalBilledAmount.toFixed(2)}</span>
              </div>
              <div className="text-right flex items-center space-x-3">
                <div>
                  <span className="text-[10px] text-emerald-400 block uppercase">Paid</span>
                  <span className="font-black text-emerald-400">{paidCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 block uppercase">Unpaid</span>
                  <span className="font-black text-rose-400">{unpaidCount}</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE PAID / UNPAID FILTER TABS */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 grid grid-cols-3 gap-1.5 text-xs font-black">
              <button
                onClick={() => setHistoryFilter('ALL')}
                className={`py-2 rounded-xl transition ${
                  historyFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                All ({historyDistributions.length})
              </button>
              <button
                onClick={() => setHistoryFilter('PAID')}
                className={`py-2 rounded-xl transition flex items-center justify-center space-x-1 ${
                  historyFilter === 'PAID'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-emerald-700 border border-emerald-200'
                }`}
              >
                <span>Paid ({paidCount})</span>
              </button>
              <button
                onClick={() => setHistoryFilter('UNPAID')}
                className={`py-2 rounded-xl transition flex items-center justify-center space-x-1 ${
                  historyFilter === 'UNPAID'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-rose-700 border border-rose-200'
                }`}
              >
                <span>Unpaid ({unpaidCount})</span>
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm my-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-black text-slate-900 text-sm">All Accounts Clear!</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      {historyFilter === 'UNPAID'
                        ? 'All customer credit bills have been paid & settled.'
                        : `No bill records found under filter "${historyFilter}".`}
                    </p>
                  </div>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isPaid = item.paymentStatus === 'PAID';
                  const isExpanded = expandedBillId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white border rounded-3xl transition-all duration-200 overflow-hidden shadow-sm ${
                        isExpanded ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Clickable Card Header (Always Visible) */}
                      <div
                        onClick={() => setExpandedBillId(isExpanded ? null : item.id)}
                        className="p-4 bg-white hover:bg-slate-50/70 transition cursor-pointer select-none space-y-2"
                      >
                        {/* Row 1: Name + Status Badge + Chevron */}
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-sm text-slate-900 truncate pr-2">{item.customerName}</h4>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border flex items-center space-x-1 ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {isPaid ? (
                                <>
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>PAID</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3" />
                                  <span>UNPAID</span>
                                </>
                              )}
                            </span>
                            <div className="p-1 rounded-full bg-slate-100 text-slate-500">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Customer Code & Address */}
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {item.customerCode} • {item.villageName}
                        </p>

                        {/* Row 3: Bill Code + Billed Price */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
                          <span className="text-[11px] font-extrabold text-slate-400 font-mono">
                            #{item.receiptNumber || item.distributionCode}
                          </span>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Billed:</span>
                            <span className={`font-black ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                              Rs. {item.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Accordion Details Container */}
                      {isExpanded && (
                        <div className="p-4 pt-0 space-y-3 border-t border-slate-100 bg-slate-50/50">
                          <div className="grid grid-cols-3 gap-2 text-xs bg-white p-3 rounded-2xl text-center border border-slate-200 shadow-sm mt-3">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume</span>
                              <span className="font-black text-slate-900">{item.quantityLitres} L</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Rate</span>
                              <span className="font-black text-blue-600">Rs. {item.pricePerLitre}/L</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Billed</span>
                              <span className={`font-black ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                Rs. {item.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs space-y-1.5 font-medium">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Previous Reading:</span>
                              <span className="font-bold text-slate-800">{item.previousMeterReading ?? 120} L</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Current Reading:</span>
                              <span className="font-bold text-slate-800">{item.currentMeterReading ?? 180} L</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Date & Time:</span>
                              <span className="font-bold text-slate-800">{new Date(item.distributionDate).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Authorized Officer:</span>
                              <span className="font-bold text-blue-700">{item.collectorName || 'John Collector'}</span>
                            </div>
                          </div>

                          {/* Buttons: Pay Bill Now (if unpaid) + WhatsApp PDF + View Invoice */}
                          <div className="space-y-2 pt-1">
                            {item.paymentStatus !== 'PAID' && (
                              <button
                                onClick={() => openSettlePaymentModal(item)}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition transform active:scale-98 cursor-pointer"
                              >
                                <CreditCard className="w-4 h-4 text-white" />
                                <span>Pay Bill Now (Rs. {item.totalAmount.toFixed(2)})</span>
                              </button>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleShareWhatsAppPDF(item)}
                                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 shadow-md transition"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>WhatsApp PDF</span>
                              </button>
                              <button
                                onClick={() => openFormalInvoiceModal(item)}
                                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 shadow-md transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Invoice</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SCREEN 6: NOTIFICATIONS INBOX PAGE */}
        {currentScreen === 'notifications' && (
          <div className="flex-1 flex flex-col pb-20 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white p-5 flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <button onClick={() => setCurrentScreen('dashboard')} className="p-1 rounded-full hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h2 className="text-base font-black tracking-tight">Notifications Inbox</h2>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 bg-white/20 rounded-full text-white">
                {notifications.length} Messages
              </span>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {notifications.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm my-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">No Notifications Yet</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Admin payment updates for this shift will appear here.</p>
                  </div>
                </div>
              ) : (
                notifications.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black text-slate-900">{note.title}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{note.timestamp}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{note.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {currentScreen === 'close_account' && (
          <div className="flex-1 flex flex-col pb-20 overflow-y-auto">
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white p-5 flex items-center space-x-3 shadow-md border-b border-slate-800">
              <button onClick={() => setCurrentScreen('dashboard')} className="p-1 rounded-full hover:bg-white/10">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h2 className="text-base font-black tracking-tight">Shift Account Close-Out</h2>
                <p className="text-[11px] text-slate-400">Daily Revenue Audit & Shift Reset</p>
              </div>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* ROUND DONUT GRAPH */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Paid vs Unpaid Ratio</span>
                
                {/* SVG Round Donut Ring */}
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-rose-500"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeDasharray={`${paidPercent}, 100`}
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Total Shift</span>
                    <span className="text-base font-black text-slate-900">Rs. {totalShiftAmount.toFixed(0)}</span>
                  </div>
                </div>

                <div className="flex justify-center space-x-4 text-xs font-extrabold pt-2 border-t border-slate-100">
                  <span className="flex items-center text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>
                    Paid ({paidPercent.toFixed(0)}%)
                  </span>
                  <span className="flex items-center text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span>
                    Unpaid ({(100 - paidPercent).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* FINANCIAL BREAKDOWN CARDS */}
              <div className="grid grid-cols-2 gap-3">
                {/* Left Card: Paid Collections */}
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-left flex flex-col justify-between space-y-2 shadow-sm">
                  <div className="flex items-center space-x-1.5 text-emerald-700 border-b border-emerald-200/60 pb-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 truncate">Paid Collections</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 font-bold block uppercase">Total Cash</span>
                    <p className="text-base font-black text-emerald-950 font-mono tracking-tight">Rs. {todaysPaidSum.toFixed(2)}</p>
                  </div>
                  <div className="pt-1.5 border-t border-emerald-200/60">
                    <span className="text-[10px] text-emerald-800 font-extrabold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{todaysPaidCount} Paid Bills Today</span>
                    </span>
                  </div>
                </div>

                {/* Right Card: Unpaid Credit */}
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-left flex flex-col justify-between space-y-2 shadow-sm">
                  <div className="flex items-center space-x-1.5 text-rose-700 border-b border-rose-200/60 pb-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 truncate">Unpaid Credit</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 font-bold block uppercase">Total Credit</span>
                    <p className="text-base font-black text-rose-950 font-mono tracking-tight">Rs. {todaysUnpaidSum.toFixed(2)}</p>
                  </div>
                  <div className="pt-1.5 border-t border-rose-200/60">
                    <span className="text-[10px] text-rose-800 font-extrabold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>{todaysUnpaidCount} Unpaid Bills Today</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* SAFE PERSISTENCE NOTICE */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1 text-left">
                <div className="flex items-center space-x-2 font-black text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Permanent Database Protection</span>
                </div>
                <p className="text-[11px] font-medium leading-tight">
                  Closing this shift will reset the active shift total to <strong>Rs. 0.00</strong> for your next collection cycle. All customer meter readings and invoices remain permanently saved in the database!
                </p>
              </div>

              {/* ACTION BUTTON: CONFIRM CLOSE & RESET 0 */}
              <button
                onClick={handleConfirmCloseAccount}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black rounded-2xl shadow-xl shadow-rose-600/30 text-sm transition flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Confirm Close Shift & Reset 0</span>
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between z-20">
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'dashboard' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-black">Home</span>
          </button>

          <button
            onClick={() => {
              setSearchQuery('');
              handleSearchCustomers();
              setCurrentScreen('search');
            }}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'search' || currentScreen === 'record' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <Gauge className="w-5 h-5" />
            <span className="text-[9px] font-black">Billing</span>
          </button>

          <button
            onClick={() => setCurrentScreen('history')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'history' || currentScreen === 'receipt' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[9px] font-black">Receipts</span>
          </button>

          <button
            onClick={() => setCurrentScreen('close_account')}
            className={`flex flex-col items-center space-y-1 transition ${
              currentScreen === 'close_account' ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            <Lock className="w-5 h-5" />
            <span className="text-[9px] font-black">Close</span>
          </button>
        </div>

      </div>

      {/* SHIFT CLOSE SUCCESS MODAL */}
      {showShiftCloseSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Shift Closed Successfully!</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Active shift counter reset to <strong>Rs. 0.00</strong>. All historical bills are safely stored in the database.
              </p>
            </div>
            <button
              onClick={() => setShowShiftCloseSuccessModal(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-md"
            >
              Start New Collection Shift
            </button>
          </div>
        </div>
      )}

      {/* RATES & SLABS MODAL */}
      {showSlabsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Active Water Price Tiers</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Configured Tariff Slabs</p>
                </div>
              </div>
              <button
                onClick={() => setShowSlabsModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {tiersToUse.map((t, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {t.tierName}
                    </span>
                    <p className="text-xs text-slate-600 font-bold">
                      Litres Range: <span className="text-slate-900">{t.minLitres} L - {t.maxLitres ? `${t.maxLitres} L` : 'Unlimited (51+L)'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold block">Rate</span>
                    <span className="text-lg font-black text-emerald-600">Rs. {t.pricePerLitre.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] text-blue-800 font-medium leading-relaxed">
              💡 <strong>Whole-Volume Slab Rule:</strong> The total volume supplied is evaluated against these tiers. The matched tier rate applies to the entire volume billed.
            </div>

            <button
              onClick={() => setShowSlabsModal(false)}
              className="w-full py-3 bg-slate-900 text-white font-black text-xs rounded-2xl shadow-md"
            >
              Close Tiers View
            </button>
          </div>
        </div>
      )}

      {/* FORMAL WATER BILL INVOICE MODAL (CONTAINED 100% INSIDE PHONE BORDERS) */}
      {showInvoiceModal && selectedInvoice && (
        <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto rounded-[32px]">
          <div className="bg-white w-full max-w-[340px] rounded-3xl p-4 space-y-3.5 shadow-2xl relative border border-slate-200 max-h-[720px] overflow-y-auto my-auto">
            {/* Close Button & Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-blue-600 tracking-wider uppercase flex items-center space-x-1.5">
                <Droplets className="w-4 h-4" />
                <span>AquaDistribute Utility Services</span>
              </span>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">WATER BILL / INVOIS</h1>
                  <p className="text-xs text-slate-500 font-bold">Official Customer Invoice</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Bill No / No. Invois</span>
                  <span className="text-xs font-black text-blue-700">{selectedInvoice.receiptNumber || selectedInvoice.distributionCode}</span>
                </div>
              </div>

              {/* Customer Premise & Account Details Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Holder / Nama</span>
                  <p className="font-extrabold text-slate-900">{selectedInvoice.customerName}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedInvoice.customerCode}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Premise / Address</span>
                  <p className="font-bold text-slate-800 text-[11px] leading-tight">{selectedInvoice.villageName}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Date: {new Date(selectedInvoice.distributionDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Billing Summary Table */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Billing Summary / Ringkasan Bil</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-right">Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      <tr>
                        <td className="p-2.5">Previous Balance</td>
                        <td className="p-2.5 text-right font-mono">Rs. 0.00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Current Usage Charge ({selectedInvoice.quantityLitres} L @ Rs. {selectedInvoice.pricePerLitre}/L)</td>
                        <td className="p-2.5 text-right font-mono font-bold">Rs. {selectedInvoice.totalAmount.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-blue-50/70 font-black text-slate-900">
                        <td className="p-2.5 text-blue-900">TOTAL PAYABLE / JUMLAH PERLU DIBAYAR</td>
                        <td className={`p-2.5 text-right font-mono text-sm ${
                          selectedInvoice.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          Rs. {selectedInvoice.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Meter Readings Table */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Meter Readings / Butiran Meter</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-center">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-left">Previous</th>
                        <th className="p-2">Current</th>
                        <th className="p-2 text-right">Consumption</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-slate-800">
                      <tr>
                        <td className="p-2.5 text-left font-mono text-slate-600">{selectedInvoice.previousMeterReading ?? 120} L</td>
                        <td className="p-2.5 font-mono text-slate-900">{selectedInvoice.currentMeterReading ?? 180} L</td>
                        <td className="p-2.5 text-right font-mono text-emerald-600">{selectedInvoice.quantityLitres} Litres</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Confirmation Stamp (Green for PAID, Red for UNPAID) */}
              <div className={`p-3 border rounded-2xl flex items-center justify-between text-xs ${
                selectedInvoice.paymentStatus === 'PAID'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center space-x-2 font-extrabold">
                  {selectedInvoice.paymentStatus === 'PAID' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>PAYMENT STATUS: PAID (CONFIRMED)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                      <span>PAYMENT STATUS: UNPAID (PENDING CREDIT BILL)</span>
                    </>
                  )}
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedInvoice.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {selectedInvoice.paymentStatus === 'PAID' ? 'OFFICIAL' : 'UNPAID'}
                </span>
              </div>

              {/* PROMINENT COLLECTOR MARK TAG */}
              <div className="p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Collector / Authorized Officer</span>
                    <p className="font-extrabold text-blue-950 text-xs">{selectedInvoice.collectorName || 'John Collector'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-blue-700 uppercase px-2.5 py-1 bg-blue-100 rounded-full border border-blue-200">
                  VERIFIED
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => handleShareWhatsAppPDF(selectedInvoice)}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp PDF</span>
              </button>
              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT SETTLEMENT MODAL (CONTAINED 100% INSIDE PHONE BORDERS) */}
      {showSettlePaymentModal && settlingBill && (
        <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto rounded-[32px]">
          <div className="bg-white w-full max-w-[340px] rounded-3xl p-4 space-y-3.5 shadow-2xl relative border border-slate-100 max-h-[720px] overflow-y-auto animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Collect Payment</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Field Collector Settlement</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlePaymentModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Summary Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Customer Name:</span>
                <span className="font-black text-slate-900">{settlingBill.customerName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Account / Code:</span>
                <span className="font-bold text-blue-700 font-mono">{settlingBill.customerCode}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-bold">Water Delivered:</span>
                <span className="font-extrabold text-blue-900">{settlingBill.quantityLitres} Litres</span>
              </div>
            </div>

            {/* Total Net Amount Highlight Card */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Total Net Amount to Collect</span>
              <p className="text-3xl font-black text-emerald-950 font-mono">
                Rs. {settlingBill.totalAmount.toFixed(2)}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Received Payment Method</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod('CASH')}
                  className={`py-3.5 px-3 rounded-2xl border text-xs font-black transition flex items-center justify-center ${
                    settlePaymentMethod === 'CASH'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-2 ring-blue-400/50'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>CASH PAYMENT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod('ONLINE')}
                  className={`py-3.5 px-3 rounded-2xl border text-xs font-black transition flex items-center justify-center ${
                    settlePaymentMethod === 'ONLINE'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-2 ring-blue-400/50'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>ONLINE / UPI</span>
                </button>
              </div>
            </div>

            {/* Reference Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Payment Note / Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Cash collected in field"
                value={settleReference}
                onChange={(e) => setSettleReference(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmSettlePayment}
              disabled={settleLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/30 transition transform active:scale-98 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{settleLoading ? 'Processing Payment...' : `Confirm Payment (Rs. ${settlingBill.totalAmount.toFixed(2)})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* SHIFT CLOSE SUCCESS MODAL */}
      {showShiftCloseSuccessModal && (
        <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 rounded-[32px]">
          <div className="bg-white w-full max-w-[320px] rounded-3xl p-5 text-center space-y-4 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-lg">Shift Account Closed!</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Active shift total reset to <strong className="text-slate-900 font-mono font-black">Rs. 0.00</strong> for your new collection cycle. All customer billing records remain safely protected.
              </p>
            </div>
            <button
              onClick={() => setShowShiftCloseSuccessModal(false)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95 cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
