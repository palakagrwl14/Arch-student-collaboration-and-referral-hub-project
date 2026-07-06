import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/common';
import api from '../../services/api';
import '../../styles/pages/Auth.css';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset views and inputs
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Initialize Google Sign-In button
  useEffect(() => {
    /* global google */
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-default-id.apps.googleusercontent.com',
        callback: handleGoogleResponse
      });
      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn-container'),
        { theme: 'outline', size: 'large', width: '100%', shape: 'rectangular' }
      );
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      await googleLogin(response.credential);
      toast.success('Logged in with Google successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Google Authentication failed');
      toast.error('Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.response?.data?.code === 'EMAIL_UNVERIFIED') {
        toast.error('Email not verified. Redirecting to verification...');
        navigate('/signup', { state: { email, step: 'verify' } });
      } else {
        setError(err.response?.data?.message || 'Invalid email or password');
        toast.error('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      toast.success('Reset code sent if email is registered.');
      setView('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Error requesting reset code');
      toast.error('Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otpCode || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: resetEmail,
        otp: otpCode,
        newPassword
      });
      toast.success('Password reset successfully!');
      setView('login');
      setEmail(resetEmail);
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
      toast.error('Reset failed');
    } finally {
      setLoading(false);
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
              {view === 'forgot' && 'Reset Password'}
              {view === 'reset' && 'Verify Reset Code'}
              {view === 'login' && 'Welcome back'}
            </h1>
            <p className="auth-subtitle">
              {view === 'forgot' && 'Enter your email to receive a password reset code'}
              {view === 'reset' && 'Enter the verification OTP and choose a new password'}
              {view === 'login' && 'Login to access your dashboard'}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {view === 'login' && (
            <form onSubmit={handleSubmit} className="auth-form">
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-12px', marginBottom: '16px' }}>
                <button
                  type="button"
                  style={{ fontSize: 'var(--text-xs)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-primary)', fontWeight: 'var(--font-bold)' }}
                  onClick={() => {
                    setError('');
                    setView('forgot');
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
              >
                Sign In
              </Button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="name@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                icon={<HiOutlineEnvelope />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                style={{ marginTop: 'var(--space-2)' }}
              >
                Send Reset Code
              </Button>

              <button
                type="button"
                style={{ fontSize: 'var(--text-xs)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '16px', color: 'var(--text-secondary)', alignSelf: 'center' }}
                onClick={() => {
                  setError('');
                  setView('login');
                }}
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="auth-form">
              <p className="settings-modal-desc" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: '12px', textAlign: 'center' }}>
                A 6-digit password reset code has been sent to <strong>{resetEmail}</strong>.
              </p>

              <Input
                label="6-Digit Verification Code"
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<HiOutlineLockClosed />}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                Reset Password
              </Button>

              <button
                type="button"
                style={{ fontSize: 'var(--text-xs)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '16px', color: 'var(--text-secondary)', alignSelf: 'center' }}
                onClick={() => {
                  setError('');
                  setView('forgot');
                }}
              >
                ← Resend Code / Change Email
              </button>
            </form>
          )}

          <div style={{ display: view === 'login' ? 'block' : 'none' }}>
            <div className="auth-divider">
              <span>or login with</span>
            </div>

            {/* Native Google GSI button element container */}
            <div id="google-signin-btn-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}></div>
          </div>

          <p className="auth-footer" style={{ marginTop: 'var(--space-4)' }}>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
