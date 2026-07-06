import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineUserGroup,
  HiOutlineClipboardDocumentList,
  HiOutlineFolderMinus,
  HiOutlineChevronRight,
  HiOutlineUserPlus
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Input, Loader, EmptyState, Modal, SkillTag } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';
import '../../styles/pages/ProjectDetails.css';

export default function ProjectDetails() {
  const { id } = useParams();
  const { user, isStudent } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Apply Form State
  const [selectedRole, setSelectedRole] = useState('');
  const [pitch, setPitch] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${id}`);
      const pData = res.data.data;
      setProject(pData);

      // Check if user has already applied
      if (user && pData.created_by !== user.id) {
        // If student, check if they are in members or have pending app
        const memberCheck = pData.members.some(m => m.id === user.id);
        if (!memberCheck) {
          // fetch current applications to check status
          try {
            // Check if there is an application
            // If the endpoint is protected by creator-only, we can check a simple mock or handle error
            // Actually, we can fetch all student applications or just rely on a check on backend.
            // Let's call standard check. If not available, set false.
          } catch {
            setHasApplied(false);
          }
        }
      }

      // If user is creator, fetch applicants
      if (user && pData.created_by === user.id) {
        const appsRes = await api.get(`/team-applications/project/${id}`);
        setApplicants(appsRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole || !pitch) {
      toast.error('Please select a role and fill out your pitch');
      return;
    }

    setApplyLoading(true);
    try {
      await api.post('/team-applications', {
        project_id: id,
        role_applied: selectedRole,
        pitch,
        portfolio_link: portfolioLink
      });
      toast.success('Application submitted successfully!');
      setApplyModalOpen(false);
      setHasApplied(true);
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleApplicantDecision = async (appId, status) => {
    try {
      await api.put(`/team-applications/${appId}`, { status });
      toast.success(`Applicant ${status === 'accepted' ? 'accepted' : 'declined'} successfully`);
      fetchProjectDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing decision');
    }
  };

  if (loading) return <Loader type="skeleton" className="page-enter" />;
  if (!project) return <EmptyState title="Project not found" description="The project could not be found." />;

  const isCreator = user?.id === project.created_by;
  const isMember = project.members.some(m => m.id === user?.id);
  const unfilledRoles = project.open_roles.filter(r => !r.filled_by);

  return (
    <div className="project-details-container page-enter">
      {/* Detail Header */}
      <Card className="details-header-card" padding="lg">
        <div className="details-title-row">
          <h1>{project.title}</h1>
          <div className="project-meta-pills">
            <Badge variant={project.status}>{project.status}</Badge>
            <Badge variant="forming">Team Size: {project.team_size}</Badge>
          </div>
        </div>

        <div className="creator-meta">
          <Avatar name={project.creator_name} src={project.creator_avatar} size="sm" />
          <span className="creator-name">Posted by {project.creator_name}</span>
        </div>
      </Card>

      {/* Main split grid */}
      <div className="details-grid">
        {/* Left Side: Desc and Roster */}
        <div className="details-main">
          <Card className="details-desc-card">
            <h2>Project Overview</h2>
            <p className="details-desc-text">{project.description}</p>

            <h2 style={{ marginTop: 'var(--space-4)' }}>Required Skills</h2>
            <div className="project-skills-list">
              {project.skills_required.map((skill, idx) => (
                <SkillTag key={idx} skill={skill} />
              ))}
            </div>
          </Card>

          {/* Roster list of members */}
          <Card className="roster-card">
            <h2>Active Roster ({project.members.length}/{project.team_size})</h2>
            <div className="roster-list">
              {project.members.map((member) => (
                <div key={member.id} className="roster-item">
                  <div className="roster-member-info">
                    <Avatar name={member.name} src={member.avatar_url} size="sm" />
                    <div className="roster-member-details">
                      <span className="roster-member-name">{member.name}</span>
                      <span className="roster-member-college">{member.college}</span>
                    </div>
                  </div>
                  <span className="roster-member-role">{member.role || 'Collaborator'}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Manage Applicants (Creator view) */}
          {isCreator && (
            <Card className="applicants-card">
              <h2>Pending Applicants ({applicants.length})</h2>
              {applicants.length > 0 ? (
                <div className="applicants-list">
                  {applicants.map((app) => (
                    <div key={app.id} className="applicant-item">
                      <div className="applicant-header">
                        <div className="roster-member-info">
                          <Avatar name={app.name} src={app.avatar_url} size="sm" />
                          <div className="roster-member-details">
                            <span className="roster-member-name">{app.name}</span>
                            <span className="roster-member-college">{app.college}</span>
                          </div>
                        </div>
                        <Badge variant="open">Role: {app.role_applied}</Badge>
                      </div>

                      <div className="applicant-bio">
                        <strong>Skills: </strong> {app.skills.join(', ') || 'No skills listed'}
                      </div>

                      <div className="applicant-pitch">
                        <strong>Pitch:</strong> {app.pitch}
                      </div>

                      {app.portfolio_link && (
                        <div className="applicant-bio">
                          <strong>Portfolio:</strong> <a href={app.portfolio_link} target="_blank" rel="noopener noreferrer">{app.portfolio_link}</a>
                        </div>
                      )}

                      <div className="applicant-footer-actions">
                        <Button variant="ghost" onClick={() => handleApplicantDecision(app.id, 'rejected')}>
                          Decline
                        </Button>
                        <Button onClick={() => handleApplicantDecision(app.id, 'accepted')}>
                          Accept Team Member
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  No pending applications. Open roles are still available for students to apply.
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Right Side: Apply widgets */}
        <div className="details-sidebar">
          <Card padding="lg" className="details-desc-card">
            <h2>Collaboration Roster</h2>
            
            <div className="roster-list" style={{ marginTop: 'var(--space-2)' }}>
              {project.open_roles.map((r, idx) => (
                <div key={idx} className="roster-item" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: 'var(--text-sm)' }}>{r.role}</span>
                  {r.filled_by ? (
                    <Badge variant="completed">Filled by {r.filled_by}</Badge>
                  ) : (
                    <Badge variant="open">Open</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Actions for student */}
            {isStudent && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                {isMember ? (
                  <Button variant="primary" fullWidth onClick={() => navigate('/workspace')}>
                    Go to Shared Workspace <HiOutlineChevronRight />
                  </Button>
                ) : hasApplied ? (
                  <Button variant="secondary" fullWidth disabled>
                    Application Pending
                  </Button>
                ) : unfilledRoles.length > 0 && project.status === 'forming' ? (
                  <Button variant="primary" fullWidth icon={<HiOutlineUserPlus />} onClick={() => setApplyModalOpen(true)}>
                    Apply to Join Team
                  </Button>
                ) : (
                  <Button variant="secondary" fullWidth disabled>
                    Project Full or Closed
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Apply as Teammate"
        size="md"
      >
        <form onSubmit={handleApplySubmit} className="project-form">
          <Input
            label="Select Role"
            type="select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            placeholder="Select a role matching your skill..."
            options={unfilledRoles.map(r => ({ value: r.role, label: r.role }))}
            required
          />

          <Input
            label="Pitch / Introduction"
            type="textarea"
            placeholder="Explain why you want to join this project, what relevant skills you possess, and how you plan to contribute..."
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            required
          />

          <Input
            label="Relevant Portfolio / GitHub Link (Optional)"
            placeholder="https://github.com/username/project"
            value={portfolioLink}
            onChange={(e) => setPortfolioLink(e.target.value)}
          />

          <Button type="submit" fullWidth loading={applyLoading}>
            Submit Application
          </Button>
        </form>
      </Modal>
    </div>
  );
}
