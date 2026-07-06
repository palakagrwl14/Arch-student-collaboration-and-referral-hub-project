import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Layout
import PageShell from './components/layout/PageShell';

// Auth Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Core Pages
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/Profile';
import Notifications from './pages/notifications/Notifications';
import Settings from './pages/settings/Settings';
import AdminPanel from './pages/admin/AdminPanel';

// Collaboration Hub Pages
import ProjectFeed from './pages/collaboration/ProjectFeed';
import ProjectDetails from './pages/collaboration/ProjectDetails';
import MyTeams from './pages/collaboration/MyTeams';
import Workspace from './pages/collaboration/Workspace';
import Portfolio from './pages/collaboration/Portfolio';

// Referral Hub Pages
import ReferralFeed from './pages/referral/ReferralFeed';
import ReferralDetails from './pages/referral/ReferralDetails';
import MyApplications from './pages/referral/MyApplications';
import PostReferral from './pages/referral/PostReferral';
import MyReferrals from './pages/referral/MyReferrals';

import './styles/global.css';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#1f2937',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1f2937',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Layout Shell */}
          <Route element={<PageShell />}>
            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Collaboration Hub */}
            <Route path="/projects" element={<ProjectFeed />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/my-teams" element={<MyTeams />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/portfolio" element={<Portfolio />} />

            {/* Referral Hub */}
            <Route path="/referrals" element={<ReferralFeed />} />
            <Route path="/referrals/:id" element={<ReferralDetails />} />
            <Route path="/my-applications" element={<MyApplications />} />
            <Route path="/my-referrals" element={<MyReferrals />} />
            <Route path="/post-referral" element={<PostReferral />} />

            {/* Profile & General */}
            <Route path="/profile/:id?" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
