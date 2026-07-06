import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineBriefcase, HiOutlineMinusCircle, HiOutlineStar } from 'react-icons/hi2';
import { Card, Button, Badge, Input, Loader, EmptyState, Modal, StatusTimeline } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';

const STATUS_STEPS = [
  { label: 'Applied', key: 'applied' },
  { label: 'Under Review', key: 'under_review' },
  { label: 'Shortlisted', key: 'shortlisted' },
  { label: 'Referral Submitted', key: 'referral_submitted' },
  { label: 'Interview Scheduled', key: 'interview_scheduled' },
  { label: 'Selected / Rejected', key: 'selected' } // handles terminal states
];

export default function MyApplications() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  
  // Rating Modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/referral-applications/my-apps');
      setApps(res.data.data);
      if (res.data.data.length > 0 && !selectedApp) {
        setSelectedApp(res.data.data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching referral applications');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (referralId) => {
    if (!window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) return;

    try {
      await api.post('/referral-applications/withdraw', { referral_id: referralId });
      toast.success('Application withdrawn successfully');
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error withdrawing application');
    }
  };

  const handleRateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setRatingLoading(true);
    try {
      await api.post('/ratings', {
        referral_id: selectedApp.referral_id,
        score: Number(ratingScore),
        review: ratingReview
      });
      toast.success('Thank you for rating the alumni mentor!');
      setRatingModalOpen(false);
      setRatingReview('');
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  const getTimelineSteps = (app) => {
    if (!app) return [];
    
    const currentStatus = app.status;
    const isTerminal = ['selected', 'rejected'].includes(currentStatus);
    
    // Find index of current status in steps
    let currentIdx = STATUS_STEPS.findIndex(s => s.key === currentStatus);
    if (currentStatus === 'rejected') {
      currentIdx = STATUS_STEPS.length - 1; // terminal step
    }

    return STATUS_STEPS.map((step, idx) => {
      let statusState = 'upcoming';
      let label = step.label;

      if (idx < currentIdx) {
        statusState = 'completed';
      } else if (idx === currentIdx) {
        statusState = 'active';
        if (currentStatus === 'selected') {
          label = 'Selected! 🎉';
        } else if (currentStatus === 'rejected') {
          label = 'Rejected 😔';
        }
      }

      return {
        label,
        status: statusState,
        date: idx === currentIdx ? new Date(app.updated_at).toLocaleDateString() : null
      };
    });
  };

  if (loading && apps.length === 0) return <Loader type="page" />;

  return (
    <div className="projects-container page-enter">
      <div>
        <h1 className="dashboard-title">My Referral Applications</h1>
        <p className="dashboard-subtitle">Track the status of your referral requests and schedule reviews</p>
      </div>

      {apps.length > 0 ? (
        <div className="referral-details-grid" style={{ marginTop: 'var(--space-2)' }}>
          {/* Left Panel: Applications Feed */}
          <div className="details-main" style={{ gap: 'var(--space-4)' }}>
            {apps.map((app) => (
              <Card
                key={app.id}
                className="referral-card"
                hoverable
                onClick={() => setSelectedApp(app)}
                style={{
                  border: selectedApp?.id === app.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                  background: selectedApp?.id === app.id ? 'rgba(124, 58, 237, 0.02)' : 'var(--bg-secondary)'
                }}
              >
                <div className="referral-card-header">
                  <div className="company-info-row">
                    {app.company_logo ? (
                      <img src={app.company_logo} alt={app.company} className="company-logo-mini" />
                    ) : (
                      <Avatar name={app.company} size="sm" />
                    )}
                    <div>
                      <h3 className="feed-card-title">{app.job_role}</h3>
                      <span className="company-name-text">{app.company}</span>
                    </div>
                  </div>
                  <Badge variant={app.status}>{app.status}</Badge>
                </div>

                <div className="project-card-footer" style={{ border: 'none', padding: 0 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Applied: {new Date(app.applied_at).toLocaleDateString()}
                  </span>
                  
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Referenced by: <strong>{app.alumni_name}</strong>
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Right Panel: Status Timeline details */}
          <div className="details-sidebar">
            {selectedApp ? (
              <Card padding="lg" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--text-base)' }}>Application Progress</h2>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {selectedApp.company} - {selectedApp.job_role}
                  </span>
                </div>

                <StatusTimeline steps={getTimelineSteps(selectedApp)} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                  {/* Rating alumni */}
                  {['selected', 'rejected', 'withdrawn', 'closed'].includes(selectedApp.status) && (
                    <Button icon={<HiOutlineStar />} onClick={() => setRatingModalOpen(true)}>
                      Rate Alumni Mentor
                    </Button>
                  )}

                  {/* Withdraw action */}
                  {!['referral_submitted', 'interview_scheduled', 'selected', 'rejected', 'withdrawn'].includes(selectedApp.status) && (
                    <Button variant="ghost" icon={<HiOutlineMinusCircle />} onClick={() => handleWithdraw(selectedApp.referral_id)} style={{ color: 'var(--error)' }}>
                      Withdraw Application
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <Card style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <p style={{ color: 'var(--text-muted)' }}>Select an application to view status timeline.</p>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<HiOutlineBriefcase />}
          title="No referrals applied"
          description="You haven't submitted any referral requests yet. View active job cards in the feed."
          action={<Button onClick={() => navigate('/referrals')}>Browse Referral Feed</Button>}
        />
      )}

      {/* Rating Alumni Modal */}
      {selectedApp && (
        <Modal
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          title={`Rate ${selectedApp.alumni_name}`}
          size="sm"
        >
          <form onSubmit={handleRateSubmit} className="project-form">
            <Input
              label="Rating (1 to 5 Stars)"
              type="select"
              value={ratingScore}
              onChange={(e) => setRatingScore(e.target.value)}
              options={[
                { value: '5', label: '★★★★★ (Excellent)' },
                { value: '4', label: '★★★★☆ (Good)' },
                { value: '3', label: '★★★☆☆ (Average)' },
                { value: '2', label: '★★☆☆☆ (Below average)' },
                { value: '1', label: '★☆☆☆☆ (Poor)' }
              ]}
              required
            />

            <Input
              label="Review / Feedback"
              type="textarea"
              placeholder="Describe your interaction with this alumni. Did they submit your referral in time? Share guidance tips..."
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              required
            />

            <Button type="submit" fullWidth loading={ratingLoading}>
              Submit Rating
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
