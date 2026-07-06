import { HiOutlineCheck } from 'react-icons/hi2';
import '../../styles/components/StatusTimeline.css';

export default function StatusTimeline({
  steps = [],
  className = '',
  ...props
}) {
  return (
    <div className={`timeline ${className}`} {...props}>
      {steps.map((step, idx) => {
        const itemClass = [
          'timeline-item',
          step.status === 'active' ? 'timeline-item-active' : ''
        ].filter(Boolean).join(' ');

        const nodeClass = [
          'timeline-item-node',
          `timeline-node-${step.status}`
        ].filter(Boolean).join(' ');

        return (
          <div key={idx} className={itemClass}>
            <div className={nodeClass}>
              {step.status === 'completed' && <HiOutlineCheck style={{ strokeWidth: 3, width: 12, height: 12 }} />}
            </div>
            <div className="timeline-item-content">
              <span className="timeline-item-title">{step.label}</span>
              {step.date && <span className="timeline-item-date">{step.date}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
