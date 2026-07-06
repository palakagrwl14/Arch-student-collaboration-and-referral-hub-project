import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineRectangleStack,
  HiOutlineShieldCheck,
  HiOutlineAcademicCap,
  HiOutlineEnvelope,
  HiOutlineCheckCircle,
  HiOutlineCog6Tooth,
  HiOutlineUser
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import '../../styles/components/Navbar.css';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  
  const dropdownRef = useRef(null);

  // Fetch count and lists on load & periodically
  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchUnreadCount();
      if (showDropdown) {
        fetchNotifications();
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [showDropdown]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data?.count || 0);
    } catch {
      // silently fail
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch {
      // silently fail
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      // silently fail
    }
  };

  const handleNotificationClick = async (note) => {
    // 1. Mark as read on backend if unread
    if (!note.read) {
      try {
        await api.put(`/notifications/${note.id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === note.id ? { ...n, read: true } : n));
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
    }
    
    // 2. Close dropdown
    setShowDropdown(false);
    
    // 3. Navigate to links based on type
    if (note.link) {
      navigate(note.link);
    } else {
      // Fallbacks
      if (note.type === 'application_update') navigate('/my-applications');
      else if (note.type === 'team_update') navigate('/my-teams');
      else if (note.type === 'referral_match') navigate('/referrals');
      else if (note.type === 'deadline_alert') navigate('/referrals');
      else if (note.type === 'workspace_activity') navigate('/workspace');
      else if (note.type === 'verification_status') navigate('/settings');
      else if (note.type === 'portfolio_update') navigate('/portfolio');
      else if (note.type === 'applicant_alert') navigate('/my-referrals');
    }
  };

  const formatRelativeTime = (timestamp) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getNotificationIconDetails = (type) => {
    switch (type) {
      case 'application_update':
        return { icon: <HiOutlineDocumentText />, color: 'var(--info)' };
      case 'team_update':
        return { icon: <HiOutlineUserGroup />, color: 'var(--success)' };
      case 'referral_match':
        return { icon: <HiOutlineBriefcase />, color: 'var(--warning)' };
      case 'deadline_alert':
        return { icon: <HiOutlineBell />, color: 'var(--error)' };
      case 'workspace_activity':
        return { icon: <HiOutlineRectangleStack />, color: 'var(--accent-primary)' };
      case 'verification_status':
        return { icon: <HiOutlineShieldCheck />, color: 'var(--success)' };
      case 'portfolio_update':
        return { icon: <HiOutlineAcademicCap />, color: 'var(--info)' };
      case 'applicant_alert':
        return { icon: <HiOutlineEnvelope />, color: 'var(--warning)' };
      default:
        return { icon: <HiOutlineBell />, color: 'var(--text-secondary)' };
    }
  };

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <header className="navbar">
      <div className="navbar-left">
        <form onSubmit={handleSearch} className="navbar-search">
          <HiOutlineMagnifyingGlass className="navbar-search-icon" />
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search projects, referrals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="navbar-right">
        {/* Toggle container anchored dropdown */}
        <div className="navbar-notifications-container" ref={dropdownRef}>
          <button
            className="navbar-icon-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Notifications"
          >
            <HiOutlineBell />
            {unreadCount > 0 && (
              <span className="navbar-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Floating Dropdown List Panel */}
          {showDropdown && (
            <div className="navbar-notifications-dropdown">
              <div className="navbar-notifications-header">
                <span className="navbar-notifications-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="navbar-notifications-mark-read" onClick={handleMarkAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Tabs list */}
              <div className="navbar-notifications-tabs">
                <button
                  className={`navbar-notifications-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  className={`navbar-notifications-tab ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Scrollable list content */}
              <div className="navbar-notifications-list">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((note) => {
                    const iconDetails = getNotificationIconDetails(note.type);
                    return (
                      <button
                        key={note.id}
                        className={`navbar-notification-item ${!note.read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(note)}
                      >
                        <div
                          className="navbar-notification-icon-wrapper"
                          style={{ color: iconDetails.color }}
                        >
                          {iconDetails.icon}
                        </div>
                        <div className="navbar-notification-content">
                          <div className="navbar-notification-title-row">
                            <span className="navbar-notification-title">{note.title}</span>
                            {!note.read && <span className="navbar-notification-dot" />}
                          </div>
                          <p className="navbar-notification-desc">{note.message}</p>
                          <div className="navbar-notification-time">
                            {formatRelativeTime(note.created_at)}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="navbar-notifications-empty">
                    <HiOutlineCheckCircle className="navbar-notifications-empty-icon" />
                    <span className="navbar-notifications-empty-title">You're all caught up!</span>
                    <span className="navbar-notifications-empty-desc">
                      {filter === 'unread' ? "You don't have any unread notifications." : "You don't have any notifications yet."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings button */}
        <button
          className="navbar-icon-btn"
          onClick={() => navigate('/settings')}
          aria-label="Settings"
        >
          <HiOutlineCog6Tooth />
        </button>

        {/* Profile button */}
        <button
          className="navbar-icon-btn"
          onClick={() => navigate('/profile')}
          aria-label="Profile"
          style={{ overflow: 'hidden', padding: 0 }}
        >
          {user?.avatar_url ? (
            <img 
              src={`${api.defaults.baseURL.replace('/api', '')}${user.avatar_url}`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} 
            />
          ) : (
            <HiOutlineUser />
          )}
        </button>
      </div>
    </header>
  );
}
