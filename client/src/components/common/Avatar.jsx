import '../../styles/components/Avatar.css';

const GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #9333ea)',
  'linear-gradient(135deg, #2563eb, #3b82f6)',
  'linear-gradient(135deg, #059669, #10b981)',
  'linear-gradient(135deg, #db2777, #f43f5e)',
  'linear-gradient(135deg, #d97706, #f59e0b)',
  'linear-gradient(135deg, #0891b2, #06b6d4)',
];

export default function Avatar({
  src,
  name = '',
  size = 'md',
  status = null, // 'online' | 'offline' | null
  className = '',
  ...props
}) {
  const getInitials = (userName) => {
    if (!userName) return '?';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getGradient = (userName) => {
    if (!userName) return GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GRADIENTS.length;
    return GRADIENTS[index];
  };

  const initials = getInitials(name);
  const background = getGradient(name);

  return (
    <div className={`avatar-container avatar-${size} ${className}`} {...props}>
      {src ? (
        <img src={src} alt={name} className="avatar-img" />
      ) : (
        <div className="avatar-fallback" style={{ background }}>
          {initials}
        </div>
      )}
      
      {status && (
        <span className={`avatar-status-dot avatar-status-${status}`} />
      )}
    </div>
  );
}
