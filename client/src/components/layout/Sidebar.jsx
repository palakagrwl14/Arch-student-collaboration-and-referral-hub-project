import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineRocketLaunch,
  HiOutlineUserGroup,
  HiOutlineRectangleStack,
  HiOutlineBriefcase,
  HiOutlineDocumentText,
  HiOutlineAcademicCap,
  HiOutlinePaperAirplane,
  HiOutlinePlusCircle,
  HiOutlineUser,
  HiOutlineBell,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import '../../styles/components/Sidebar.css';

export default function Sidebar() {
  const { user, isStudent, isAlumni, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <HiOutlineXMark /> : <HiOutlineBars3 />}
      </button>

      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={closeMobile}
      />

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ background: 'transparent', padding: 0, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}>
            <img src="/logo.png" alt="Arch Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Arch</span>
            <span className="sidebar-brand-tag">
              {user?.role === 'alumni' ? 'Alumni' : user?.role === 'admin' ? 'Admin' : 'Student'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Main */}
          <div className="sidebar-section">
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              <HiOutlineHome className="sidebar-link-icon" />
              Dashboard
            </NavLink>
          </div>

          {/* Collaboration Hub */}
          <div className="sidebar-section">
            <div className="sidebar-section-label">Collaboration</div>
            <NavLink to="/projects" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              <HiOutlineRocketLaunch className="sidebar-link-icon" />
              Project Feed
            </NavLink>
            {isStudent && (
              <>
                <NavLink to="/my-teams" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
                  <HiOutlineUserGroup className="sidebar-link-icon" />
                  My Teams
                </NavLink>
                <NavLink to="/workspace" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
                  <HiOutlineRectangleStack className="sidebar-link-icon" />
                  Workspace
                </NavLink>
                <NavLink to="/portfolio" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
                  <HiOutlineDocumentText className="sidebar-link-icon" />
                  Portfolio
                </NavLink>
              </>
            )}
          </div>

          {/* Referral Hub */}
          <div className="sidebar-section">
            <div className="sidebar-section-label">Referrals</div>
            <NavLink to="/referrals" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              <HiOutlineBriefcase className="sidebar-link-icon" />
              Referral Feed
            </NavLink>
            {isStudent && (
              <NavLink to="/my-applications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
                <HiOutlinePaperAirplane className="sidebar-link-icon" />
                My Applications
              </NavLink>
            )}
            {isAlumni && (
              <>
                <NavLink to="/my-referrals" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
                  <HiOutlineAcademicCap className="sidebar-link-icon" />
                  My Referrals
                </NavLink>
                <NavLink to="/post-referral" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
                  <HiOutlinePlusCircle className="sidebar-link-icon" />
                  Post a Referral
                </NavLink>
              </>
            )}
          </div>

          {/* General */}
          <div className="sidebar-section">
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
                <HiOutlineShieldCheck className="sidebar-link-icon" />
                Admin Panel
              </NavLink>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleLogout} style={{ color: 'var(--error)' }}>
            <HiOutlineArrowRightOnRectangle className="sidebar-link-icon" style={{ color: 'var(--error)' }} />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
