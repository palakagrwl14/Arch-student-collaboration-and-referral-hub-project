import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineShieldCheck,
  HiOutlineStar,
  HiOutlineCheckBadge,
  HiOutlinePaperClip,
  HiOutlinePlus
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Input, Loader, EmptyState, SkillTag } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';
import '../../styles/pages/Profile.css';

export default function Profile() {
  const { id } = useParams(); // Public Profile ID (optional)
  const { user: currentUser, updateProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  const isPublicView = !!id && id !== currentUser?.id;

  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState(null);

  // Edit fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Verification Proof
  const [proofFile, setProofFile] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Avatar upload references
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarClick = () => {
    if (!isPublicView && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/users/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newAvatarUrl = res.data.data.avatarUrl;
      setProfileUser(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      await refreshUser(); // refresh global state for topbar
      toast.success('Profile photo updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [id, currentUser]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      if (isPublicView) {
        // Fetch public profile
        const res = await api.get(`/users/${id}/public`);
        setProfileUser(res.data.data);
      } else {
        // Fetch own profile
        const res = await api.get('/users/profile');
        const pData = res.data.data;
        setProfileUser(pData);

        // Prepopulate edit fields
        setName(pData.name || '');
        setBio(pData.bio || '');
        setCollege(pData.college || '');
        setSkills(pData.skills || []);
        setCompany(pData.company || '');
        setDesignation(pData.designation || '');
        setGradYear(pData.graduation_year || '');
        setLinkedinUrl(pData.linkedin_url || '');
        setGithubUrl(pData.github_url || '');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching profile');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const updateData = {
        name,
        bio,
        college,
        skills,
        linkedin_url: linkedinUrl,
        github_url: githubUrl
      };

      if (profileUser.role === 'alumni') {
        updateData.company = company;
        updateData.designation = designation;
        updateData.graduation_year = gradYear ? Number(gradYear) : null;
      }

      await updateProfile(updateData);
      toast.success('Profile saved successfully!');
      fetchProfileData();
    } catch (err) {
      toast.error('Error saving profile');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!proofFile) return;

    setVerificationLoading(true);
    const formData = new FormData();
    formData.append('proof', proofFile);

    try {
      await api.put('/users/verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Verification proof submitted! Admin will review your account.');
      setProofFile(null);
      await refreshUser();
      fetchProfileData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting verification proof');
    } finally {
      setVerificationLoading(false);
    }
  };

  if (loading) return <Loader type="skeleton" className="page-enter" />;
  if (!profileUser) return <EmptyState title="User not found" description="Profile cannot be loaded." />;

  const isAlumni = profileUser.role === 'alumni';

  return (
    <div className="profile-page-container page-enter">
      {/* Profile summary header */}
      <Card padding="lg">
        <div className="profile-card-header-main">
          <div className="profile-avatar-container" onClick={handleAvatarClick} title={!isPublicView ? "Click to change profile photo" : ""}>
            <Avatar name={profileUser.name} src={profileUser.avatar_url} size="xl" />
            {!isPublicView && (
              <div className="avatar-upload-overlay">
                <HiOutlinePlus className="avatar-upload-icon" />
                <span>{avatarUploading ? 'Uploading' : 'Upload'}</span>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleAvatarChange} 
            />
          </div>
          <div className="profile-meta-details">
            <div className="profile-name-text">
              {profileUser.name}
              {isAlumni && profileUser.verification_status === 'verified' && (
                <HiOutlineCheckBadge style={{ color: 'var(--success)', width: 22, height: 22 }} />
              )}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>
              {profileUser.role === 'alumni' ? `${profileUser.designation || 'Alumni'} at ${profileUser.company || 'Alma Mater'}` : `Student • ${profileUser.college || 'College'}`}
            </span>
            {isAlumni && (
              <div style={{ marginTop: 'var(--space-1)' }}>
                <Badge variant={profileUser.verification_status}>{profileUser.verification_status}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Public view stats */}
        {isPublicView && isAlumni && profileUser.stats && (
          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <span className="profile-stat-number">★ {profileUser.stats.student_rating}</span>
              <span className="profile-stat-label">Rating</span>
            </div>
            <div className="profile-stat-box">
              <span className="profile-stat-number">{profileUser.stats.referrals_posted}</span>
              <span className="profile-stat-label">Posted</span>
            </div>
            <div className="profile-stat-box">
              <span className="profile-stat-number">{profileUser.stats.referrals_completed}</span>
              <span className="profile-stat-label">Completed</span>
            </div>
          </div>
        )}
      </Card>

      {/* Main split: Public stats summary or Form Editor */}
      {isPublicView ? (
        <Card padding="lg" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2>Public Biography</h2>
          <p className="details-desc-text">{profileUser.bio || 'No biography details provided.'}</p>

          <h2 style={{ marginTop: 'var(--space-2)' }}>Skills</h2>
          <div className="skills-tags-container">
            {profileUser.skills.length > 0 ? (
              profileUser.skills.map((skill, idx) => <SkillTag key={idx} skill={skill} />)
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No skills listed.</span>
            )}
          </div>

          <h2 style={{ marginTop: 'var(--space-2)' }}>Contact Links</h2>
          <div style={{ display: 'flex', gap: 12, fontSize: 'var(--text-sm)' }}>
            {profileUser.linkedin_url && <a href={profileUser.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>}
            {profileUser.github_url && <a href={profileUser.github_url} target="_blank" rel="noopener noreferrer">GitHub Profile</a>}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Alumni verification panel */}
          {isAlumni && profileUser.verification_status !== 'verified' && (
            <Card padding="lg" className="verification-status-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HiOutlineShieldCheck className="warning-banner-icon" />
                <div>
                  <h3 style={{ fontSize: 'var(--text-sm)' }}>Verify Employee Status</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {profileUser.verification_status === 'pending'
                      ? 'Proof submitted. Administrative team is currently reviewing your company credentials.'
                      : 'Please submit company verification proof (employment offer letter, company ID, or corporate domain domain-match) to unlock posting referrals.'}
                  </p>
                </div>
              </div>

              {profileUser.verification_status === 'unverified' && (
                <form onSubmit={handleVerificationSubmit} className="project-form" style={{ marginTop: 'var(--space-2)' }}>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    placeholder="Upload employment ID card or offer letter (PDF/Images)"
                    required
                  />
                  <Button type="submit" size="sm" loading={verificationLoading} style={{ alignSelf: 'flex-start' }}>
                    Submit Verification Proof
                  </Button>
                </form>
              )}
            </Card>
          )}

          {/* Form profile editor */}
          <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
            <h2>Edit Profile Details</h2>
            <form onSubmit={handleSaveProfile} className="post-referral-form" style={{ marginTop: 'var(--space-4)' }}>
              <div className="form-row-split">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="College / University"
                  placeholder="IIT Delhi"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                />
              </div>

              {isAlumni && (
                <>
                  <div className="form-row-split">
                    <Input
                      label="Company Name"
                      placeholder="e.g. Google"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                    />
                    <Input
                      label="Designation / Designation"
                      placeholder="e.g. Senior Software Engineer"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    label="Graduation Year"
                    type="number"
                    placeholder="e.g. 2020"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                  />
                </>
              )}

              <Input
                label="Biography / Bio"
                type="textarea"
                placeholder="Write a brief introduction about your career goals, active hackathons history, or referral domains..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />

              <div className="roles-input-builder">
                <label className="form-label">Manage Skills</label>
                <div className="roles-input-row">
                  <Input
                    placeholder="e.g. Python, Figma, React..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                  <Button variant="secondary" onClick={handleAddSkill}>
                    Add Skill
                  </Button>
                </div>
                <div className="skills-tags-container">
                  {skills.map((skill, idx) => (
                    <SkillTag
                      key={idx}
                      skill={skill}
                      removable
                      onRemove={handleRemoveSkill}
                    />
                  ))}
                </div>
              </div>

              <div className="form-row-split" style={{ marginTop: 'var(--space-2)' }}>
                <Input
                  label="LinkedIn URL"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
                <Input
                  label="GitHub URL"
                  placeholder="https://github.com/username"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>

              <Button type="submit" fullWidth loading={saveLoading} style={{ marginTop: 'var(--space-2)' }}>
                Save Profile Details
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
