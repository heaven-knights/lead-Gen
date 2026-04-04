
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import CampaignList from './pages/CampaignList';
import CampaignCreate from './pages/CampaignCreate';
import CampaignOverview from './pages/CampaignOverview';
import BatchDetail from './pages/BatchDetail';
import ReplyPage from './pages/ReplyPage';
import LeadsPage from './pages/LeadsPage';
import EmailTemplates from './pages/EmailTemplates';
import CampaignLeads from './pages/CampaignLeads';

// Protected Route Component
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Layout />;
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<CampaignList />} />
            <Route path="/campaigns/new" element={<CampaignCreate />} />
            <Route path="/campaigns/:id" element={<CampaignOverview />} />
            <Route path="/campaigns/:id/batches/:batchId" element={<BatchDetail />} />
            <Route path="/replies" element={<ReplyPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/:campaignId" element={<CampaignLeads />} />
            <Route path="/templates" element={<EmailTemplates />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
