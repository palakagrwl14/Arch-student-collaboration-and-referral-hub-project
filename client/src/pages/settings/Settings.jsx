import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineLockClosed,
  HiOutlineCog6Tooth,
  HiOutlineShieldCheck,
  HiOutlineTrash,
  HiOutlineArrowRightOnRectangle,
  HiOutlineArrowDownTray,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineComputerDesktop,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineEnvelope,
  HiOutlineArrowPath
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input } from '../../components/common';
import api from '../../services/api';
import '../../styles/pages/Settings.css';

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Primary horizontal tab navigation
  const [activeTab, setActiveTab] = useState('general');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Active modal control state
  const [modalType, setModalType] = useState(null); // 'theme', 'defaultTab', 'profileVisibility', 'email', 'password', 'college', 'branch', 'graduationYear', 'cgpa', 'resume', 'jobType', 'workMode', 'locations', 'company', 'designation', 'proof', 'slots', 'deadline', 'deactivate', 'delete', 'changeRole'

  // Deletion details state
  const [deletionInfo, setDeletionInfo] = useState({ teams: 0, teamApplications: 0, referralApplications: 0, referralsPosted: 0 });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Settings values (displayed on page)
  const [theme, setTheme] = useState('dark');
  const [defaultTab, setDefaultTab] = useState('collaboration');
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [portfolioVisible, setPortfolioVisible] = useState(true);
  const [showSkills, setShowSkills] = useState(true);

  // Student academic fields
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [cgpa, setCgpa] = useState('');

  // Student career preferences
  const [jobType, setJobType] = useState('both');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [workMode, setWorkMode] = useState('both');
  const [skillsAutoFilter, setSkillsAutoFilter] = useState(false);

  // Alumni professional fields
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');

  // Alumni posting defaults
  const [defaultSlots, setDefaultSlots] = useState(1);
  const [defaultDeadlineDays, setDefaultDeadlineDays] = useState(30);
  const [autoClose, setAutoClose] = useState(true);

  // Modal temporary values
  const [tempValue, setTempValue] = useState('');
  const [tempTheme, setTempTheme] = useState('dark');
  const [tempDefaultTab, setTempDefaultTab] = useState('collaboration');
  const [tempProfileVisibility, setTempProfileVisibility] = useState('public');
  
  // Password temp fields
  const [tempOldPassword, setTempOldPassword] = useState('');
  const [tempNewPassword, setTempNewPassword] = useState('');
  const [tempConfirmPassword, setTempConfirmPassword] = useState('');

  // Upload file temp state
  const [tempFile, setTempFile] = useState(null);

  // Email change verification pending states
  const [emailStep, setEmailStep] = useState(1);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');

  // Load settings on mount
  useEffect(() => {
    if (user) {
      const settings = user.settings || {};
      const privacy = settings.privacy || {};
      const appPrefs = settings.app_preferences || {};
      
      setTheme(appPrefs.theme || 'dark');
      setDefaultTab(appPrefs.default_tab || 'collaboration');
      
      setProfileVisibility(privacy.profile_visibility || 'public');
      setPortfolioVisible(privacy.portfolio_visible !== false);
      setShowSkills(privacy.show_skills !== false);

      setCollege(user.college || '');
      setBranch(user.branch || '');
      setGradYear(user.graduation_year || '');
      setCgpa(user.cgpa || '');

      if (user.role === 'student') {
        const studentPrefs = settings.student_preferences || {};
        setJobType(studentPrefs.job_type || 'both');
        setPreferredLocations(Array.isArray(studentPrefs.locations) ? studentPrefs.locations.join(', ') : '');
        setWorkMode(studentPrefs.work_mode || 'both');
        setSkillsAutoFilter(studentPrefs.skills_auto_filter === true);
      }

      if (user.role === 'alumni') {
        setCompany(user.company || '');
        setDesignation(user.designation || '');

        const alumniDefaults = settings.alumni_defaults || {};
        setDefaultSlots(alumniDefaults.default_slots || 1);
        setDefaultDeadlineDays(alumniDefaults.default_deadline_days || 30);
        setAutoClose(alumniDefaults.auto_close !== false);
      }
    }
  }, [user]);

  // Apply theme to document
  const applyTheme = (themeName) => {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    if (themeName === 'light') {
      root.classList.add('light-theme');
    } else if (themeName === 'dark') {
      root.classList.add('dark-theme');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      if (systemPrefersDark.matches) {
        root.classList.add('dark-theme');
      } else {
        root.classList.add('light-theme');
      }
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setError('');
    setTempFile(null);
    
    if (type === 'theme') setTempTheme(theme);
    if (type === 'defaultTab') setTempDefaultTab(defaultTab);
    if (type === 'profileVisibility') setTempProfileVisibility(profileVisibility);
    if (type === 'email') {
      setEmailStep(1);
      setNewEmailInput(user.email || '');
      setOtpInput('');
    }
    
    if (type === 'college') setTempValue(college);
    if (type === 'branch') setTempValue(branch);
    if (type === 'graduationYear') setTempValue(gradYear);
    if (type === 'cgpa') setTempValue(cgpa);
    
    if (type === 'jobType') setTempValue(jobType);
    if (type === 'workMode') setTempValue(workMode);
    if (type === 'locations') setTempValue(preferredLocations);
    
    if (type === 'company') setTempValue(company);
    if (type === 'designation') setTempValue(designation);
    if (type === 'slots') setTempValue(defaultSlots);
    if (type === 'deadline') setTempValue(defaultDeadlineDays);
    
    if (type === 'changeRole') setTempValue(user.role === 'student' ? 'alumni' : 'student');
    
    if (type === 'delete') {
      setDeleteConfirmation('');
      fetchDeletionInfo();
    }
  };

  const fetchDeletionInfo = async () => {
    try {
      const res = await api.get('/users/deletion-info');
      setDeletionInfo(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Direct toggle saves (No modal triggers)
  const handleToggleDirect = async (settingKey, checkedValue) => {
    if (settingKey === 'portfolioVisible') setPortfolioVisible(checkedValue);
    if (settingKey === 'showSkills') setShowSkills(checkedValue);
    if (settingKey === 'skillsFilter') setSkillsAutoFilter(checkedValue);
    if (settingKey === 'autoClose') setAutoClose(checkedValue);

    try {
      let updatedSettings = { ...(user.settings || {}) };
      
      if (settingKey === 'portfolioVisible' || settingKey === 'showSkills') {
        updatedSettings.privacy = {
          ...updatedSettings.privacy,
          portfolio_visible: settingKey === 'portfolioVisible' ? checkedValue : portfolioVisible,
          show_skills: settingKey === 'showSkills' ? checkedValue : showSkills
        };
      } else if (settingKey === 'skillsFilter') {
        updatedSettings.student_preferences = {
          ...updatedSettings.student_preferences,
          skills_auto_filter: checkedValue
        };
      } else if (settingKey === 'autoClose') {
        updatedSettings.alumni_defaults = {
          ...updatedSettings.alumni_defaults,
          auto_close: checkedValue
        };
      }

      await api.put('/users/settings', { settings: updatedSettings });
      await refreshUser();
      toast.success('Preference updated successfully!');
    } catch (err) {
      if (settingKey === 'portfolioVisible') setPortfolioVisible(!checkedValue);
      if (settingKey === 'showSkills') setShowSkills(!checkedValue);
      if (settingKey === 'skillsFilter') setSkillsAutoFilter(!checkedValue);
      if (settingKey === 'autoClose') setAutoClose(!checkedValue);
      toast.error('Failed to update toggle configuration');
    }
  };

  const handleModalSave = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (modalType === 'theme' || modalType === 'defaultTab') {
        const updatedSettings = {
          ...(user.settings || {}),
          app_preferences: {
            theme: modalType === 'theme' ? tempTheme : theme,
            default_tab: modalType === 'defaultTab' ? tempDefaultTab : defaultTab
          }
        };
        await api.put('/users/settings', { settings: updatedSettings });
        if (modalType === 'theme') {
          setTheme(tempTheme);
          applyTheme(tempTheme);
        } else {
          setDefaultTab(tempDefaultTab);
        }
      }
      
      else if (modalType === 'profileVisibility') {
        const updatedSettings = {
          ...(user.settings || {}),
          privacy: {
            ...user.settings?.privacy,
            profile_visibility: tempProfileVisibility
          }
        };
        await api.put('/users/settings', { settings: updatedSettings });
        setProfileVisibility(tempProfileVisibility);
      }

      else if (modalType === 'email') {
        if (emailStep === 1) {
          await api.post('/users/profile/change-email-request', { newEmail: newEmailInput });
          toast.success('Verification code sent to your new inbox!');
          setEmailStep(2);
          setLoading(false); // keep modal open, allow OTP entering
          return;
        } else {
          const res = await api.post('/users/profile/verify-email-change', { otp: otpInput });
          toast.success('Email address updated successfully!');
          await refreshUser();
          setModalType(null);
          return;
        }
      }

      else if (modalType === 'password') {
        if (tempNewPassword !== tempConfirmPassword) {
          toast.error('New passwords do not match');
          setLoading(false);
          return;
        }
        if (tempNewPassword.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const isSsoUser = user.settings?.is_sso === true;
        const payload = isSsoUser 
          ? { newPassword: tempNewPassword }
          : { oldPassword: tempOldPassword, newPassword: tempNewPassword };

        await api.put('/auth/update-password', payload);
        setTempOldPassword('');
        setTempNewPassword('');
        setTempConfirmPassword('');
        toast.success('Password updated successfully!');
      }

      else if (modalType === 'college' || modalType === 'graduationYear' || modalType === 'branch' || modalType === 'cgpa') {
        await api.put('/users/settings', {
          college: modalType === 'college' ? tempValue : college,
          graduation_year: modalType === 'graduationYear' ? (tempValue ? Number(tempValue) : null) : gradYear,
          branch: modalType === 'branch' ? tempValue : branch,
          cgpa: modalType === 'cgpa' ? tempValue : cgpa
        });
      }

      else if (modalType === 'jobType' || modalType === 'workMode' || modalType === 'locations') {
        const studentPrefs = {
          job_type: modalType === 'jobType' ? tempValue : jobType,
          work_mode: modalType === 'workMode' ? tempValue : workMode,
          locations: modalType === 'locations' ? (tempValue ? tempValue.split(',').map(l => l.trim()).filter(Boolean) : []) : (preferredLocations ? preferredLocations.split(',').map(l => l.trim()).filter(Boolean) : []),
          skills_auto_filter: skillsAutoFilter
        };
        const updatedSettings = {
          ...(user.settings || {}),
          student_preferences: studentPrefs
        };
        await api.put('/users/settings', { settings: updatedSettings });
      }

      else if (modalType === 'company' || modalType === 'designation') {
        await api.put('/users/settings', {
          company: modalType === 'company' ? tempValue : company,
          designation: modalType === 'designation' ? tempValue : designation
        });
      }

      else if (modalType === 'slots' || modalType === 'deadline') {
        const alumniDefaults = {
          default_slots: modalType === 'slots' ? Number(tempValue) : defaultSlots,
          default_deadline_days: modalType === 'deadline' ? Number(tempValue) : defaultDeadlineDays,
          auto_close: autoClose
        };
        const updatedSettings = {
          ...(user.settings || {}),
          alumni_defaults: alumniDefaults
        };
        await api.put('/users/settings', { settings: updatedSettings });
      }

      else if (modalType === 'resume') {
        if (!tempFile) {
          toast.error('Please select a resume file');
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('resume', tempFile);
        await api.post('/users/settings/resume', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      else if (modalType === 'proof') {
        if (!tempFile) {
          toast.error('Please select a verification document');
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('proof', tempFile);
        await api.put('/users/verification', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      else if (modalType === 'changeRole') {
        await api.post('/users/change-role', { targetRole: tempValue });
        toast.success(`Role changed to ${tempValue}! Resetting configurations.`);
        await refreshUser();
        setModalType(null);
        setLoading(false);
        navigate('/dashboard');
        return;
      }

      else if (modalType === 'deactivate') {
        await api.post('/users/deactivate');
        toast.success('Account temporarily deactivated.');
        logout();
        navigate('/login');
        return;
      }

      else if (modalType === 'delete') {
        await api.delete('/users/delete', { data: { confirmation: deleteConfirmation } });
        toast.success('Account permanently deleted.');
        logout();
        navigate('/login');
        return;
      }

      await refreshUser();
      toast.success('Setting updated successfully!');
      setModalType(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save configuration');
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  // GDPR Data Export PDF format download
  const handleGDPRDataExport = async () => {
    try {
      const response = await api.get('/users/export-data', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `arch_data_export_${user.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('GDPR PDF data export downloaded.');
    } catch (err) {
      toast.error('Failed to export GDPR PDF data');
    }
  };

  const formatTheme = (val) => {
    if (val === 'light') return 'Light Theme';
    if (val === 'dark') return 'Dark Theme';
    return 'System Default';
  };

  const formatDefaultTab = (val) => {
    if (val === 'collaboration') return 'Projects Feed';
    return 'Referrals Feed';
  };

  const formatVisibility = (val) => {
    if (val === 'public') return 'Public (Everyone)';
    if (val === 'registered') return 'Registered Users Only';
    return 'Private (Only Me)';
  };

  return (
    <div className="settings-container page-enter">
      <div>
        <h1 className="dashboard-title">Account Settings</h1>
        <p className="dashboard-subtitle">Manage preferences, career profiles, privacy parameters, and data compliance</p>
      </div>

      {/* Primary horizontal tab pills at the top */}
      <div className="settings-tabs-horizontal">
        <button
          className={`settings-tab-pill ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <HiOutlineCog6Tooth className="settings-tab-icon" />
          General & Privacy
        </button>
        
        <button
          className={`settings-tab-pill ${activeTab === 'role' ? 'active' : ''}`}
          onClick={() => setActiveTab('role')}
        >
          {user?.role === 'student' ? (
            <HiOutlineAcademicCap className="settings-tab-icon" />
          ) : (
            <HiOutlineBriefcase className="settings-tab-icon" />
          )}
          {user?.role === 'student' ? 'Academic & Career' : 'Professional & Config'}
        </button>
      </div>

      {/* Content Panel */}
      <div className="settings-panel">
        
        {/* TAB 1: General & Privacy */}
        {activeTab === 'general' && (
          <>
            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">App Preferences</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Default Dashboard Feed</span>
                    <span className="settings-row-value">{formatDefaultTab(defaultTab)}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('defaultTab')}>
                    Change Feed
                  </Button>
                </div>
              </div>
            </Card>

            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Privacy Parameters</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Profile Visibility</span>
                    <span className="settings-row-value">{formatVisibility(profileVisibility)}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('profileVisibility')}>
                    Change Visibility
                  </Button>
                </div>

                {/* Switch Toggles directly on row (No Modal) */}
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Show Portfolio Achievements</span>
                    <span className="settings-row-value">{portfolioVisible ? 'Yes (Visible)' : 'No (Hidden)'}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-toggle-input"
                    checked={portfolioVisible}
                    onChange={(e) => handleToggleDirect('portfolioVisible', e.target.checked)}
                  />
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Display Skills List</span>
                    <span className="settings-row-value">{showSkills ? 'Yes (Visible)' : 'No (Hidden)'}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-toggle-input"
                    checked={showSkills}
                    onChange={(e) => handleToggleDirect('showSkills', e.target.checked)}
                  />
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">GDPR Data Portability</span>
                    <span className="settings-row-value">Download a backup copy of your entire account records in PDF format</span>
                  </div>
                  <Button variant="secondary" onClick={handleGDPRDataExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HiOutlineArrowDownTray /> Export my data
                  </Button>
                </div>
              </div>
            </Card>

            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Authentication & Security</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Account Email Address</span>
                    <span className="settings-row-value">{user?.email}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('email')}>
                    Update Email
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Account Password</span>
                    <span className="settings-row-value">••••••••</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('password')}>
                    Change Password
                  </Button>
                </div>
              </div>
            </Card>

            {/* Red Tinted Danger Zone Section at the bottom of General tab */}
            <div className="danger-divider" />
            <h3 className="danger-zone-title">Danger Zone</h3>
            
            <Card padding="lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.01)' }}>
              <div className="settings-rows-list">
                <div className="settings-row-item" style={{ borderBottomColor: 'rgba(255, 255, 255, 0.04)' }}>
                  <div className="settings-row-info">
                    <span className="settings-row-label" style={{ color: 'var(--error)' }}>Deactivate Account</span>
                    <span className="settings-row-value" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Temporarily hide your profile and referral listings. Reactivate by logging back in.</span>
                  </div>
                  <button className="btn-danger-outline" onClick={() => openModal('deactivate')}>
                    Deactivate Account
                  </button>
                </div>

                <div className="settings-row-item" style={{ borderBottomColor: 'rgba(255, 255, 255, 0.04)' }}>
                  <div className="settings-row-info">
                    <span className="settings-row-label" style={{ color: 'var(--error)' }}>Delete Account</span>
                    <span className="settings-row-value" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Permanently erase your account, active project collaborations, and posted job slots.</span>
                  </div>
                  <button className="btn-danger-outline" onClick={() => openModal('delete')}>
                    Delete Permanently
                  </button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label" style={{ color: 'var(--error)' }}>Switch User Role</span>
                    <span className="settings-row-value" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Swap your role classification between Student and Alumni/Employee. Will wipe profile settings.</span>
                  </div>
                  <button className="btn-danger-outline" onClick={() => openModal('changeRole')}>
                    Change Role
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* TAB 2: Academic & Career (Student) */}
        {activeTab === 'role' && user?.role === 'student' && (
          <>
            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Academic Profile</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">College/University Name</span>
                    <span className={`settings-row-value ${!college ? 'placeholder' : ''}`}>{college || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('college')}>
                    Update College
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Academic Branch</span>
                    <span className={`settings-row-value ${!branch ? 'placeholder' : ''}`}>{branch || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('branch')}>
                    Update Branch
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Graduation Year</span>
                    <span className={`settings-row-value ${!gradYear ? 'placeholder' : ''}`}>{gradYear || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('graduationYear')}>
                    Update Year
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Cumulative GPA Score (CGPA)</span>
                    <span className={`settings-row-value ${!cgpa ? 'placeholder' : ''}`}>{cgpa || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('cgpa')}>
                    Update CGPA
                  </Button>
                </div>
              </div>
            </Card>

            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Application Defaults</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Default Resume Attachment</span>
                    {user.default_resume_path ? (
                      <a 
                        href={`${api.defaults.baseURL.replace('/api', '')}${user.default_resume_path}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', textDecoration: 'underline', marginTop: '6px', fontWeight: 'var(--font-semibold)' }}
                      >
                        <HiOutlineDocumentText /> default_resume.pdf
                      </a>
                    ) : (
                      <span className="settings-row-value placeholder">No default resume uploaded yet</span>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => openModal('resume')}>
                    {user.default_resume_path ? 'Replace Resume' : 'Upload Resume'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Referral Feed Preferences</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Preferred Job Type</span>
                    <span className="settings-row-value">
                      {jobType === 'internship' ? 'Internship Only' : jobType === 'fulltime' ? 'Full-Time Only' : 'Both (Internship / Full-Time)'}
                    </span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('jobType')}>
                    Update Preference
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Work Mode Format</span>
                    <span className="settings-row-value">
                      {workMode === 'remote' ? 'Remote Only' : workMode === 'hybrid' ? 'Hybrid' : workMode === 'onsite' ? 'On-site' : 'No Preference (Any)'}
                    </span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('workMode')}>
                    Update Mode
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Preferred Locations</span>
                    <span className={`settings-row-value ${!preferredLocations ? 'placeholder' : ''}`}>{preferredLocations || 'Any Location'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('locations')}>
                    Update Locations
                  </Button>
                </div>

                {/* Toggle switch directly on row (No Modal) */}
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Auto-Filter Feed by Profile Skills</span>
                    <span className="settings-row-value">{skillsAutoFilter ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-toggle-input"
                    checked={skillsAutoFilter}
                    onChange={(e) => handleToggleDirect('skillsFilter', e.target.checked)}
                  />
                </div>
              </div>
            </Card>
          </>
        )}

        {/* TAB 2: Professional & Config (Alumni) */}
        {activeTab === 'role' && user?.role === 'alumni' && (
          <>
            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Professional Identity</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Current Employer / Company</span>
                    <span className={`settings-row-value ${!company ? 'placeholder' : ''}`}>{company || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('company')}>
                    Update Company
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Designation / Title</span>
                    <span className={`settings-row-value ${!designation ? 'placeholder' : ''}`}>{designation || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('designation')}>
                    Update Designation
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">College / Alma Mater</span>
                    <span className={`settings-row-value ${!college ? 'placeholder' : ''}`}>{college || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('college')}>
                    Update College
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Graduation Year</span>
                    <span className={`settings-row-value ${!gradYear ? 'placeholder' : ''}`}>{gradYear || 'Not set'}</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('graduationYear')}>
                    Update Year
                  </Button>
                </div>
              </div>
            </Card>

            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Corporate Verification</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Verification Status</span>
                    <div style={{ marginTop: '6px' }}>
                      <span className={`status-badge ${user.verification_status}`} style={{ textTransform: 'capitalize', fontSize: 'var(--text-xs)' }}>
                        {user.verification_status}
                      </span>
                    </div>
                  </div>
                  {(user.verification_status === 'unverified' || user.verification_status === 'rejected') && (
                    <Button variant="secondary" onClick={() => openModal('proof')}>
                      Upload Proof
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
              <h3 className="settings-section-title">Auto-Posting Config Defaults</h3>
              <div className="settings-rows-list">
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Default Slots Limit</span>
                    <span className="settings-row-value">{defaultSlots} referral slots</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('slots')}>
                    Update Slots
                  </Button>
                </div>

                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Expiration Period Delay</span>
                    <span className="settings-row-value">{defaultDeadlineDays} days from post</span>
                  </div>
                  <Button variant="secondary" onClick={() => openModal('deadline')}>
                    Update Days
                  </Button>
                </div>

                {/* Toggle switch directly on row (No Modal) */}
                <div className="settings-row-item">
                  <div className="settings-row-info">
                    <span className="settings-row-label">Auto-Close When Slots Filled</span>
                    <span className="settings-row-value">{autoClose ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-toggle-input"
                    checked={autoClose}
                    onChange={(e) => handleToggleDirect('autoClose', e.target.checked)}
                  />
                </div>
              </div>
            </Card>
          </>
        )}

      </div>

      {/* UNIVERSAL MODAL OVERLAY COMPONENT RENDERER */}
      {modalType !== null && (
        <div className="settings-modal-overlay" onClick={() => setModalType(null)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Titles & Headers */}
            <h3 className="settings-modal-title">
              {modalType === 'defaultTab' && <HiOutlineCog6Tooth />}
              {modalType === 'profileVisibility' && <HiOutlineCog6Tooth />}
              {modalType === 'email' && <HiOutlineEnvelope />}
              {modalType === 'password' && <HiOutlineLockClosed />}
              {modalType === 'college' && <HiOutlineAcademicCap />}
              {modalType === 'branch' && <HiOutlineAcademicCap />}
              {modalType === 'graduationYear' && <HiOutlineAcademicCap />}
              {modalType === 'cgpa' && <HiOutlineAcademicCap />}
              {modalType === 'jobType' && <HiOutlineBriefcase />}
              {modalType === 'workMode' && <HiOutlineBriefcase />}
              {modalType === 'locations' && <HiOutlineBriefcase />}
              {modalType === 'company' && <HiOutlineBriefcase />}
              {modalType === 'designation' && <HiOutlineBriefcase />}
              {modalType === 'slots' && <HiOutlineBriefcase />}
              {modalType === 'deadline' && <HiOutlineBriefcase />}
              {modalType === 'resume' && <HiOutlineDocumentText />}
              {modalType === 'proof' && <HiOutlineShieldCheck />}
              {modalType === 'changeRole' && <HiOutlineArrowPath />}
              {modalType === 'deactivate' && <HiOutlineArrowRightOnRectangle />}
              {modalType === 'delete' && <HiOutlineTrash />}
              
              {modalType === 'defaultTab' && 'Default Dashboard Tab'}
              {modalType === 'profileVisibility' && 'Update Profile Visibility'}
              {modalType === 'email' && 'Update Account Email'}
              {modalType === 'password' && (user.settings?.is_sso === true ? 'Set Account Password' : 'Change Account Password')}
              {modalType === 'college' && 'Update College/University'}
              {modalType === 'branch' && 'Update Branch Details'}
              {modalType === 'graduationYear' && 'Update Graduation Year'}
              {modalType === 'cgpa' && 'Update CGPA Score'}
              {modalType === 'jobType' && 'Preferred Job Type'}
              {modalType === 'workMode' && 'Preferred Work Mode'}
              {modalType === 'locations' && 'Preferred Job Locations'}
              {modalType === 'company' && 'Update Company Details'}
              {modalType === 'designation' && 'Update Professional Title'}
              {modalType === 'slots' && 'Default Referral Slots'}
              {modalType === 'deadline' && 'Auto-Expiry Days'}
              {modalType === 'resume' && 'Upload Resume PDF'}
              {modalType === 'proof' && 'Upload Verification Proof'}
              {modalType === 'changeRole' && 'Switch Account Role'}
              {modalType === 'deactivate' && 'Deactivate Account Temporarily'}
              {modalType === 'delete' && 'Permanent Account Deletion'}
            </h3>

            {error && <div className="auth-error" style={{ marginTop: 'var(--space-3)' }}>{error}</div>}

            <form onSubmit={handleModalSave} className="settings-modal-content">

              {/* Default Tab Selection */}
              {modalType === 'defaultTab' && (
                <div className="settings-row">
                  <label className="settings-label">Default Feed Tab</label>
                  <select
                    className="auth-role-option"
                    style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                    value={tempDefaultTab}
                    onChange={(e) => setTempDefaultTab(e.target.value)}
                  >
                    <option value="collaboration">Collaboration Feed (Projects)</option>
                    <option value="referral">Referral Feed (Jobs)</option>
                  </select>
                </div>
              )}

              {/* Profile Visibility */}
              {modalType === 'profileVisibility' && (
                <div className="settings-row">
                  <label className="settings-label">Select Visibility</label>
                  <select
                    className="auth-role-option"
                    style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                    value={tempProfileVisibility}
                    onChange={(e) => setTempProfileVisibility(e.target.value)}
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="registered">Registered Users Only</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                </div>
              )}

              {/* Email update */}
              {modalType === 'email' && (
                <>
                  {emailStep === 1 ? (
                    <Input
                      label="New Email Address"
                      type="email"
                      placeholder="newemail@example.com"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      required
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      <p className="settings-modal-desc" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                        We've sent a 6-digit verification code to <strong>{newEmailInput}</strong>. Please enter the OTP below to verify your new email.
                      </p>
                      <Input
                        label="Enter 6-Digit OTP"
                        type="text"
                        placeholder="123456"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="navbar-notifications-mark-read" 
                        style={{ alignSelf: 'flex-start', marginTop: 'var(--space-1)' }}
                        onClick={async () => {
                          try {
                            await api.post('/users/profile/change-email-request', { newEmail: newEmailInput });
                            toast.success('A new verification code has been sent!');
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'Failed to resend code');
                          }
                        }}
                      >
                        Resend OTP
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Password update */}
              {modalType === 'password' && (
                <>
                  {user.settings?.is_sso !== true && (
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="••••••••"
                      value={tempOldPassword}
                      onChange={(e) => setTempOldPassword(e.target.value)}
                      required
                    />
                  )}
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={tempNewPassword}
                    onChange={(e) => setTempNewPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                    value={tempConfirmPassword}
                    onChange={(e) => setTempConfirmPassword(e.target.value)}
                    required
                  />
                </>
              )}

              {/* Academic & Professional text fields */}
              {(modalType === 'college' || modalType === 'branch' || modalType === 'graduationYear' || modalType === 'cgpa' || modalType === 'company' || modalType === 'designation') && (
                <Input
                  label={
                    modalType === 'college' ? 'College/University Name' :
                    modalType === 'branch' ? 'Academic Branch' :
                    modalType === 'graduationYear' ? 'Graduation Year' :
                    modalType === 'cgpa' ? 'Cumulative GPA' :
                    modalType === 'company' ? 'Company Name' : 'Job Title/Designation'
                  }
                  type={modalType === 'graduationYear' ? 'number' : 'text'}
                  placeholder={
                    modalType === 'college' ? 'e.g. SSIPMT' :
                    modalType === 'branch' ? 'e.g. CSE' :
                    modalType === 'graduationYear' ? 'e.g. 2027' :
                    modalType === 'cgpa' ? 'e.g. 8.5' :
                    modalType === 'company' ? 'e.g. Google' : 'e.g. Senior Software Engineer'
                  }
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                />
              )}

              {/* Career drop downs */}
              {modalType === 'jobType' && (
                <div className="settings-row">
                  <label className="settings-label">Job Type Preference</label>
                  <select
                    className="auth-role-option"
                    style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                  >
                    <option value="internship">Internship Only</option>
                    <option value="fulltime">Full-Time Only</option>
                    <option value="both">Both (Internship / Full-Time)</option>
                  </select>
                </div>
              )}

              {modalType === 'workMode' && (
                <div className="settings-row">
                  <label className="settings-label">Work Mode Format</label>
                  <select
                    className="auth-role-option"
                    style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                  >
                    <option value="remote">Remote Only</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                    <option value="both">No Preference (Any)</option>
                  </select>
                </div>
              )}

              {/* Location tagging */}
              {modalType === 'locations' && (
                <Input
                  label="Preferred Locations (Comma-separated)"
                  type="text"
                  placeholder="e.g. Bangalore, Mumbai, Remote"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                />
              )}

              {/* Alumni Posting defaults */}
              {(modalType === 'slots' || modalType === 'deadline') && (
                <Input
                  label={modalType === 'slots' ? 'Default Slot Count Limit' : 'Auto-Expire Delay (days)'}
                  type="number"
                  placeholder={modalType === 'slots' ? '1' : '30'}
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                />
              )}

              {/* File uploads */}
              {(modalType === 'resume' || modalType === 'proof') && (
                <div className="settings-row">
                  <label className="settings-label">Choose Document File (PDF / Images)</label>
                  <label className="settings-file-uploader" style={{ marginTop: 'var(--space-2)' }}>
                    <input 
                      type="file" 
                      accept={modalType === 'resume' ? '.pdf' : '*/*'}
                      style={{ display: 'none' }} 
                      onChange={(e) => setTempFile(e.target.files[0])} 
                    />
                    <HiOutlineDocumentText className="settings-file-icon" />
                    <span className="settings-file-name" style={{ color: tempFile ? 'var(--success)' : 'var(--text-primary)' }}>
                      {tempFile ? tempFile.name : 'Click to select proof document file'}
                    </span>
                  </label>
                </div>
              )}

              {/* Switch Roles Warning Form */}
              {modalType === 'changeRole' && (
                <>
                  <div className="warning-alert">
                    ⚠️ <strong>WARNING:</strong> Changing your role classification will permanently delete all your existing settings parameters, verification proofs, uploaded resumes, and profile academic details. You will need to setup and verify your profile details again.
                  </div>
                  <div className="settings-row" style={{ marginTop: 'var(--space-3)' }}>
                    <label className="settings-label">Target Role Classification</label>
                    <select
                      className="auth-role-option"
                      style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                    >
                      <option value="student">Student Portal</option>
                      <option value="alumni">Alumni / Employee Portal</option>
                    </select>
                  </div>
                </>
              )}

              {/* Deactivate Warning */}
              {modalType === 'deactivate' && (
                <div className="warning-alert" style={{ background: 'rgba(239, 68, 68, 0.04)', borderColor: 'rgba(239, 68, 68, 0.25)', color: 'var(--error)' }}>
                  ⚠️ You are deactivating your account. All your published projects, team memberships, and job listings will be hidden from other users. All your data remains safely stored. You can reactivate by logging back in with your credentials.
                </div>
              )}

              {/* Permanent Delete Warning & Loss Metrics */}
              {modalType === 'delete' && (
                <>
                  <div className="warning-alert" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.25)', color: 'var(--error)' }}>
                    🚨 <strong>CRITICAL DATA IMPLICATIONS:</strong>
                    <p style={{ marginTop: 'var(--space-2)' }}>
                      You have <strong>{deletionInfo.referralApplications} active referral applications</strong>
                      {user.role === 'alumni' && <> and <strong>{deletionInfo.referralsPosted} posted referrals</strong></>}.
                      Deleting your account will permanently remove all of them!
                    </p>
                    <ul style={{ margin: 'var(--space-3) 0 0 var(--space-4)', padding: 0 }}>
                      <li>Your user account will be permanently erased.</li>
                      <li>You will lose membership in <strong>{deletionInfo.teams} active project teams</strong>.</li>
                      <li>You will withdraw <strong>{deletionInfo.teamApplications} project team applications</strong>.</li>
                    </ul>
                  </div>

                  <p className="settings-modal-desc" style={{ marginTop: 'var(--space-3)' }}>
                    Type <strong>DELETE</strong> in the box below to permanently erase your profile:
                  </p>
                  
                  <Input
                    type="text"
                    placeholder="DELETE"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    required
                  />
                </>
              )}

              {/* Modal actions */}
              <div className="settings-modal-actions">
                <Button type="button" variant="secondary" onClick={() => setModalType(null)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant={(modalType === 'delete' || modalType === 'deactivate' || modalType === 'changeRole') ? 'danger' : 'primary'}
                  loading={loading}
                  disabled={modalType === 'delete' && deleteConfirmation !== 'DELETE'}
                >
                  {modalType === 'deactivate' ? 'Confirm Deactivation' : 
                   modalType === 'delete' ? 'Confirm Deletion' : 
                   (modalType === 'email' && emailStep === 1) ? 'Send Verification Code' : 
                   (modalType === 'email' && emailStep === 2) ? 'Verify & Update Email' : 
                   (modalType === 'password' && user.settings?.is_sso === true) ? 'Set Password' : 
                   'Save Changes'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
