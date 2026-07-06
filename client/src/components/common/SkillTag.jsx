import { HiOutlineXMark } from 'react-icons/hi2';
import '../../styles/components/SkillTag.css';

export default function SkillTag({
  skill,
  removable = false,
  onRemove,
  size = 'sm',
  className = '',
  ...props
}) {
  return (
    <span className={`skill-tag skill-tag-${size} ${className}`} {...props}>
      {skill}
      {removable && (
        <button
          type="button"
          className="skill-tag-remove-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onRemove) onRemove(skill);
          }}
          aria-label={`Remove ${skill} skill`}
        >
          <HiOutlineXMark style={{ strokeWidth: 2.5, width: 12, height: 12 }} />
        </button>
      )}
    </span>
  );
}
