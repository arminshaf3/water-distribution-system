export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  roles: string[];
}

export interface Village {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: number;
  customerCode: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  villageId: number;
  villageName: string;
  meterNumber?: string;
  lastMeterReading?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface WaterPrice {
  id: number;
  pricePerLitre: number;
  effectiveFrom: string;
  isActive: boolean;
  notes?: string;
  createdByName?: string;
  tiers?: { tierName: string; minLitres: number; maxLitres: number | null; pricePerLitre: number }[];
}

export interface Distribution {
  id: number;
  distributionCode: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  villageName: string;
  collectorId: number;
  collectorName: string;
  quantityLitres: number;
  pricePerLitre: number;
  totalAmount: number;
  previousMeterReading?: number;
  currentMeterReading?: number;
  distributionDate: string;
  paymentStatus: 'PENDING' | 'PAID';
  receiptNumber?: string;
  paymentMethod?: string;
}

export interface Payment {
  id: number;
  distributionId: number;
  distributionCode: string;
  customerName: string;
  customerCode: string;
  amount: number;
  paymentMethod: 'CASH' | 'ONLINE';
  paymentStatus: 'COMPLETED' | 'FAILED';
  collectorName: string;
  paymentDate: string;
  referenceNumber?: string;
  receiptNumber?: string;
}

export interface Receipt {
  id: number;
  receiptNumber: string;
  customerCode: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  villageName: string;
  quantityLitres: number;
  pricePerLitre: number;
  totalAmount: number;
  paymentMethod: string;
  referenceNumber?: string;
  collectorName: string;
  issuedAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  todaysLitresDistributed: number;
  todaysAmountCollected: number;
  monthlyLitresDistributed: number;
  monthlyAmountCollected: number;
  pendingPaymentsAmount: number;
  pendingPaymentsCount: number;
  activeCollectorsCount: number;
  currentWaterPricePerLitre: number;
  dailyDistributionTrend: { date: string; value: number }[];
  dailyCollectionTrend: { date: string; value: number }[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ClosedDayAuditRecord {
  id: string;
  auditRefCode: string;
  closedDate: string;
  closedTimestamp: string;
  totalPaidSum: number;
  totalUnpaidSum: number;
  totalRevenue: number;
  totalLitres: number;
  paidCount: number;
  unpaidCount: number;
  distributions: Distribution[];
}
