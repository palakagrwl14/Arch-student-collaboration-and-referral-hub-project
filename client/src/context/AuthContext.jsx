import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const signup = async (data) => {
    const res = await api.post('/auth/signup', data);
    return res.data.data; // Returns { email }
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    const { token: newToken, user: userData } = res.data.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const googleLogin = async (credential, role = 'student') => {
    const res = await api.post('/auth/google', { credential, role });
    const { token: newToken, user: userData } = res.data.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const resendOtp = async (email) => {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data.message;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await api.put('/users/profile', data);
    setUser(res.data.data);
    return res.data.data;
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const isAuthenticated = !!user;
  const isStudent = user?.role === 'student';
  const isAlumni = user?.role === 'alumni';
  const isAdmin = user?.role === 'admin';
  const isVerified = user?.verification_status === 'verified';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      signup,
      verifyOtp,
      googleLogin,
      resendOtp,
      logout,
      updateProfile,
      refreshUser,
      isAuthenticated,
      isStudent,
      isAlumni,
      isAdmin,
      isVerified,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
