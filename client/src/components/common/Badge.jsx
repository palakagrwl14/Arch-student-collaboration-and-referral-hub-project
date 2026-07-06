import { HiOutlineCheck } from 'react-icons/hi2';
import '../../styles/components/Badge.css';

export default function Badge({
  variant = 'active',
  size = 'sm',
  children,
  className = '',
  ...props
}) {
  const classes = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {variant === 'verified' && <HiOutlineCheck style={{ strokeWidth: 3 }} />}
      {children}
    </span>
  );
}
