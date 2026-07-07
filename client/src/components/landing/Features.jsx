// ======================================================
// client/src/components/landing/Features.jsx
// ======================================================

import {
  HiOutlineUsers,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineLightBulb,
} from "react-icons/hi";

import "../../styles/components/features.css";

const features = [
  {
    icon: <HiOutlineUsers />,
    title: "Meaningful Connections",
    text: "Build genuine relationships with students, alumni and professionals across different domains.",
  },
  {
    icon: <HiOutlineAcademicCap />,
    title: "Career Guidance",
    text: "Receive mentorship, interview tips and industry insights from experienced alumni.",
  },
  {
    icon: <HiOutlineBriefcase />,
    title: "Projects & Opportunities",
    text: "Discover internships, projects, referrals and hackathons all in one place.",
  },
  {
    icon: <HiOutlineLightBulb />,
    title: "Knowledge Sharing",
    text: "Learn together through discussions, resources and collaborative communities.",
  },
];

export default function Features() {
  return (
    <section className="features-section">
      <div className="features-container">
        <div className="section-heading">
          <span>WHY ARCH?</span>

          <h2>Everything you need to grow together.</h2>

          <p>
            Arch connects ambitious students with experienced alumni,
            making networking, collaboration and career growth simple.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">
                {feature.icon}
              </div>

              <h3>{feature.title}</h3>

              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}