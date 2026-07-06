import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlineDocumentText,
  HiOutlineArrowRight,
  HiOutlineShieldExclamation
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Loader } from '../../components/common';
import api from '../../services/api';
import '../../styles/pages/Dashboard.css';

export default function Dashboard() {
  const { user, isStudent, isAlumni } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentReferrals, setRecentReferrals] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch stats & feeds
      const [statsRes, projectsRes, referralsRes] = await Promise.allSettled([
        api.get('/users/profile'), // basic route to fetch fresh details
        api.get('/projects?limit=3'),
        api.get('/referrals?limit=3')
      ]);

      // Parse datasets or mock if endpoints not active yet
      const pData = projectsRes.status === 'fulfilled' ? projectsRes.value.data.data : [];
      const rData = referralsRes.status === 'fulfilled' ? referralsRes.value.data.data : [];
      
      setRecentProjects(pData.slice(0, 3));
      setRecentReferrals(rData.slice(0, 3));

      // Mock dashboard stats based on role
      if (isStudent) {
        setStats({
          activeTeams: 1,
          pendingTeamApps: 1,
          portfolioEntries: 2,
          appliedReferrals: 1
        });
      } else {
        setStats({
          postedReferrals: 2,
          pendingApplications: 2,
          filledSlots: 3,
          rating: 4.8
        });
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader type="skeleton" className="page-enter" />;

  return (
    <div className="dashboard-container page-enter">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="dashboard-banner-content">
          <h1 className="dashboard-title">Welcome back, {user?.name}!</h1>
          <p className="dashboard-subtitle">
            {isStudent 
              ? 'Find project teammates, build a verified portfolio, and apply for alumni referrals.' 
              : 'Post career referrals, verify applicant credentials, and mentor the next generation.'}
          </p>
        </div>
        
        {isAlumni && user?.verification_status !== 'verified' && (
          <div className="verification-warning-banner">
            <HiOutlineShieldExclamation className="warning-banner-icon" />
            <div className="warning-banner-text">
              <strong>Account Unverified:</strong> You need to submit proof to gain full access to posting referrals.
              <Button size="sm" variant="ghost" onClick={() => navigate('/profile')} style={{ marginLeft: 'var(--space-4)', textDecoration: 'underline' }}>
                Verify Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="stats-grid">
        {isStudent ? (
          <>
            <Card className="stats-card" hoverable onClick={() => navigate('/my-teams')}>
              <div className="stats-card-icon"><HiOutlineUserGroup /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">{stats?.activeTeams}</span>
                <span className="stats-card-label">Active Project Teams</span>
              </div>
            </Card>

            <Card className="stats-card" hoverable onClick={() => navigate('/my-teams')}>
              <div className="stats-card-icon"><HiOutlineDocumentText /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">{stats?.pendingTeamApps}</span>
                <span className="stats-card-label">Pending Collaborations</span>
              </div>
            </Card>

            <Card className="stats-card" hoverable onClick={() => navigate('/portfolio')}>
              <div className="stats-card-icon"><HiOutlineAcademicCap /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">{stats?.portfolioEntries}</span>
                <span className="stats-card-label">Verified Portfolio Entries</span>
              </div>
            </Card>

            <Card className="stats-card" hoverable onClick={() => navigate('/my-applications')}>
              <div className="stats-card-icon"><HiOutlineBriefcase /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">{stats?.appliedReferrals}</span>
                <span className="stats-card-label">Referral Applications</span>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="stats-card" hoverable onClick={() => navigate('/my-referrals')}>
              <div className="stats-card-icon"><HiOutlineBriefcase /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">{stats?.postedReferrals}</span>
                <span className="stats-card-label">Referrals Posted</span>
              </div>
            </Card>

            <Card className="stats-card" hoverable onClick={() => navigate('/my-referrals')}>
              <div className="stats-card-icon"><HiOutlineUserGroup /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">{stats?.pendingApplications}</span>
                <span className="stats-card-label">Pending Applicants</span>
              </div>
            </Card>

            <Card className="stats-card">
              <div className="stats-card-icon"><HiOutlineDocumentText /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">{stats?.filledSlots}</span>
                <span className="stats-card-label">Referral Slots Filled</span>
              </div>
            </Card>

            <Card className="stats-card" hoverable onClick={() => navigate('/profile')}>
              <div className="stats-card-icon"><HiOutlineAcademicCap /></div>
              <div className="stats-card-info">
                <span className="stats-card-num">★ {stats?.rating}</span>
                <span className="stats-card-label">Alumni Rating</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="dashboard-content-split">
        {/* Left Side: Recent Projects */}
        <div className="dashboard-feed-section">
          <div className="section-header-flex">
            <h2 className="section-heading">Forming Projects</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate('/projects')}>
              View Feed <HiOutlineArrowRight />
            </Button>
          </div>
          
          <div className="feed-grid">
            {recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <Card key={project.id} className="feed-card" hoverable onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="feed-card-header">
                    <h3 className="feed-card-title">{project.title}</h3>
                    <Badge variant={project.status}>{project.status}</Badge>
                  </div>
                  <p className="feed-card-desc">{project.description}</p>
                  <div className="feed-card-footer">
                    <span className="footer-meta">Team size: {project.team_size}</span>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="empty-feed-card">
                <p>No forming projects available. Be the first to post!</p>
                <Button size="sm" onClick={() => navigate('/projects')} style={{ marginTop: 'var(--space-2)' }}>
                  Browse Projects
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Right Side: Active Referrals */}
        <div className="dashboard-feed-section">
          <div className="section-header-flex">
            <h2 className="section-heading">Featured Referrals</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate('/referrals')}>
              View Feed <HiOutlineArrowRight />
            </Button>
          </div>

          <div className="feed-grid">
            {recentReferrals.length > 0 ? (
              recentReferrals.map((ref) => (
                <Card key={ref.id} className="feed-card" hoverable onClick={() => navigate('/referrals')}>
                  <div className="feed-card-header">
                    <div className="company-info-row">
                      {ref.company_logo && <img src={ref.company_logo} alt={ref.company} className="company-logo-mini" />}
                      <div>
                        <h3 className="feed-card-title">{ref.job_role}</h3>
                        <span className="company-name-text">{ref.company}</span>
                      </div>
                    </div>
                    <Badge variant={ref.type}>{ref.type}</Badge>
                  </div>
                  <p className="feed-card-desc">{ref.description}</p>
                  <div className="feed-card-footer">
                    <Badge variant={ref.status}>{ref.status}</Badge>
                    <span className="slots-counter-text">Slots: {ref.slots_remaining} left</span>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="empty-feed-card">
                <p>No active job referrals. Check back soon!</p>
                <Button size="sm" onClick={() => navigate('/referrals')} style={{ marginTop: 'var(--space-2)' }}>
                  Browse Jobs
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
