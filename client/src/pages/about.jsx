import LandingNavbar from "../components/landing/LandingNavbar";
import Footer from "../components/landing/footer";

export default function About() {
  return (
    <>
      <LandingNavbar />

      <section
        style={{
          padding: "140px 20px 100px",
          maxWidth: "1000px",
          margin: "auto",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#557455",
            fontSize: "48px",
            marginBottom: "20px",
          }}
        >
          About Arch
        </h1>

        <p
          style={{
            fontSize: "18px",
            lineHeight: "1.9",
            color: "#666",
          }}
        >
          Arch is a platform that bridges the gap between students and
          alumni. Whether you're looking for teammates, mentors,
          referrals, projects or career guidance, Arch helps build
          meaningful connections that support long-term growth.
        </p>
      </section>

      <Footer />
    </>
  );
}