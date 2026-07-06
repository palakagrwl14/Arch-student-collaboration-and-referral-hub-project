import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { HiOutlineAcademicCap, HiOutlinePencil, HiOutlineCheckBadge } from 'react-icons/hi2';
import { Card, Button, Badge, Input, Loader, EmptyState, Modal, SkillTag } from '../../components/common';
import api from '../../services/api';

export default function Portfolio() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rolePlayed, setRolePlayed] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await api.get('/portfolio');
      setEntries(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load portfolio entries');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (entry) => {
    setSelectedEntry(entry);
    setRolePlayed(entry.role_played || '');
    setContributionNotes(entry.contribution_notes || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!rolePlayed || !contributionNotes) return;

    setEditLoading(true);
    try {
      await api.put(`/portfolio/${selectedEntry.id}`, {
        role_played: rolePlayed,
        contribution_notes: contributionNotes
      });
      toast.success('Contribution notes updated!');
      setEditModalOpen(false);
      fetchPortfolio();
    } catch (err) {
      toast.error('Failed to update portfolio entry');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) return <Loader type="skeleton" className="page-enter" />;

  return (
    <div className="projects-container page-enter">
      {/* Header */}
      <div className="projects-header">
        <div>
          <h1 className="dashboard-title">Verified Portfolio</h1>
          <p className="dashboard-subtitle">Auto-populated credentials from completed team collaborations</p>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="projects-grid">
          {entries.map((entry) => (
            <Card key={entry.id} className="project-card" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div className="project-card-header">
                <h2 className="project-card-title">{entry.project_title}</h2>
                <Badge variant="verified">Verified</Badge>
              </div>

              <p className="project-card-desc">{entry.project_description}</p>

              {/* Skills Tags */}
              <div className="project-skills-list">
                {entry.skills_used.map((skill, idx) => (
                  <SkillTag key={idx} skill={skill} />
                ))}
              </div>

              {/* Contribution details */}
              <div className="project-roles-summary" style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span className="role-summary-heading">Your Role</span>
                  <button onClick={() => handleEditClick(entry)} style={{ color: 'var(--text-secondary)' }} aria-label="Edit notes">
                    <HiOutlinePencil style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)', marginBottom: 'var(--space-2)' }}>
                  {entry.role_played}
                </div>
                
                <span className="role-summary-heading" style={{ fontSize: '10px' }}>Contribution Details</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>
                  {entry.contribution_notes}
                </p>
              </div>

              <div className="project-card-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Completed at: {new Date(entry.completed_at).toLocaleDateString()}
                </span>
                
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: '11px', fontWeight: 'var(--font-semibold)' }}>
                  <HiOutlineCheckBadge /> Credential Verified
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HiOutlineAcademicCap />}
          title="Portfolio is empty"
          description="Completed projects in the Collaboration Hub automatically trigger verified entries in your portfolio. Finish active milestones to build your credentials."
          action={<Button onClick={() => navigate('/my-teams')}>Check Active Teams</Button>}
        />
      )}

      {/* Edit Notes Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Clarify Your Contribution"
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="project-form">
          <Input
            label="Your Role Played"
            value={rolePlayed}
            onChange={(e) => setRolePlayed(e.target.value)}
            required
          />
          <Input
            label="Contribution Notes"
            type="textarea"
            placeholder="Specifically describe what you built, task tickets completed, or design frameworks integrated. Keep it concise to showcase on your referrals application..."
            value={contributionNotes}
            onChange={(e) => setContributionNotes(e.target.value)}
            required
          />
          <Button type="submit" fullWidth loading={editLoading}>
            Update Portfolio Entry
          </Button>
        </form>
      </Modal>
    </div>
  );
}
