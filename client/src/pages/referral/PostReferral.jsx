import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineBriefcase, HiOutlineLockClosed } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, EmptyState } from '../../components/common';
import api from '../../services/api';
import '../../styles/pages/Referrals.css';

export default function PostReferral() {
  const { user, isVerified } = useAuth();
  const navigate = useNavigate();

  const [company, setCompany] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [type, setType] = useState('internship');
  const [locationName, setLocationName] = useState('');
  const [workMode, setWorkMode] = useState('onsite');
  const [salary, setSalary] = useState('');
  const [skillsRequired, setSkillsRequired] = useState('');
  const [eligibilityCgpa, setEligibilityCgpa] = useState('');
  const [eligibilityBranches, setEligibilityBranches] = useState('');
  const [eligibilityBatchYears, setEligibilityBatchYears] = useState('');
  const [eligibilityText, setEligibilityText] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [slotsTotal, setSlotsTotal] = useState(1);
  
  const [formLoading, setFormLoading] = useState(false);

  // If not verified, prevent access
  if (!isVerified) {
    return (
      <EmptyState
        icon={<HiOutlineLockClosed style={{ color: 'var(--warning)' }} />}
        title="Verification Required"
        description="Your alumni profile must be verified by an administrator before you can post career referrals. Submit credentials in your Profile settings."
        action={<Button onClick={() => navigate('/profile')}>Go to Profile</Button>}
      />
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!company || !jobRole || !lastDate || !slotsTotal) {
      toast.error('Please fill in all required fields');
      return;
    }

    setFormLoading(true);

    const skillsArray = skillsRequired.split(',').map(s => s.trim()).filter(Boolean);
    const branchesArray = eligibilityBranches.split(',').map(b => b.trim()).filter(Boolean);
    const batchesArray = eligibilityBatchYears.split(',').map(b => b.trim()).filter(Boolean);

    try {
      await api.post('/referrals', {
        company,
        job_role: jobRole,
        type,
        location: locationName,
        work_mode: workMode,
        salary,
        skills_required: skillsArray,
        eligibility_cgpa: eligibilityCgpa ? Number(eligibilityCgpa) : null,
        eligibility_branches: branchesArray,
        eligibility_batch_years: batchesArray,
        eligibility_text: eligibilityText,
        description,
        responsibilities,
        last_date: lastDate,
        slots_total: Number(slotsTotal)
      });

      toast.success('Career referral posted successfully!');
      navigate('/my-referrals');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post referral');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="referrals-container page-enter">
      <div>
        <h1 className="dashboard-title">Post a Career Referral</h1>
        <p className="dashboard-subtitle">Create a job vacancy referral post for students at your alma mater</p>
      </div>

      <Card padding="lg" style={{ background: 'var(--bg-secondary)' }}>
        <form onSubmit={handleSubmit} className="post-referral-form">
          <div className="form-row-split">
            <Input
              label="Company Name"
              placeholder="e.g. Google"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
            <Input
              label="Job Position / Role"
              placeholder="e.g. Software Engineering Intern"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              required
            />
          </div>

          <div className="form-row-split">
            <Input
              label="Job Classification Type"
              type="select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: 'internship', label: 'Internship' },
                { value: 'fulltime', label: 'Full-Time Position' }
              ]}
              required
            />
            <Input
              label="Work Mode"
              type="select"
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              options={[
                { value: 'onsite', label: 'On-site' },
                { value: 'remote', label: 'Remote' },
                { value: 'hybrid', label: 'Hybrid' }
              ]}
              required
            />
          </div>

          <div className="form-row-split">
            <Input
              label="Location"
              placeholder="e.g. Bangalore, India"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
            <Input
              label="Salary / Stipend Details (Optional)"
              placeholder="e.g. ₹1,00,000 / month"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>

          <Input
            label="Required Skills (Comma separated list)"
            placeholder="e.g. C++, Java, React, SQL"
            value={skillsRequired}
            onChange={(e) => setSkillsRequired(e.target.value)}
          />

          <Card style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: 'var(--space-4) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)' }}>Eligibility Benchmarks</h3>
            
            <div className="form-row-split">
              <Input
                label="Minimum CGPA Threshold"
                type="number"
                step="0.01"
                placeholder="e.g. 8.0"
                value={eligibilityCgpa}
                onChange={(e) => setEligibilityCgpa(e.target.value)}
              />
              
              <Input
                label="Target Graduation Years (Comma separated)"
                placeholder="e.g. 2026, 2027"
                value={eligibilityBatchYears}
                onChange={(e) => setEligibilityBatchYears(e.target.value)}
              />
            </div>

            <Input
              label="Allowed Branches (Comma separated list)"
              placeholder="e.g. Computer Science, Information Technology"
              value={eligibilityBranches}
              onChange={(e) => setEligibilityBranches(e.target.value)}
            />

            <Input
              label="General Eligibility Details"
              type="textarea"
              placeholder="Specify additional branches, CGPA equivalents, or prerequisite coursework details..."
              value={eligibilityText}
              onChange={(e) => setEligibilityText(e.target.value)}
              rows={3}
            />
          </Card>

          <Input
            label="Job Description"
            type="textarea"
            placeholder="Provide a summary of the team, products, and tech stack details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            required
          />

          <Input
            label="Key Responsibilities"
            type="textarea"
            placeholder="Detail the day-to-day responsibilities for this role..."
            value={responsibilities}
            onChange={(e) => setResponsibilities(e.target.value)}
            rows={5}
          />

          <div className="form-row-split">
            <Input
              label="Last Date to Apply (YYYY-MM-DD)"
              type="text"
              placeholder="YYYY-MM-DD"
              value={lastDate}
              onChange={(e) => setLastDate(e.target.value)}
              required
            />

            <Input
              label="Total Referral Slots / Vacancies"
              type="number"
              value={slotsTotal}
              onChange={(e) => setSlotsTotal(e.target.value)}
              min="1"
              required
            />
          </div>

          <Button type="submit" fullWidth loading={formLoading} style={{ marginTop: 'var(--space-2)' }}>
            Post Career Referral
          </Button>
        </form>
      </Card>
    </div>
  );
}
