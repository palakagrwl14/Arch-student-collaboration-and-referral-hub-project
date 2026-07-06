import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineMagnifyingGlass, HiOutlinePlus, HiOutlineSparkles, HiOutlineBriefcase } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Input, Loader, EmptyState, Modal, SkillTag } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';
import '../../styles/pages/Projects.css';

export default function ProjectFeed() {
  const { user, isStudent } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [newRole, setNewRole] = useState('');
  const [openRoles, setOpenRoles] = useState([]);
  const [teamSize, setTeamSize] = useState(4);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [search, skillFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (skillFilter) params.skill = skillFilter;
      
      const res = await api.get('/projects', { params });
      setProjects(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching projects');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatch = (projectSkills) => {
    if (!user || !user.skills || user.skills.length === 0 || !projectSkills || projectSkills.length === 0) {
      return 0;
    }
    const mySkills = user.skills.map(s => s.toLowerCase());
    const matches = projectSkills.filter(s => mySkills.includes(s.toLowerCase()));
    return Math.round((matches.length / projectSkills.length) * 100);
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (newRole.trim()) {
      setOpenRoles([...openRoles, { role: newRole.trim(), filled_by: null }]);
      setNewRole('');
    }
  };

  const handleRemoveRole = (roleText) => {
    setOpenRoles(openRoles.filter(r => r.role !== roleText));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!title || !description || !requiredSkills) {
      toast.error('Please fill in all required fields');
      return;
    }

    setFormLoading(true);
    const skillsArray = requiredSkills.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await api.post('/projects', {
        title,
        description,
        skills_required: skillsArray,
        open_roles: openRoles,
        team_size: Number(teamSize)
      });
      toast.success('Project idea posted successfully!');
      setCreateModalOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      setRequiredSkills('');
      setOpenRoles([]);
      setTeamSize(4);
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error creating project');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="projects-container page-enter">
      {/* Header with CTA */}
      <div className="projects-header">
        <div>
          <h1 className="dashboard-title">Collaboration Hub</h1>
          <p className="dashboard-subtitle">Find or form team groups for hackathons and projects</p>
        </div>
        {isStudent && (
          <Button icon={<HiOutlinePlus />} onClick={() => setCreateModalOpen(true)}>
            Post Project Idea
          </Button>
        )}
      </div>

      {/* Filter controls */}
      <div className="projects-search-filters">
        <div className="search-input-wrapper">
          <HiOutlineMagnifyingGlass className="search-icon-projects" />
          <Input
            placeholder="Search projects by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="projects-filter-select">
          <Input
            placeholder="Filter by skill (e.g. React)..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Project Feeds */}
      {loading ? (
        <Loader type="skeleton" />
      ) : projects.length > 0 ? (
        <div className="projects-grid">
          {projects.map((project) => {
            const matchPercent = calculateMatch(project.skills_required);
            return (
              <Card
                key={project.id}
                className="project-card"
                hoverable
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="project-card-header">
                  <h2 className="project-card-title">{project.title}</h2>
                  {matchPercent > 0 && (
                    <span className="project-match-badge">
                      <HiOutlineSparkles style={{ marginRight: 2 }} />
                      {matchPercent}% Match
                    </span>
                  )}
                </div>

                <p className="project-card-desc">{project.description}</p>

                {/* Skills tags list */}
                <div className="project-skills-list">
                  {project.skills_required.map((skill, idx) => (
                    <SkillTag key={idx} skill={skill} />
                  ))}
                </div>

                {/* Roles checklist summary */}
                <div className="project-roles-summary">
                  <span className="role-summary-heading">Open Roles</span>
                  <div className="roles-pills">
                    {project.open_roles.length > 0 ? (
                      project.open_roles.map((r, idx) => (
                        <span
                          key={idx}
                          className={`role-pill ${r.filled_by ? 'filled' : ''}`}
                        >
                          {r.role} {r.filled_by ? `(Filled)` : ''}
                        </span>
                      ))
                    ) : (
                      <span className="role-pill">General Collaborators</span>
                    )}
                  </div>
                </div>

                {/* Footer with avatar & status */}
                <div className="project-card-footer">
                  <div className="creator-meta">
                    <Avatar name={project.creator_name} src={project.creator_avatar} size="sm" />
                    <span className="creator-name">{project.creator_name}</span>
                  </div>
                  <Badge variant={project.status}>{project.status}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<HiOutlineBriefcase />}
          title="No projects found"
          description="Try broadening your search keywords or filter terms to find collaborations."
          action={isStudent && <Button onClick={() => setCreateModalOpen(true)}>Create a Project</Button>}
        />
      )}

      {/* Creation Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Form a New Project Group"
        size="md"
      >
        <form onSubmit={handleCreateProject} className="project-form">
          <Input
            label="Project Title"
            placeholder="e.g. AI-powered Task Allocator"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Input
            label="Project Description"
            type="textarea"
            placeholder="Provide a detailed summary of what your project accomplishes, target milestones, and key architectures..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Input
            label="Required Skills (Comma separated)"
            placeholder="e.g. React, Node.js, Python, Firebase"
            value={requiredSkills}
            onChange={(e) => setRequiredSkills(e.target.value)}
            required
          />

          <div className="roles-input-builder">
            <label className="form-label">Add Specific Team Roles</label>
            <div className="roles-input-row">
              <Input
                placeholder="e.g. Frontend Lead, ML Developer..."
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <Button variant="secondary" onClick={handleAddRole}>
                Add
              </Button>
            </div>
            <div className="roles-list-tags">
              {openRoles.map((r, idx) => (
                <SkillTag
                  key={idx}
                  skill={r.role}
                  removable
                  onRemove={handleRemoveRole}
                />
              ))}
            </div>
          </div>

          <Input
            label="Target Team Size"
            type="number"
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            min="2"
            max="10"
            required
          />

          <Button type="submit" fullWidth loading={formLoading}>
            Post Project Idea
          </Button>
        </form>
      </Modal>
    </div>
  );
}
