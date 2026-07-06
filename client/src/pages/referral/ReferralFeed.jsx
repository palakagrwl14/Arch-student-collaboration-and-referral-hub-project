import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineMagnifyingGlass, HiOutlineBriefcase, HiOutlinePlus, HiOutlineSparkles } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Input, Loader, EmptyState, SkillTag } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';
import '../../styles/pages/Referrals.css';

export default function ReferralFeed() {
  const { user, isStudent, isAlumni, isVerified } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());

  // Filters State
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    fetchReferralsAndApplications();
  }, [search, company, workMode, type]);

  const fetchReferralsAndApplications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (company) params.company = company;
      if (workMode) params.work_mode = workMode;
      if (type) params.type = type;

      const res = await api.get('/referrals', { params });
      setReferrals(res.data.data);

      // If user is a student, fetch their applications to check "Already Applied" state
      if (isStudent && user) {
        const appsRes = await api.get('/referral-applications/my-apps');
        const ids = new Set(appsRes.data.data.map(app => app.referral_id));
        setAppliedIds(ids);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading referrals feed');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatch = (requiredSkills) => {
    if (!user || !user.skills || user.skills.length === 0 || !requiredSkills || requiredSkills.length === 0) {
      return 0;
    }
    const mySkills = user.skills.map(s => s.toLowerCase());
    const matches = requiredSkills.filter(s => mySkills.includes(s.toLowerCase()));
    return Math.round((matches.length / requiredSkills.length) * 100);
  };

  return (
    <div className="referrals-container page-enter">
      {/* Header */}
      <div className="projects-header">
        <div>
          <h1 className="dashboard-title">Referral Hub</h1>
          <p className="dashboard-subtitle">Apply for job and internship referrals through verified employee contacts</p>
        </div>
        {isAlumni && isVerified && (
          <Button icon={<HiOutlinePlus />} onClick={() => navigate('/post-referral')}>
            Post a Referral
          </Button>
        )}
      </div>

      {/* Filter Options */}
      <div className="projects-search-filters">
        <div className="search-input-wrapper">
          <HiOutlineMagnifyingGlass className="search-icon-projects" />
          <Input
            placeholder="Search roles, skills, or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="projects-filter-select">
          <Input
            type="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'internship', label: 'Internship' },
              { value: 'fulltime', label: 'Full-Time' }
            ]}
            placeholder="All Job Types"
          />
        </div>
        <div className="projects-filter-select">
          <Input
            type="select"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            options={[
              { value: 'onsite', label: 'On-site' },
              { value: 'remote', label: 'Remote' },
              { value: 'hybrid', label: 'Hybrid' }
            ]}
            placeholder="All Work Modes"
          />
        </div>
      </div>

      {/* Referral Feed list */}
      {loading ? (
        <Loader type="skeleton" />
      ) : referrals.length > 0 ? (
        <div className="projects-grid">
          {referrals.map((ref) => {
            const hasApplied = appliedIds.has(ref.id);
            const matchPercent = calculateMatch(ref.skills_required);

            return (
              <Card
                key={ref.id}
                className="referral-card"
                hoverable
                onClick={() => navigate(`/referrals/${ref.id}`)}
              >
                <div className="referral-card-header">
                  <div className="company-info-row">
                    {ref.company_logo ? (
                      <img src={ref.company_logo} alt={ref.company} className="company-logo-mini" />
                    ) : (
                      <Avatar name={ref.company} size="sm" />
                    )}
                    <div>
                      <h2 className="feed-card-title">{ref.job_role}</h2>
                      <span className="company-name-text">{ref.company}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Badge variant={ref.type} size="sm">{ref.type}</Badge>
                    {matchPercent > 0 && (
                      <span className="project-match-badge" style={{ padding: '1px 6px', fontSize: '9px' }}>
                        <HiOutlineSparkles style={{ marginRight: 1 }} />
                        {matchPercent}% Match
                      </span>
                    )}
                  </div>
                </div>

                <div className="referral-slots-banner">
                  <span>Referral Slots Remaining:</span>
                  <span className="referral-slots-num">{ref.slots_remaining} of {ref.slots_total} left</span>
                </div>

                <div className="project-skills-list">
                  {ref.skills_required.map((skill, idx) => (
                    <SkillTag key={idx} skill={skill} />
                  ))}
                </div>

                {/* Structured Eligibility cuts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <div className="referral-eligibility-row">
                    <span className="referral-eligibility-label">CGPA Cutoff</span>
                    <span className="referral-eligibility-value">
                      {ref.eligibility_cgpa ? `${ref.eligibility_cgpa} or above` : 'Any CGPA'}
                    </span>
                  </div>
                  <div className="referral-eligibility-row">
                    <span className="referral-eligibility-label">Salary Details</span>
                    <span className="referral-eligibility-value">
                      {ref.salary || 'Competitive'}
                    </span>
                  </div>
                </div>

                <div className="project-card-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                  <div className="creator-meta">
                    <Avatar name={ref.alumni_name} src={ref.alumni_avatar} size="sm" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="creator-name" style={{ fontSize: '11px' }}>{ref.alumni_name}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{ref.alumni_designation}</span>
                    </div>
                  </div>
                  {hasApplied ? (
                    <Badge variant="closed">Applied</Badge>
                  ) : (
                    <Button size="sm">View Details</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<HiOutlineBriefcase />}
          title="No referrals posted"
          description="There are currently no active job referrals matching your search queries."
          action={isAlumni && isVerified && <Button onClick={() => navigate('/post-referral')}>Post a Referral</Button>}
        />
      )}
    </div>
  );
}
