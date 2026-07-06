import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { HiOutlineShieldCheck, HiOutlineFlag, HiOutlineListBullet, HiOutlineCheck, HiOutlineXMark } from 'react-icons/hi2';
import { Card, Button, Badge, Loader, EmptyState } from '../../components/common';
import api from '../../services/api';

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('verifications');
  
  // Data State
  const [verifications, setVerifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'verifications') {
        const res = await api.get('/admin/verifications');
        setVerifications(res.data.data);
      } else if (activeTab === 'reports') {
        const res = await api.get('/admin/reports');
        setReports(res.data.data);
      } else if (activeTab === 'audit') {
        const res = await api.get('/admin/audit-logs');
        setAuditLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching administrative details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDecision = async (userId, decision) => {
    try {
      await api.put(`/admin/verifications/${userId}`, { status: decision });
      toast.success(`Verification ${decision === 'verified' ? 'approved' : 'rejected'}`);
      fetchAdminData();
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const handleReportDecision = async (reportId, decision, action) => {
    try {
      await api.put(`/admin/reports/${reportId}`, {
        status: decision,
        actionTaken: action
      });
      toast.success(`Report resolved (Action: ${action})`);
      fetchAdminData();
    } catch (err) {
      toast.error('Error resolving report');
    }
  };

  return (
    <div className="projects-container page-enter">
      <div>
        <h1 className="dashboard-title">System Administration Panel</h1>
        <p className="dashboard-subtitle">Moderate flagged job referrals, audit logs, and verify employee accounts</p>
      </div>

      {/* Tabs */}
      <div className="workspace-tabs">
        <button
          className={`workspace-tab-btn ${activeTab === 'verifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('verifications')}
        >
          <HiOutlineShieldCheck style={{ marginRight: 6 }} /> Verifications ({verifications.length})
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <HiOutlineFlag style={{ marginRight: 6 }} /> Flagged Reports ({reports.length})
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <HiOutlineListBullet style={{ marginRight: 6 }} /> System Audit Logs
        </button>
      </div>

      {/* TAB PANELS */}
      {loading ? (
        <Loader type="skeleton" />
      ) : (
        <div style={{ marginTop: 'var(--space-2)' }}>
          
          {/* 1. Pending Verifications */}
          {activeTab === 'verifications' && (
            <div className="feed-grid">
              {verifications.length > 0 ? (
                verifications.map((v) => (
                  <Card key={v.id} className="applicant-item" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div className="applicant-header">
                      <div className="roster-member-details">
                        <span className="roster-member-name" style={{ fontSize: 'var(--text-base)' }}>{v.name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{v.email}</span>
                      </div>
                      <Badge variant="pending">Pending</Badge>
                    </div>

                    <div className="applicant-bio">
                      <strong>Designation:</strong> {v.designation} at {v.company} (Grad: {v.graduation_year})
                    </div>

                    {v.verification_proof && (
                      <div className="applicant-bio">
                        <strong>Uploaded Proof:</strong>{' '}
                        <a href={v.verification_proof} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--accent-primary)' }}>
                          Inspect Proof Document
                        </a>
                      </div>
                    )}

                    <div className="applicant-footer-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
                      <Button variant="ghost" icon={<HiOutlineXMark />} onClick={() => handleVerifyDecision(v.id, 'rejected')} style={{ color: 'var(--error)' }}>
                        Decline
                      </Button>
                      <Button icon={<HiOutlineCheck />} onClick={() => handleVerifyDecision(v.id, 'verified')}>
                        Approve Employee
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={<HiOutlineShieldCheck />}
                  title="All Caught Up"
                  description="There are currently no pending employee verification requests."
                />
              )}
            </div>
          )}

          {/* 2. Flagged Reports */}
          {activeTab === 'reports' && (
            <div className="feed-grid">
              {reports.length > 0 ? (
                reports.map((r) => (
                  <Card key={r.id} className="applicant-item" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div className="applicant-header">
                      <div className="roster-member-details">
                        <span className="roster-member-name" style={{ fontSize: 'var(--text-base)' }}>Flagged Referral: {r.job_role}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Company: {r.company}</span>
                      </div>
                      <Badge variant="rejected">Flagged</Badge>
                    </div>

                    <div className="applicant-pitch" style={{ background: 'var(--bg-primary)' }}>
                      <strong>Reason for Flag:</strong> "{r.reason}"
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Reported by user: {r.reported_by_name}
                      </div>
                    </div>

                    <div className="applicant-footer-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
                      <Button variant="ghost" onClick={() => handleReportDecision(r.id, 'dismissed', 'none')}>
                        Dismiss Flags
                      </Button>
                      <Button variant="danger" onClick={() => handleReportDecision(r.id, 'resolved', 'remove_posting')}>
                        Remove Referral Posting
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={<HiOutlineFlag />}
                  title="No compliant flags"
                  description="There are no reported referrals or complaints awaiting administrative action."
                />
              )}
            </div>
          )}

          {/* 3. System Audit Logs */}
          {activeTab === 'audit' && (
            <Card className="applicants-table-card">
              {auditLogs.length > 0 ? (
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Performer</th>
                      <th>Entity Type</th>
                      <th>Action</th>
                      <th>Status Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>
                          <strong>{log.performer_name || 'System'}</strong>
                        </td>
                        <td>
                          <Badge variant="open" size="sm">{log.entity_type}</Badge>
                        </td>
                        <td>
                          <code>{log.action}</code>
                        </td>
                        <td>
                          {log.old_status && (
                            <>
                              <Badge variant={log.old_status} size="sm">{log.old_status}</Badge>
                              <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>→</span>
                            </>
                          )}
                          {log.new_status && (
                            <Badge variant={log.new_status} size="sm">{log.new_status}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                  No audit logs available.
                </p>
              )}
            </Card>
          )}

        </div>
      )}
    </div>
  );
}
