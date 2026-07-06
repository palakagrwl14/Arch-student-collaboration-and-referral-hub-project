import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineUserGroup, HiOutlineChevronRight } from 'react-icons/hi2';
import { Card, Button, Badge, Loader, EmptyState } from '../../components/common';
import api from '../../services/api';

export default function MyTeams() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTeams();
  }, []);

  const fetchMyTeams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects/my-teams');
      setTeams(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load project teams');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader type="skeleton" className="page-enter" />;

  return (
    <div className="projects-container page-enter">
      <div>
        <h1 className="dashboard-title">My Collaboration Teams</h1>
        <p className="dashboard-subtitle">Manage your active and completed project groups</p>
      </div>

      {teams.length > 0 ? (
        <div className="projects-grid">
          {teams.map((team) => (
            <Card key={team.id} className="project-card">
              <div className="project-card-header">
                <h2 className="project-card-title">{team.title}</h2>
                <Badge variant={team.status}>{team.status}</Badge>
              </div>

              <p className="project-card-desc" style={{ marginBottom: 'var(--space-2)' }}>
                {team.description}
              </p>

              <div className="project-roles-summary" style={{ background: 'rgba(255,255,255,0.01)', border: 'none', padding: 'var(--space-2) 0' }}>
                <span className="role-summary-heading">Your Roster Designation</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', fontWeight: 'var(--font-semibold)' }}>
                  {team.my_role || 'Collaborator'}
                </span>
              </div>

              <div className="project-card-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Team capacity: {team.team_size} members
                </span>
                
                <Button
                  size="sm"
                  onClick={() => navigate(`/workspace?project=${team.id}`)}
                >
                  Enter Workspace <HiOutlineChevronRight />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HiOutlineUserGroup />}
          title="No active teams"
          description="You are not currently enrolled in any active project groups. Browse the feed to find a team."
          action={<Button onClick={() => navigate('/projects')}>Browse Project Feed</Button>}
        />
      )}
    </div>
  );
}
