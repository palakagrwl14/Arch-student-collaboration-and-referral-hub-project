import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Loader } from '../common';
import '../../styles/components/PageShell.css';

export default function PageShell() {
  const { isAuthenticated, loading, user } = useAuth();

  // Bootstrapping and applying user theme configuration globally on shell load
  useEffect(() => {
    if (user) {
      const settings = user.settings || {};
      const appPrefs = settings.app_preferences || {};
      const themeName = appPrefs.theme || 'light'; // Default to light/sage theme

      const root = document.documentElement;
      root.classList.remove('light-theme', 'dark-theme');
      
      if (themeName === 'light') {
        root.classList.add('light-theme');
      } else if (themeName === 'dark') {
        root.classList.add('dark-theme');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        if (systemPrefersDark.matches) {
          root.classList.add('dark-theme');
        } else {
          root.classList.add('light-theme');
        }
      }
    }
  }, [user]);

  if (loading) {
    return <Loader type="page" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="page-shell">
      <Sidebar />
      <Navbar />
      <main className="page-shell-content">
        <Outlet />
      </main>
    </div>
  );
}
