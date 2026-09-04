import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './pages/Login';
import { DashboardOverview } from './pages/DashboardOverview';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { CollectorsPage } from './pages/CollectorsPage';
import { VillagesPage } from './pages/VillagesPage';
import { WaterPricePage } from './pages/WaterPricePage';
import { DistributionsPage } from './pages/DistributionsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { CollectorMobileView } from './pages/CollectorMobileView';
import { LiveAuditPage } from './pages/LiveAuditPage';
import { UnpaidBillsPage } from './pages/UnpaidBillsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/collector-app" element={<CollectorMobileView />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/live-audit" element={<LiveAuditPage />} />
              <Route path="/unpaid-bills" element={<UnpaidBillsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailsPage />} />
              <Route path="/collectors" element={<CollectorsPage />} />
              <Route path="/villages" element={<VillagesPage />} />
              <Route path="/water-price" element={<WaterPricePage />} />
              <Route path="/distributions" element={<DistributionsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
