import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineBriefcase,
  HiOutlineShieldExclamation,
  HiOutlineDocumentCheck,
  HiOutlineFlag,
  HiOutlineStar
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Input, Loader, EmptyState, Modal, SkillTag } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';
import '../../styles/pages/Referrals.css';

export default function ReferralDetails() {
  const { id } = useParams();
  const { user, isStudent } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  
  // Apply Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [introText, setIntroText] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);

  // Flag/Report Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchReferralDetails();
  }, [id]);

  const fetchReferralDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/referrals/${id}`);
      setReferral(res.data.data);

      if (isStudent && user) {
        const appsRes = await api.get('/referral-applications/my-apps');
        const applied = appsRes.data.data.some(app => app.referral_id === id && app.status !== 'withdrawn');
        setHasApplied(applied);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching referral details');
      navigate('/referrals');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!introText) {
      toast.error('Introduction pitch is required');
      return;
    }

    setApplyLoading(true);
    const formData = new FormData();
    formData.append('referral_id', id);
    formData.append('intro_text', introText);
    if (githubUrl) formData.append('github_url', githubUrl);
    if (linkedinUrl) formData.append('linkedin_url', linkedinUrl);
    if (portfolioUrl) formData.append('portfolio_url', portfolioUrl);
    if (resumeFile) formData.append('resume', resumeFile);

    try {
      await api.post('/referral-applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Referral request submitted successfully!');
      setApplyModalOpen(false);
      setHasApplied(true);
      fetchReferralDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason) return;

    setReportLoading(true);
    try {
      await api.post('/reports', { referral_id: id, reason: reportReason });
      toast.success('Posting reported. Administrative team will review this shortly.');
      setReportModalOpen(false);
    } catch (err) {
      toast.error('Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return <Loader type="skeleton" className="page-enter" />;
  if (!referral) return <EmptyState title="Referral not found" description="The job posting could not be found." />;

  const branches = referral.eligibility_branches || [];
  const batchYears = referral.eligibility_batch_years || [];

  return (
    <div className="projects-container page-enter">
      {/* Header details */}
      <Card padding="lg" className="details-header-card">
        <div className="details-title-row">
          <div className="company-info-row">
            {referral.company_logo ? (
              <img src={referral.company_logo} alt={referral.company} style={{ width: 48, height: 48, objectFit: 'contain' }} />
            ) : (
              <Avatar name={referral.company} size="lg" />
            )}
            <div>
              <h1>{referral.job_role}</h1>
              <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>{referral.company}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant={referral.type}>{referral.type}</Badge>
            <Badge variant={referral.status}>{referral.status}</Badge>
          </div>
        </div>

        <div className="project-meta-pills" style={{ marginTop: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Location: {referral.location}</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>• Mode: {referral.work_mode}</span>
          {referral.salary && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>• Salary: {referral.salary}</span>}
        </div>
      </Card>

      {/* Main split */}
      <div className="referral-details-grid">
        {/* Main Details */}
        <div className="details-main">
          <Card className="details-desc-card">
            <h2>Job Description</h2>
            <p className="details-desc-text">{referral.description || 'No description provided.'}</p>

            {referral.responsibilities && (
              <>
                <h2 style={{ marginTop: 'var(--space-4)' }}>Key Responsibilities</h2>
                <p className="details-desc-text">{referral.responsibilities}</p>
              </>
            )}

            <h2 style={{ marginTop: 'var(--space-4)' }}>Required Skills</h2>
            <div className="project-skills-list">
              {referral.skills_required.map((skill, idx) => (
                <SkillTag key={idx} skill={skill} />
              ))}
            </div>
          </Card>

          {/* Eligibility Specs */}
          <Card className="details-desc-card">
            <h2>Eligibility Benchmarks</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              {referral.eligibility_cgpa && (
                <div className="roster-item" style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)' }}>
                  <span>CGPA Cutoff Required</span>
                  <strong>{referral.eligibility_cgpa} or above</strong>
                </div>
              )}
              {branches.length > 0 && (
                <div className="roster-item" style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)' }}>
                  <span>Allowed Branches</span>
                  <strong>{branches.join(', ')}</strong>
                </div>
              )}
              {batchYears.length > 0 && (
                <div className="roster-item" style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)' }}>
                  <span>Target Graduation Year</span>
                  <strong>{batchYears.join(', ')}</strong>
                </div>
              )}
              {referral.eligibility_text && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <p className="details-desc-text"><strong>Additional eligibility details:</strong> {referral.eligibility_text}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar widgets */}
        <div className="details-sidebar">
          {/* Alumni profile card */}
          <Card className="details-alumni-card" padding="lg">
            <h2>Alumni Reference</h2>
            <div className="creator-meta" style={{ marginTop: 'var(--space-2)' }}>
              <Avatar name={referral.alumni_name} src={referral.alumni_avatar} size="md" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="creator-name" style={{ fontSize: 'var(--text-sm)' }}>
                  {referral.alumni_name} {referral.alumni_verified === 'verified' && '✓'}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{referral.alumni_designation} at {referral.alumni_company}</span>
              </div>
            </div>

            <div className="alumni-card-stats">
              <div className="alumni-stat-box">
                <span className="alumni-stat-val">★ {referral.alumni_stats.student_rating}</span>
                <span className="alumni-stat-lbl">Rating</span>
              </div>
              <div className="alumni-stat-box">
                <span className="alumni-stat-val">{referral.alumni_stats.referrals_posted}</span>
                <span className="alumni-stat-lbl">Posted</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-4) 0 0', marginTop: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Slots Left: </span>
              <strong style={{ color: 'var(--warning)', fontSize: 'var(--text-sm)' }}>
                {referral.slots_remaining} of {referral.slots_total}
              </strong>
            </div>

            {/* Application CTAs */}
            {isStudent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                {hasApplied ? (
                  <Button variant="secondary" fullWidth disabled>
                    Already Applied
                  </Button>
                ) : referral.slots_remaining > 0 && referral.status === 'active' ? (
                  <Button variant="primary" fullWidth icon={<HiOutlineDocumentCheck />} onClick={() => setApplyModalOpen(true)}>
                    Apply for Referral
                  </Button>
                ) : (
                  <Button variant="secondary" fullWidth disabled>
                    Referrals Closed / Full
                  </Button>
                )}
                
                <Button variant="ghost" fullWidth icon={<HiOutlineFlag />} onClick={() => setReportModalOpen(true)} style={{ color: 'var(--text-muted)' }}>
                  Report Posting
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title={`Request Referral - ${referral.company}`}
        size="md"
      >
        <form onSubmit={handleApplySubmit} className="project-form">
          <Input
            label="Upload Resume (PDF/Word, Max 5MB)"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files[0])}
            required
          />

          <Input
            label="GitHub Profile URL"
            placeholder="https://github.com/username"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />

          <Input
            label="LinkedIn Profile URL"
            placeholder="https://linkedin.com/in/username"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />

          <Input
            label="Portfolio Link"
            placeholder="https://username.me"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
          />

          <Input
            label="Short Introduction Pitch (Max 200 characters)"
            type="textarea"
            placeholder="Explain why you are qualified for this position. Keep it concise, highlighting core project accomplishments..."
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            maxLength={200}
            required
          />

          <Button type="submit" fullWidth loading={applyLoading}>
            Submit Referral Request
          </Button>
        </form>
      </Modal>

      {/* Flag/Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Flag suspicious posting"
        size="sm"
      >
        <form onSubmit={handleReportSubmit} className="project-form">
          <Input
            label="Reason for Flagging"
            type="select"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            options={[
              { value: 'spam', label: 'Spam or Duplicate Post' },
              { value: 'fraud', label: 'Fraudulent/Suspicious details' },
              { value: 'inaccurate', label: 'Inaccurate/Outdated job details' },
              { value: 'abusive', label: 'Abusive behaviour or harassment' }
            ]}
            placeholder="Select a reason..."
            required
          />
          <Button type="submit" variant="danger" fullWidth loading={reportLoading}>
            File Report
          </Button>
        </form>
      </Modal>
    </div>
  );
}
