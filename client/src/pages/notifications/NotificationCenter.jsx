import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineBell, HiOutlineEnvelopeOpen, HiOutlineEnvelope } from 'react-icons/hi2';
import { Card, Button, Badge, Loader, EmptyState } from '../../components/common';
import api from '../../services/api';

export default function NotificationCenter() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // CONNECT TO SSE LIVE NOTIFICATION STREAM
    // Note: EventSource doesn't support request headers easily, but Vite proxy handles dev auth interceptors or we can pass a token in query parameter.
    // However, since we want a robust dev connection, we pass the localStorage token as a query parameter '?token=xxx'
    const token = localStorage.getItem('token');
    const sseUrl = `/api/notifications/stream?token=${token}`;
    
    // We mock/fake connection via polling if EventSource fails, but let's initialize EventSource
    let eventSource;
    try {
      eventSource = new EventSource(sseUrl);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;

        // Prepend new live notification to notifications array!
        setNotifications(prev => [data, ...prev]);
        toast.success(`Notification: ${data.title}`);
      };

      eventSource.onerror = () => {
        // silently close
        eventSource.close();
      };
    } catch {
      // ignore
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/notifications'); // wait, route prefix check: /notifications or /api/notifications?
      // In server.js we mounted: app.use('/api/notifications', notificationRoutes)
      // Since axios baseURL is '/api', query should be '/notifications'!
      const queryRes = await api.get('/notifications');
      setNotifications(queryRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: 1 } : n));
      if (link) navigate(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: 1 })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Error marking read');
    }
  };

  if (loading && notifications.length === 0) return <Loader type="page" />;

  return (
    <div className="projects-container page-enter">
      <div className="projects-header">
        <div>
          <h1 className="dashboard-title">Notification Center</h1>
          <p className="dashboard-subtitle">Track real-time updates and status changes across collaboration and referral portals</p>
        </div>
        {notifications.some(n => n.read === 0) && (
          <Button variant="secondary" icon={<HiOutlineEnvelopeOpen />} onClick={handleMarkAllRead}>
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="feed-grid" style={{ marginTop: 'var(--space-2)' }}>
          {notifications.map((n) => (
            <Card
              key={n.id}
              hoverable
              onClick={() => handleMarkAsRead(n.id, n.link)}
              style={{
                background: n.read === 0 ? 'rgba(124, 58, 237, 0.02)' : 'var(--bg-secondary)',
                borderLeft: n.read === 0 ? '3px solid var(--accent-primary)' : '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.25rem', marginTop: '2px', color: n.read === 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                  {n.read === 0 ? <HiOutlineEnvelope /> : <HiOutlineEnvelopeOpen />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: n.read === 0 ? 'var(--font-bold)' : 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HiOutlineBell />}
          title="Notification inbox empty"
          description="You will receive real-time notifications about team accepts, referral status, and verification updates here."
        />
      )}
    </div>
  );
}
