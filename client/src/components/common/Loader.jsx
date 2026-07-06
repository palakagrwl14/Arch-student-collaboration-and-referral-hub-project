import '../../styles/components/Loader.css';

export default function Loader({
  type = 'spinner', // 'spinner' | 'skeleton' | 'page'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  ...props
}) {
  if (type === 'page') {
    return (
      <div className="page-loader">
        <div className="spinner spinner-lg" />
        <span className="page-loader-brand">Arch</span>
      </div>
    );
  }

  if (type === 'skeleton') {
    return (
      <div className={`skeleton-wrapper ${className}`} {...props}>
        <div className="skeleton-item skeleton-title" />
        <div className="skeleton-item skeleton-text" />
        <div className="skeleton-item skeleton-text" style={{ width: '85%' }} />
        <div className="skeleton-item skeleton-text" style={{ width: '50%' }} />
      </div>
    );
  }

  return (
    <div
      className={`spinner spinner-${size} ${className}`}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}
export { Loader };
