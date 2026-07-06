import '../../styles/components/Card.css';

export default function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  padding = 'md',
  variant = 'default',
  ...props
}) {
  const classes = [
    'card',
    `card-${variant}`,
    `card-p-${padding}`,
    hoverable ? 'card-hoverable' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
}
