import '../../styles/components/EmptyState.css';

export default function EmptyState({
  icon,
  title,
  description,
  action = null,
  className = '',
  ...props
}) {
  return (
    <div className={`empty-state ${className}`} {...props}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
