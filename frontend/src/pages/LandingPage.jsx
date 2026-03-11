import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getAuthValue } from '../services/authStorage';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1700&q=80',
    kicker: 'Hospital Workflow Platform',
    title: 'Secure, Smart, and Seamless Patient Journey Management',
    description:
      'Manage registration, scheduling, consultations, and analytics in one role-based system built for administrators, receptionists, and doctors.',
    ctaPrimary: 'Schedule and Start Now'
  },
  {
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1700&q=80',
    kicker: 'Admission Coordination',
    title: 'Secure a Room for Your Elective Admission',
    description:
      'Coordinate admissions faster with centralized records, status tracking, and streamlined pre-admission workflows.',
    ctaPrimary: 'Schedule Your Admission Today'
  },
  {
    image: 'https://images.unsplash.com/photo-1612531385446-f7b7c0e6ed0f?auto=format&fit=crop&w=1700&q=80',
    kicker: 'Patient Experience',
    title: "We're Here to Take Care of You Today",
    description:
      'Give teams real-time access to appointments, consultation notes, and care updates for a smoother patient experience.',
    ctaPrimary: 'Leave a Feedback'
  },
  {
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1700&q=80',
    kicker: 'Stories That Matter',
    title: '#MyAsianStory Inspired Care Delivery',
    description:
      'Use transparent care timelines and analytics to improve outcomes while keeping every department aligned.',
    ctaPrimary: 'Read More Stories'
  }
];

export default function LandingPage() {
  const token = getAuthValue('token');
  if (token) return <Navigate to="/app" replace />;

  const [activeSlide, setActiveSlide] = useState(0);

  const currentSlide = useMemo(() => slides[activeSlide], [activeSlide]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const goPrev = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="hospital-landing">
      <header className="top-utility-bar">
        <div className="brand-block">
          <div className="brand-mark">+</div>
          <div>
            <h1>MediTrack Medical Center</h1>
            <p>Operational Excellence. Compassionate Care.</p>
          </div>
        </div>
      </header>

      <nav className="hospital-nav-row">
        <a href="#">Find a Doctor</a>
        <a href="#">Expertise</a>
        <a href="#">Patient & Visitor Guide</a>
        <a href="#">Online Services</a>
        <a href="#">News & Events</a>
        <a href="#">About Us</a>
        <a href="#">Contact Us</a>
      </nav>

      <section className="hero-banner" style={{ backgroundImage: `url('${currentSlide.image}')` }}>
        <div className="hero-overlay" />

        <button type="button" className="hero-arrow left" aria-label="Previous slide" onClick={goPrev}>
          &#10094;
        </button>
        <button type="button" className="hero-arrow right" aria-label="Next slide" onClick={goNext}>
          &#10095;
        </button>

        <div className="hero-content">
          <p className="hero-kicker">{currentSlide.kicker}</p>
          <h2>{currentSlide.title}</h2>
          <p>{currentSlide.description}</p>

          <div className="hero-cta-row">
            <Link to="/register" className="hero-cta primary">{currentSlide.ctaPrimary}</Link>
            <Link to="/login" className="hero-cta secondary">Sign In to Dashboard</Link>
          </div>

          <div className="hero-dots" aria-label="Slide indicators">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={index === activeSlide ? 'hero-dot active' : 'hero-dot'}
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="hero-feature-strip">
          <article>
            <h3>Patient Management</h3>
            <p>Digital registration, demographics, insurance, and history tracking.</p>
          </article>
          <article>
            <h3>Appointment Engine</h3>
            <p>No double-booking with doctor workload visibility and status flow.</p>
          </article>
          <article>
            <h3>Analytics Dashboard</h3>
            <p>Diagnoses trends, utilization metrics, demographics, and peak hours.</p>
          </article>
        </div>
      </section>

      <section className="landing-access-bar">
        <p>Access Portal</p>
        <div>
          <Link to="/login" className="outline-btn">Login</Link>
          <Link to="/register" className="solid-btn">Register</Link>
        </div>
      </section>

      <section className="landing-info-wrap">
        <article className="info-card intro">
          <h3>Welcome to MediTrack</h3>
          <p>
            MediTrack is a hospital workflow platform designed to keep care teams aligned from patient registration
            to discharge, with clear records, coordinated appointments, and decision-ready analytics.
          </p>
        </article>

        <div className="info-grid">
          <article className="info-card">
            <h4>Faster Front Desk Operations</h4>
            <p>
              Register patients, verify profile details, and manage appointment queues with less manual back-and-forth.
            </p>
          </article>

          <article className="info-card">
            <h4>Connected Clinical Notes</h4>
            <p>
              Doctors can document diagnosis and treatment plans per visit, creating a cleaner and searchable timeline.
            </p>
          </article>

          <article className="info-card">
            <h4>Actionable Hospital Insights</h4>
            <p>
              Monitor utilization, trends, and peak times to improve staffing decisions and patient experience.
            </p>
          </article>
        </div>

        <section className="video-showcase">
          <div className="video-copy">
            <p className="section-kicker">Featured Care Journey</p>
            <h3>Experience Coordinated Care in Action</h3>
            <p>
              Discover how MediTrack helps teams deliver safer, more connected, and patient-centered care across every
              stage of the hospital journey. This overview highlights a professional digital experience designed to build
              confidence for both patients and healthcare staff.
            </p>
            <div className="video-info-list">
              <div>
                <strong>Warm welcome</strong>
                <span>Welcome to MediTrack, where every patient journey is supported with care, clarity, and respect.</span>
              </div>
              <div>
                <strong>Trusted care environment</strong>
                <span>Our platform is designed to help patients and care teams stay informed, connected, and confident.</span>
              </div>
              <div>
                <strong>Here for you</strong>
                <span>Thank you for visiting. We are committed to delivering a safe, coordinated, and compassionate care experience.</span>
              </div>
            </div>
          </div>

          <div className="video-frame-wrap">
            <iframe
              className="landing-video"
              src="https://www.youtube.com/embed/d4Bg8mkfZiw?autoplay=1&mute=1&controls=1&rel=0"
              title="MediTrack featured hospital video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </section>

        <section className="welcome-brief-grid">
          <article className="info-card">
            <h4>A Better Welcome for Patients and Teams</h4>
            <p>
              Create a stronger first impression with a landing page that explains your hospital system clearly before users sign in.
            </p>
          </article>

          <article className="info-card">
            <h4>Built for Daily Hospital Work</h4>
            <p>
              MediTrack supports the real flow of care delivery, from front-desk intake to doctor documentation and administrative oversight.
            </p>
          </article>
        </section>
      </section>

      <footer className="landing-footer">
        <p>All Rights Reserved @2026 MediTrack.</p>
      </footer>
    </div>
  );
}
