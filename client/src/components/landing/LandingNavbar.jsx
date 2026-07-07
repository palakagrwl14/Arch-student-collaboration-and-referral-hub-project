import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "../../styles/components/landingnavbar.css";

export default function LandingNavbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">

        <div className="logo" onClick={() => navigate("/")}>
          <img src="/logo.png" alt="Arch" />
          <span>ARCH</span>
        </div>

        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>

        <button
          className="start-btn"
          onClick={() => navigate("/signup?role=student")}
        >
          Get Started
        </button>

      </div>
    </header>
  );
}