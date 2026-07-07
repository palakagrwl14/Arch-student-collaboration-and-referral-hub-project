import { useNavigate } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi";
import heroIllustration from "../../assets/hero-illustration.png";
import "../../styles/components/hero.css";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="hero-container">

        {/* Left Content */}
        <div className="hero-left">

          <h1>
            Ideas need teammates.
            <br />
            Careers need mentors.
            <br />
            <span>Arch gives you both.</span>
          </h1>

          <p>
            Connect with students, alumni and professionals,
            collaborate on projects, discover opportunities,
            and grow together through one unified platform.
          </p>

          <div className="hero-buttons">
            <button
              className="student-btn"
              onClick={() => navigate("/signup?role=student")}
            >
              Join as Student
            </button>

            <button
              className="alumni-btn"
              onClick={() => navigate("/signup?role=alumni")}
            >
              Join as Alumni
              <HiArrowRight style={{ marginLeft: "8px" }} />
            </button>
          </div>

        </div>

        {/* Right Image */}
        <div className="hero-right">
          <div className="hero-card">
            <img
              src={heroIllustration}
              alt="Arch Illustration"
              className="hero-image"
            />
          </div>
        </div>

      </div>
    </section>
  );
}