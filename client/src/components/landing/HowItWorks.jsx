import "../../styles/components/howItWorks.css";

const steps = [
  {
    no: "01",
    title: "Create Your Profile",
    desc: "Sign up as a Student or Alumni and build your profile."
  },
  {
    no: "02",
    title: "Connect & Collaborate",
    desc: "Find mentors, teammates and connect with your community."
  },
  {
    no: "03",
    title: "Grow Together",
    desc: "Explore projects, referrals and opportunities to advance."
  }
];

export default function HowItWorks() {
  return (
    <section className="how-section">
      <div className="how-container">

        <div className="section-title">
          <span>HOW ARCH WORKS</span>
          <h2>Three Simple Steps</h2>
          <p>
            Build your network, collaborate on projects and unlock career
            opportunities through one platform.
          </p>
        </div>

        <div className="steps">

          {steps.map((step) => (
            <div className="step-card" key={step.no}>
              <div className="step-number">{step.no}</div>

              <h3>{step.title}</h3>

              <p>{step.desc}</p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}