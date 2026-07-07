import { useState, useEffect } from 'react';
import {
  useNavigate,
  Link,
  useLocation,
  useSearchParams
} from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineKey
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/common';
import '../../styles/pages/Auth.css';

export default function Signup() {
  const { signup, verifyOtp, resendOtp, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState("form");

  const [role, setRole] = useState(() => {
  const selectedRole = searchParams.get("role");

  if (
    selectedRole === "student" ||
    selectedRole === "alumni"
  ) {
    return selectedRole;
  }

  return "student";
});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  // If redirected from login page due to unverified status, transition to verify step immediately
  useEffect(() => {
    if (location.state && location.state.step === 'verify') {
      setEmail(location.state.email || '');
      setStep('verify');
    }
  }, [location]);

  // Render Google SSO button
  useEffect(() => {
    /* global google */
    if (typeof google !== 'undefined' && step === 'form') {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-default-id.apps.googleusercontent.com',
        callback: handleGoogleResponse
      });
      google.accounts.id.renderButton(
        document.getElementById('google-signup-btn-container'),
        { theme: 'outline', size: 'large', width: '100%', shape: 'rectangular' }
      );
    }
    },[location]);
    useEffect(() => {
    const selectedRole = searchParams.get("role");

    if (
    selectedRole === "student" ||
    selectedRole === "alumni"
    ) {
    setRole(selectedRole);
    }
    }, [searchParams]);
    useEffect(() => {
    /* global google */
    }, [step, role]); // Re-render button if step or role changes

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      await googleLogin(response.credential, role); // Register with the selected student/alumni role
      toast.success('Logged in with Google successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Google Registration failed');
      toast.error('Google Sign-Up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await signup({ name, email, password, role });
      setEmail(res.email); // Store the email returned by signup
      toast.success('Registration initial step complete. Code sent to email!');
      setStep('verify');
    } catch (err) {
      console.error(err);
      if (err.response?.data?.data?.unverified) {
        setEmail(err.response.data.data.email);
        toast.error('Email is unverified. Verification screen loaded.');
        setStep('verify');
      } else {
        setError(err.response?.data?.message || 'Registration failed');
        toast.error('Signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, otp);
      toast.success('Email verified! Welcome to Arch!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'OTP verification failed');
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResendLoading(true);
    try {
      await resendOtp(email);
      toast.success('A new verification code was sent to your email.');
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              <img src="/logo.png" alt="Arch Logo" style={{ height: '72px', objectFit: 'contain' }} />
            </div>
            <h1 className="auth-title">
              {step === 'form' ? 'Create account' : 'Verify your email'}
            </h1>
            <p className="auth-subtitle">
              {step === 'form' 
                ? 'Join Arch to get started' 
                : `We have sent a verification code to ${email}`}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-role-selector">
                <button
                  type="button"
                  className={`auth-role-option ${role === 'student' ? 'selected' : ''}`}
                  onClick={() => setRole('student')}
                >
                  <HiOutlineAcademicCap className="auth-role-icon" />
                  <span>Student</span>
                </button>
                
                <button
                  type="button"
                  className={`auth-role-option ${role === 'alumni' ? 'selected' : ''}`}
                  onClick={() => setRole('alumni')}
                >
                  <HiOutlineBriefcase className="auth-role-icon" />
                  <span>Alumni/Employee</span>
                </button>
              </div>

              <Input
                label="Full Name"
                type="text"
                placeholder="Aditya Shah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<HiOutlineUser />}
                required
              />
              
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<HiOutlineEnvelope />}
                required
              />
              
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<HiOutlineLockClosed />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                style={{ marginTop: 'var(--space-2)' }}
              >
                Sign Up
              </Button>

              <div className="auth-divider">
                <span>or sign up with</span>
              </div>

              {/* Native Google GSI button element container */}
              <div id="google-signup-btn-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}></div>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="auth-form">
              <Input
                label="Verification Code (6-digit OTP)"
                type="text"
                placeholder="Enter 6-digit OTP code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                icon={<HiOutlineKey />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                style={{ marginTop: 'var(--space-2)' }}
              >
                Verify Code
              </Button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 'var(--space-4)' }}>
                <button 
                  type="button" 
                  disabled={resendLoading} 
                  onClick={handleResend}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 'var(--text-xs)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {resendLoading ? 'Resending...' : 'Resend OTP'}
                </button>

                <button 
                  type="button" 
                  onClick={() => setStep('form')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                >
                  Change registration email
                </button>
              </div>
            </form>
          )}

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
