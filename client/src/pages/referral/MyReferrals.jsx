import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineBriefcase, HiOutlineUserGroup, HiOutlineEnvelope, HiOutlineClipboardDocumentCheck } from 'react-icons/hi2';
import { Card, Button, Badge, Loader, EmptyState, Modal, Input } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api, { getAbsoluteUrl } from '../../services/api';
import '../../styles/pages/Referrals.css';

export default function MyReferrals() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchMyPosts();
  }, []);

  useEffect(() => {
    if (selectedPost) {
      fetchCandidates(selectedPost.id);
    }
  }, [selectedPost]);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/referrals/my-posts');
      setPosts(res.data.data);
      if (res.data.data.length > 0 && !selectedPost) {
        setSelectedPost(res.data.data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load posted referrals');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (refId) => {
    try {
      setCandidatesLoading(true);
      const res = await api.get(`/referral-applications/referral/${refId}`);
      setCandidates(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await api.put(`/referral-applications/${appId}`, { status: newStatus });
      toast.success(`Applicant marked as ${newStatus.replace('_', ' ')}`);
      // Refresh list to update remaining slots or statuses
      fetchMyPosts();
      if (selectedPost) fetchCandidates(selectedPost.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating application status');
    }
  };

  const handleCloseReferral = async (refId) => {
    if (!window.confirm('Are you sure you want to close this referral? Students will no longer be able to apply.')) return;

    try {
      await api.put(`/referrals/${refId}`, { status: 'closed' });
      toast.success('Referral closed successfully');
      fetchMyPosts();
    } catch (err) {
      toast.error('Failed to close referral');
    }
  };

  if (loading && posts.length === 0) return <Loader type="page" />;

  return (
    <div className="projects-container page-enter">
      <div className="projects-header">
        <div>
          <h1 className="dashboard-title">Alumni Referral Dashboard</h1>
          <p className="dashboard-subtitle">Manage posted referral vacancies, audit applicant resumes, and submit updates</p>
        </div>
        <Button onClick={() => navigate('/post-referral')}>Post New Referral</Button>
      </div>

      {posts.length > 0 ? (
        <div className="referral-details-grid" style={{ marginTop: 'var(--space-2)' }}>
          {/* Left panel: Posted Listings */}
          <div className="details-main" style={{ gap: 'var(--space-4)' }}>
            {posts.map((post) => (
              <Card
                key={post.id}
                className="referral-card"
                hoverable
                onClick={() => setSelectedPost(post)}
                style={{
                  border: selectedPost?.id === post.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                  background: selectedPost?.id === post.id ? 'rgba(124, 58, 237, 0.02)' : 'var(--bg-secondary)'
                }}
              >
                <div className="referral-card-header">
                  <h3 className="feed-card-title">{post.job_role}</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Badge variant={post.status}>{post.status}</Badge>
                    <Badge variant={post.type} size="sm">{post.type}</Badge>
                  </div>
                </div>

                <div className="referral-slots-banner" style={{ background: 'var(--bg-primary)' }}>
                  <span>Referral Slots:</span>
                  <strong>{post.slots_remaining} of {post.slots_total} remaining</strong>
                </div>

                <div className="project-card-footer" style={{ border: 'none', padding: 0 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Applicants: <strong>{post.applicant_count || 0}</strong>
                  </span>
                  
                  {post.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCloseReferral(post.id); }} style={{ color: 'var(--error)' }}>
                      Close Referral
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Right panel: Candidates Table list */}
          <div className="details-sidebar" style={{ flex: 1, minWidth: 0 }}>
            {selectedPost ? (
              <Card padding="lg" style={{ background: 'var(--bg-secondary)', width: '100%' }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h2 style={{ fontSize: 'var(--text-base)' }}>Applicants for {selectedPost.job_role}</h2>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {selectedPost.company} • {selectedPost.location}
                  </span>
                </div>

                {candidatesLoading ? (
                  <Loader type="spinner" />
                ) : candidates.length > 0 ? (
                  <div className="applicants-list" style={{ gap: 'var(--space-4)' }}>
                    {candidates.map((cand) => (
                      <div key={cand.id} className="applicant-item" style={{ background: 'var(--bg-tertiary)' }}>
                        <div className="applicant-header">
                          <div className="roster-member-info">
                            <Avatar name={cand.name} src={cand.avatar_url} size="sm" />
                            <div className="roster-member-details">
                              <span className="roster-member-name">{cand.name}</span>
                              <span className="roster-member-college">{cand.college}</span>
                            </div>
                          </div>
                          <Badge variant={cand.status}>{cand.status}</Badge>
                        </div>

                        <div className="applicant-bio" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <strong>Skills:</strong> {cand.skills.join(', ') || 'No skills listed'}
                        </div>

                        <div className="applicant-pitch" style={{ background: 'var(--bg-secondary)' }}>
                          <strong>Intro pitch:</strong> "{cand.intro_text}"
                        </div>

                        <div className="applicant-bio" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {cand.resume_path && (
                            <a href={getAbsoluteUrl(cand.resume_path)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--accent-primary)' }}>
                              Resume.pdf
                            </a>
                          )}
                          {cand.linkedin_url && <a href={cand.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
                          {cand.github_url && <a href={cand.github_url} target="_blank" rel="noopener noreferrer">GitHub</a>}
                          {cand.portfolio_url && <a href={cand.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio</a>}
                        </div>

                        {/* Status dropdown controller */}
                        {cand.status !== 'withdrawn' && (
                          <div className="action-row-buttons" style={{ marginTop: 'var(--space-2)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
                            <Input
                              type="select"
                              placeholder="Update Candidate Status"
                              value={cand.status}
                              onChange={(e) => handleStatusChange(cand.id, e.target.value)}
                              options={[
                                { value: 'under_review', label: 'Under Review' },
                                { value: 'shortlisted', label: 'Shortlist Candidate' },
                                { value: 'referral_submitted', label: '✓ Submit Referral (Use Slot)' },
                                { value: 'interview_scheduled', label: 'Interview Scheduled' },
                                { value: 'selected', label: 'Selected' },
                                { value: 'rejected', label: 'Reject' }
                              ]}
                              style={{ flex: 1, margin: 0 }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-8)' }}>
                    No candidates have applied for this referral post yet.
                  </p>
                )}
              </Card>
            ) : (
              <Card style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <p style={{ color: 'var(--text-muted)' }}>Select a posting to inspect candidates.</p>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<HiOutlineBriefcase />}
          title="No referrals posted yet"
          description="You haven't posted any career referral openings. Submitting referral posts helps students find jobs."
          action={<Button onClick={() => navigate('/post-referral')}>Post a Referral</Button>}
        />
      )}
    </div>
  );
}
