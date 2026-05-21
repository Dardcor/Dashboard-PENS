import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Video, 
  Globe, 
  Eye, 
  Star, 
  Crown, 
  ThumbsUp, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Menu, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Smartphone, 
  MessageCircle,
  ExternalLink 
} from 'lucide-react';

export default function Landing() {
  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sticky header shadow & scroll spy active section
  const [isSticky, setIsSticky] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Hero carousel slide index (0 = Learn Something New, 1 = Bright Future)
  const [activeSlide, setActiveSlide] = useState(0);

  // FAQ Accordion Open States
  // Format: { 'm-0': true, 'd-0': false, ... }
  const [faqStates, setFaqStates] = useState({
    'm-0': false,
    'm-1': false,
    'm-2': false,
    'm-3': false,
    'd-0': false,
    'd-1': false,
    'd-2': false,
  });

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      // Sticky header logic
      if (window.scrollY > 20) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }

      // Scroll Spy logic to highlight active navbar section
      const sections = ['home', 'about', 'services', 'choose-us', 'faq', 'contact'];
      const scrollPosition = window.scrollY + 120; // offset

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto transition hero slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Smooth scroll helper
  const scrollTo = (id) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const offset = 80; // navbar height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Toggle FAQ item helper
  const toggleFaq = (key) => {
    setFaqStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // FAQ Data Lists
  const faqMahasiswa = [
    {
      q: "Apa yang harus dilakukan jika tidak bisa login ke ETHOL karena lupa email dan password ?",
      a: "Jika Anda merupakan Mahasiswa aktif PENS dan mengalami masalah lupa password atau email, silakan melakukan reset melalui layanan Portal Akademik Online MIS PENS atau segera menghubungi Unit Sumber Daya Informasi (USDI) PENS di Gedung D3 Lantai 1 untuk verifikasi identitas dan pemulihan akun."
    },
    {
      q: "Bagaimana jika kuliah saya di semester ini tidak muncul ?",
      a: "Pastikan Anda telah menyelesaikan administrasi daftar ulang (registrasi semester) dan telah melakukan approving Kartu Rencana Studi (KRS) oleh Dosen Wali di MIS PENS. Data mata kuliah di ETHOL disinkronisasi secara berkala dari sistem database MIS utama."
    },
    {
      q: "Bagaimana jika saya tidak dapat melakukan klik pada tombol Presensi saat akan mengikuti perkuliahan online ?",
      a: "Tombol presensi hanya aktif apabila jam perkuliahan terjadwal sudah berjalan dan Dosen Pengampu telah membuka sesi presensi di sistem mereka. Pastikan browser Anda memiliki zona waktu yang sinkron dan silakan lakukan refresh halaman jika jam sudah sesuai."
    },
    {
      q: "Data rekap presensi yang valid apakah yang ada di ETHOL atau Online MIS ?",
      a: "Data rekap presensi resmi dan legal sebagai syarat kelulusan mata kuliah adalah data yang tersimpan di portal Online MIS PENS. ETHOL bertindak sebagai platform pembelajaran sinkron & asinkron yang melakukan integrasi data ke sistem MIS secara otomatis."
    }
  ];

  const faqDosen = [
    {
      q: "Bagaimana cara setting Conference Lainnya ?",
      a: "Ketika dosen membuat jadwal perkuliahan daring di dashboard Dosen, pada pilihan tipe konferensi silakan pilih opsi 'Lainnya'. Dosen kemudian dapat memasukkan tautan (link) eksternal seperti platform Zoom Meeting, Google Meet, Microsoft Teams, atau platform video conference eksternal lainnya yang telah disiapkan."
    },
    {
      q: "Apakah dosen bisa membuka presensi di kuliah yang berbeda dalam waktu bersamaan ?",
      a: "Ya, sistem ETHOL memperbolehkan dosen untuk mengaktifkan sesi kelas dan presensi online secara bersamaan di beberapa kelas paralel yang diajarkan, memudahkan dosen yang memiliki kelas gabungan."
    },
    {
      q: "Data rekap presensi yang valid apakah yang ada di ETHOL atau MIS ?",
      a: "Semua rekap kehadiran mahasiswa yang tercatat secara valid di ETHOL akan disinkronisasikan secara otomatis ke portal utama MIS PENS setelah perkuliahan berakhir untuk digunakan dalam kalkulasi keaktifan akademis mahasiswa."
    }
  ];

  return (
    <div style={{ 
      fontFamily: "'Inter', sans-serif", 
      color: '#2d3748', 
      backgroundColor: '#f8fafc',
      overflowX: 'hidden' 
    }}>
      
      {/* 1. Header & Navigation (Sticky Top-Bar) */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: isSticky ? '1px solid #e2e8f0' : '1px solid transparent',
        boxShadow: isSticky ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' : 'none',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8%',
        transition: 'all 0.3s ease'
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => scrollTo('home')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            cursor: 'pointer' 
          }}
        >
          <img 
            src="/logo.png" 
            alt="ETHOL PENS Logo" 
            style={{ 
              height: '42px', 
              objectFit: 'contain'
            }} 
            onError={(e) => {
              // Fallback text if logo.png is missing or broken
              e.target.style.display = 'none';
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ 
              fontSize: '1.4rem', 
              fontWeight: 800, 
              color: '#0c83c6',
              lineHeight: 1.1,
              letterSpacing: '-0.5px' 
            }}>
              ethol
            </span>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: 600, 
              color: '#4a5568', 
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Hybrid Online Learning
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="desktop-only-nav">
          {[
            { id: 'home', label: 'Home' },
            { id: 'about', label: 'About' },
            { id: 'services', label: 'Services' },
            { id: 'choose-us', label: 'Why Us' },
            { id: 'faq', label: 'FAQ' },
            { id: 'contact', label: 'Contact Us' }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => scrollTo(item.id)} 
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: activeSection === item.id ? 700 : 500,
                color: activeSection === item.id ? '#0c83c6' : '#4a5568',
                cursor: 'pointer',
                padding: '0.5rem 0',
                borderBottom: `2px solid ${activeSection === item.id ? '#0c83c6' : 'transparent'}`,
                transition: 'all 0.2s ease'
              }}
            >
              {item.label}
            </button>
          ))}

          {/* CTA Login Button */}
          <Link 
            to="/login" 
            style={{
              padding: '0.65rem 1.75rem',
              borderRadius: '9999px',
              backgroundColor: '#0c83c6',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 10px rgba(12, 131, 198, 0.3)',
              transition: 'all 0.2s ease',
              display: 'inline-block',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#0b72ad';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 15px rgba(12, 131, 198, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#0c83c6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 10px rgba(12, 131, 198, 0.3)';
            }}
          >
            LOGIN
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#4a5568',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'none', // Controlled by media queries below in stylesheet injection
          }}
          className="mobile-hamburger-btn"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem 8%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            zIndex: 999
          }}>
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About' },
              { id: 'services', label: 'Services' },
              { id: 'choose-us', label: 'Why Us' },
              { id: 'faq', label: 'FAQ' },
              { id: 'contact', label: 'Contact Us' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => scrollTo(item.id)} 
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '1rem',
                  fontWeight: activeSection === item.id ? 700 : 500,
                  color: activeSection === item.id ? '#0c83c6' : '#4a5568',
                  cursor: 'pointer',
                  padding: '0.25rem 0'
                }}
              >
                {item.label}
              </button>
            ))}
            <Link 
              to="/login" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: '#0c83c6',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                textAlign: 'center',
                marginTop: '0.5rem'
              }}
            >
              LOGIN
            </Link>
          </div>
        )}
      </nav>

      {/* Stylesheet injection for responsive layout styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 900px) {
          .desktop-only-nav { display: none !important; }
          .mobile-hamburger-btn { display: block !important; }
          .hero-container { flex-direction: column !important; padding-top: 120px !important; text-align: center !important; }
          .hero-left { padding-right: 0 !important; margin-bottom: 3rem !important; }
          .hero-right { display: flex; justify-content: center !important; width: 100% !important; }
          .hero-mockups { transform: scale(0.8) !important; margin-top: 0 !important; }
          .about-container { flex-direction: column !important; gap: 2rem !important; }
          .about-buttons { justify-content: center !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .choose-cards { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .faq-container { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .contact-container { grid-template-columns: 1fr !important; }
          .footer-container { grid-template-columns: 1fr !important; gap: 2.5rem !important; text-align: center !important; }
          .footer-logo { justify-content: center !important; }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes float-delay {
          0% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
      `}} />

      {/* 2. Hero Section (Slider/Carousel) */}
      <section 
        id="home" 
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0b2e59 0%, #071936 100%)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '120px 8% 80px',
          color: 'white',
          overflow: 'hidden'
        }}
      >
        {/* Background Waves Illustration */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '15%',
          background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1440 320\'%3E%3Cpath fill=\'%23f8fafc\' fill-opacity=\'1\' d=\'M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,122.7C672,128,768,192,864,208C960,224,1056,192,1152,165.3C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z\'%3E%3C/path%3E%3C/svg%3E") no-repeat bottom/cover',
          zIndex: 1
        }} />

        {/* Carousel Content Container */}
        <div 
          className="hero-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            zIndex: 2,
            position: 'relative'
          }}
        >
          {/* SLIDE 0: Learn Something New */}
          {activeSlide === 0 ? (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', flexWrap: 'wrap' }} className="hero-container">
              <div 
                className="hero-left"
                style={{ 
                  flex: '1.2', 
                  paddingRight: '3rem',
                  animation: 'fadeIn 0.6s ease-out forwards'
                }}
              >
                <h4 style={{ 
                  color: '#38bdf8', 
                  fontSize: '1.25rem', 
                  fontWeight: 700, 
                  letterSpacing: '1.5px', 
                  marginBottom: '1rem',
                  textTransform: 'uppercase'
                }}>
                  Learn Something New
                </h4>
                <h1 style={{ 
                  fontSize: '3.2rem', 
                  fontWeight: 900, 
                  color: 'white',
                  lineHeight: 1.15,
                  marginBottom: '1.5rem',
                  letterSpacing: '-1px'
                }}>
                  Every Day,<br/>
                  <span style={{ 
                    color: '#ffa500',
                    textShadow: '0 0 20px rgba(255,165,0,0.3)',
                    WebkitTextStroke: '1px rgba(255,255,255,0.1)'
                  }}>
                    Anywhere Anytime
                  </span>
                </h1>
                <p style={{ 
                  fontSize: '1.1rem', 
                  color: '#94a3b8', 
                  lineHeight: 1.6, 
                  marginBottom: '2.5rem',
                  maxWidth: '560px'
                }}>
                  Enterprise Technology Hybrid Online Learning is a distance education solution created by the PENS developer team. Standardizing classroom management, conference rooms, video playback, and attendance assessments to maximize online studies.
                </p>
                <button
                  onClick={() => scrollTo('about')}
                  style={{
                    padding: '0.85rem 2.25rem',
                    borderRadius: '9999px',
                    backgroundColor: '#0c83c6',
                    border: 'none',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(12, 131, 198, 0.4)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0b72ad';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(12, 131, 198, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#0c83c6';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 14px rgba(12, 131, 198, 0.4)';
                  }}
                >
                  LEARN NOW
                </button>
              </div>

              {/* Right Side Mockup Graphics (Dynamic overlays of student images) */}
              <div 
                className="hero-right"
                style={{ 
                  flex: '1',
                  position: 'relative',
                  height: '420px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Image 1 - Main Floating Student (Thumbs Up) */}
                <div style={{
                  width: '280px',
                  height: '280px',
                  borderRadius: '3rem',
                  background: "url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80') center/cover",
                  border: '6px solid rgba(255,255,255,0.1)',
                  position: 'relative',
                  zIndex: 2,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  animation: 'float 6s ease-in-out infinite'
                }} />

                {/* Image 2 - Overlapping Student (Top Left, Tablet discussion) */}
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '2rem',
                  background: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=300&q=80') center/cover",
                  border: '4px solid rgba(255,255,255,0.15)',
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  zIndex: 1,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                  animation: 'float-delay 5s ease-in-out infinite'
                }} />

                {/* Image 3 - Overlapping Student (Bottom Right, VR headset/Creative) */}
                <div style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '2rem',
                  background: "url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80') center/cover",
                  border: '4px solid rgba(255,255,255,0.15)',
                  position: 'absolute',
                  bottom: '20px',
                  right: '10px',
                  zIndex: 3,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                  animation: 'float 7s ease-in-out infinite'
                }} />
              </div>
            </div>
          ) : (
            /* SLIDE 1: Bright Future / Brand Platform */
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', flexWrap: 'wrap' }} className="hero-container">
              <div 
                className="hero-left"
                style={{ 
                  flex: '1.2', 
                  paddingRight: '3rem',
                  animation: 'fadeIn 0.6s ease-out forwards'
                }}
              >
                <h4 style={{ 
                  color: '#38bdf8', 
                  fontSize: '1.25rem', 
                  fontWeight: 700, 
                  letterSpacing: '1.5px', 
                  marginBottom: '1rem',
                  textTransform: 'uppercase'
                }}>
                  Bright Future
                </h4>
                <h1 style={{ 
                  fontSize: '3.2rem', 
                  fontWeight: 900, 
                  color: 'white',
                  lineHeight: 1.15,
                  marginBottom: '1.5rem',
                  letterSpacing: '-1px'
                }}>
                  Enterprise Technology<br/>
                  <span style={{ color: '#0c83c6' }}>Hybrid Online Learning</span>
                </h1>
                <p style={{ 
                  fontSize: '1.1rem', 
                  color: '#94a3b8', 
                  lineHeight: 1.6, 
                  marginBottom: '2.5rem',
                  maxWidth: '560px'
                }}>
                  Creating premium hybrid learning modules and tools to advance academic advisor dashboard networks, monitoring metrics, scheduling grids, and secure logins for Dosen and Student.
                </p>
                <Link
                  to="/login"
                  style={{
                    padding: '0.85rem 2.25rem',
                    borderRadius: '9999px',
                    backgroundColor: '#0c83c6',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(12, 131, 198, 0.4)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.5px',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0b72ad';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(12, 131, 198, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#0c83c6';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 14px rgba(12, 131, 198, 0.4)';
                  }}
                >
                  ENTER SYSTEM
                </Link>
              </div>

              {/* Slide 2 Logo Graphic */}
              <div 
                className="hero-right"
                style={{ 
                  flex: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {/* Glowing Abstract Circle Behind Logo */}
                <div style={{
                  position: 'absolute',
                  width: '320px',
                  height: '320px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(12,131,198,0.2) 0%, rgba(0,0,0,0) 70%)',
                  zIndex: 1,
                  animation: 'float 5s ease-in-out infinite'
                }} />
                
                {/* CSS Glassmorphic Logo Container */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '2rem',
                  padding: '3rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  width: '280px',
                  height: '280px',
                  justifyContent: 'center',
                  animation: 'float-delay 6s ease-in-out infinite'
                }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <img 
                      src="/logo.png" 
                      alt="ETHOL PENS Logo" 
                      style={{ 
                        height: '75px', 
                        objectFit: 'contain'
                      }} 
                    />
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: 'white', fontWeight: 800 }}>ethol</h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>PENS Academic Platform</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Carousel Navigation Indicators */}
        <div style={{
          position: 'absolute',
          bottom: '12%',
          left: '8%',
          display: 'flex',
          gap: '0.75rem',
          zIndex: 10
        }}>
          <button 
            onClick={() => setActiveSlide(0)}
            style={{
              width: activeSlide === 0 ? '30px' : '10px',
              height: '10px',
              borderRadius: '5px',
              backgroundColor: activeSlide === 0 ? '#0c83c6' : 'rgba(255,255,255,0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
          <button 
            onClick={() => setActiveSlide(1)}
            style={{
              width: activeSlide === 1 ? '30px' : '10px',
              height: '10px',
              borderRadius: '5px',
              backgroundColor: activeSlide === 1 ? '#0c83c6' : 'rgba(255,255,255,0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        {/* Carousel Left/Right Floating Arrows */}
        <button 
          onClick={() => setActiveSlide(prev => (prev === 0 ? 1 : 0))}
          style={{
            position: 'absolute',
            left: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            color: 'white',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={() => setActiveSlide(prev => (prev === 0 ? 1 : 0))}
          style={{
            position: 'absolute',
            right: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            color: 'white',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
        >
          <ChevronRight size={24} />
        </button>
      </section>

      {/* 3. About Section */}
      <section 
        id="about" 
        style={{
          padding: '100px 8%',
          backgroundColor: 'white',
          position: 'relative'
        }}
      >
        <div 
          className="about-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}
        >
          {/* Left Text Column */}
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              color: '#0c83c6', 
              fontSize: '1rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              marginBottom: '0.5rem'
            }}>
              E-Learning Ecosystem
            </h4>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              color: '#0b2e59', 
              marginBottom: '1.5rem',
              lineHeight: 1.2
            }}>
              ETHOL
            </h2>
            <p style={{ 
              fontSize: '1.05rem', 
              color: '#4a5568', 
              lineHeight: 1.7, 
              marginBottom: '1.25rem' 
            }}>
              Enterprise Technology Hybrid Online Learning is a platform that provides an excellent online learning experience for students, with many features and easy to use and has a good user experience.
            </p>
            <p style={{ 
              fontSize: '1.05rem', 
              color: '#4a5568', 
              lineHeight: 1.7, 
              marginBottom: '2rem' 
            }}>
              All learning is neatly arranged, so that students will feel comfortable to study online.
            </p>

            {/* Application Platform Entry Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }} className="about-buttons">
              {/* Mobile App Button */}
              <a 
                href="https://play.google.com/store/apps/details?id=id.ac.pens.ethol" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '2px solid #0c83c6',
                  color: '#0c83c6',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0c83c6';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#0c83c6';
                }}
              >
                <Smartphone size={18} />
                Mobile App
              </a>

              {/* Web Based App Button */}
              <Link 
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  backgroundColor: '#0c83c6',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  border: '2px solid #0c83c6'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0b72ad'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0c83c6'}
              >
                <Globe size={18} />
                Web Based App
              </Link>
            </div>
          </div>

          {/* Right Graphics Column */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
              {/* Main Laptop Mockup representation */}
              <div style={{
                borderRadius: '1rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                background: 'white',
                position: 'relative',
                zIndex: 2
              }}>
                {/* Top browser bar */}
                <div style={{
                  height: '35px',
                  backgroundColor: '#f1f5f9',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1rem',
                  gap: '0.4rem'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  <div style={{
                    backgroundColor: 'white',
                    height: '20px',
                    borderRadius: '4px',
                    flex: 1,
                    marginLeft: '1rem',
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 0.5rem'
                  }}>
                    ethol.pens.ac.id/dashboard
                  </div>
                </div>
                {/* Inner Mockup Image (advisor/dosen monitoring dashboard screenshot reference) */}
                <div style={{
                  height: '240px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ height: '12px', width: '80px', backgroundColor: '#cbd5e1', borderRadius: '6px' }} />
                    <div style={{ height: '24px', width: '24px', backgroundColor: '#0c83c6', borderRadius: '50%' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ height: '8px', width: '100%', backgroundColor: '#cbd5e1', borderRadius: '4px' }} />
                      <div style={{ height: '8px', width: '80%', backgroundColor: '#cbd5e1', borderRadius: '4px' }} />
                      <div style={{ height: '8px', width: '60%', backgroundColor: '#cbd5e1', borderRadius: '4px' }} />
                    </div>
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ height: '10px', width: '40%', backgroundColor: '#94a3b8', borderRadius: '5px' }} />
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px' }} />
                      <div style={{ height: '6px', width: '90%', backgroundColor: '#e2e8f0', borderRadius: '3px' }} />
                      <div style={{ height: '6px', width: '80%', backgroundColor: '#e2e8f0', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative phone overlay representation */}
              <div style={{
                position: 'absolute',
                bottom: '-25px',
                right: '-25px',
                width: '120px',
                height: '240px',
                backgroundColor: '#0f172a',
                border: '4px solid #1e293b',
                borderRadius: '1.5rem',
                zIndex: 3,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ height: '15px', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '4px', backgroundColor: '#334155', borderRadius: '2px' }} />
                </div>
                <div style={{ 
                  flex: 1, 
                  backgroundColor: 'white', 
                  margin: '2px', 
                  borderRadius: '1.25rem',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ height: '20px', width: '20px', borderRadius: '50%', backgroundColor: '#0c83c6' }} />
                  <div style={{ height: '8px', width: '100%', backgroundColor: '#cbd5e1', borderRadius: '4px' }} />
                  <div style={{ height: '8px', width: '80%', backgroundColor: '#cbd5e1', borderRadius: '4px' }} />
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Our Services Section */}
      <section 
        id="services" 
        style={{
          padding: '100px 8%',
          backgroundColor: '#f8fafc',
          position: 'relative'
        }}
      >
        {/* Background Dot grids decoration */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '2%',
          width: '100px',
          height: '200px',
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '15px 15px',
          opacity: 0.5
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
            <h4 style={{ 
              color: '#0c83c6', 
              fontSize: '1rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px',
              marginBottom: '0.5rem'
            }}>
              Core Capabilities
            </h4>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              color: '#0b2e59', 
              marginBottom: '1rem' 
            }}>
              Our Services
            </h2>
            <div style={{ 
              width: '60px', 
              height: '4px', 
              backgroundColor: '#0c83c6', 
              margin: '0 auto', 
              borderRadius: '2px' 
            }} />
          </div>

          {/* Cards Grid */}
          <div 
            className="services-grid"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '2.5rem' 
            }}
          >
            {[
              {
                icon: BookOpen,
                title: "Learning Management System",
                desc: "Our modern, easy to use, mobile friendly learning management system will be your loyal friend while you study."
              },
              {
                icon: Video,
                title: "Online learning Video for Students",
                desc: "Our millions video are available for you to be accessed anytime and anywhere. You can choose your own pace."
              },
              {
                icon: Globe,
                title: "Conference Synchronous Learning",
                desc: "Students and Teachers will be able to communicate and discuss various topics through our video conference facilities."
              },
              {
                icon: Eye,
                title: "Monitoring of Learning Effectiveness",
                desc: "Teachers and Admins can see monitoring of student activities while studying online."
              }
            ].map((srv, index) => (
              <div 
                key={index}
                style={{
                  background: 'linear-gradient(to bottom, #eefbf8, #e7f7f9)',
                  border: '1px solid rgba(12, 131, 198, 0.1)',
                  borderRadius: '1.5rem',
                  padding: '2.5rem',
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'flex-start',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer'
                }}
                className="service-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(12, 131, 198, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(12, 131, 198, 0.1)';
                }}
              >
                {/* Round Icon Box */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0c83c6',
                  flexShrink: 0,
                  boxShadow: '0 10px 15px -3px rgba(12, 131, 198, 0.1)'
                }}>
                  <srv.icon size={28} />
                </div>

                {/* Content Block */}
                <div>
                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 700, 
                    color: '#0b2e59',
                    marginBottom: '0.75rem'
                  }}>
                    {srv.title}
                  </h3>
                  <p style={{ 
                    color: '#4a5568', 
                    lineHeight: 1.6,
                    fontSize: '0.95rem'
                  }}>
                    {srv.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Why Choose Us (Stats & Campus Photo Banner) */}
      <section 
        id="choose-us" 
        style={{
          position: 'relative',
          padding: '120px 8%',
          backgroundImage: "linear-gradient(rgba(11, 46, 89, 0.88), rgba(7, 25, 54, 0.93)), url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          color: 'white',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section Title */}
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            marginBottom: '4.5rem',
            letterSpacing: '-0.5px'
          }}>
            Why You Should Choose Us
          </h2>

          {/* Stat Cards Row */}
          <div 
            className="choose-cards"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2.5rem',
              marginBottom: '4rem'
            }}
          >
            {[
              {
                icon: Star,
                title: "#1 Polytechnic",
                desc: "Ranked as the number one vocational Polytechnic institution in Indonesia for academic quality."
              },
              {
                icon: Crown,
                title: "Distance Learning Pioneer",
                desc: "Decades of expertise as the premier distance e-learning pioneers in Southeast Asia."
              },
              {
                icon: ThumbsUp,
                title: "Best Quality Infrastructure",
                desc: "High bandwidth, robust local servers, and interactive web tools for seamless learning."
              }
            ].map((card, idx) => (
              <div 
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '1.5rem',
                  padding: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                {/* Glowing Icon Circle */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(12, 131, 198, 0.2)',
                  border: '1px solid rgba(12, 131, 198, 0.4)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <card.icon size={26} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 700, marginBottom: '1rem' }}>
                  {card.title}
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom paragraph overlay */}
          <p style={{
            fontSize: '1.15rem',
            color: '#e2e8f0',
            lineHeight: 1.7,
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            We are the number one Polytechnic in Indonesia and we have long experiences in distance educations. Our students spread all over Indonesia and even abroad like in Taiwan.
          </p>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section 
        id="faq" 
        style={{
          padding: '100px 8%',
          backgroundColor: 'white'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h4 style={{ 
              color: '#0c83c6', 
              fontSize: '1rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px',
              marginBottom: '0.5rem'
            }}>
              Have Questions?
            </h4>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              color: '#0b2e59', 
              marginBottom: '1rem' 
            }}>
              Frequently Asked Questions
            </h2>
            <div style={{ 
              width: '60px', 
              height: '4px', 
              backgroundColor: '#0c83c6', 
              margin: '0 auto', 
              borderRadius: '2px' 
            }} />
          </div>

          {/* Dual Column Accordion */}
          <div 
            className="faq-container"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3rem'
            }}
          >
            {/* Column 1: MAHASISWA FAQ */}
            <div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#0b2e59',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '0.5rem'
              }}>
                <Smartphone size={22} style={{ color: '#0c83c6' }} />
                Mahasiswa (Student)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {faqMahasiswa.map((item, idx) => {
                  const key = `m-${idx}`;
                  const isOpen = faqStates[key];
                  return (
                    <div 
                      key={key}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        backgroundColor: isOpen ? '#f8fafc' : 'white',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {/* Accordion Trigger Header */}
                      <button
                        onClick={() => toggleFaq(key)}
                        style={{
                          width: '100%',
                          padding: '1.25rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          cursor: 'pointer',
                          color: '#0b2e59',
                          fontWeight: 600,
                          fontSize: '0.95rem'
                        }}
                      >
                        <span>{item.q}</span>
                        {isOpen ? <ChevronUp size={18} style={{ flexShrink: 0, color: '#0c83c6' }} /> : <ChevronDown size={18} style={{ flexShrink: 0, color: '#94a3b8' }} />}
                      </button>

                      {/* Expandable Body */}
                      <div style={{
                        maxHeight: isOpen ? '300px' : '0px',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0, 1, 0, 1)',
                        borderTop: isOpen ? '1px solid #e2e8f0' : '1px solid transparent'
                      }}>
                        <p style={{
                          padding: '1.25rem',
                          fontSize: '0.9rem',
                          color: '#4a5568',
                          lineHeight: 1.6
                        }}>
                          {item.a}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: DOSEN FAQ */}
            <div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#0b2e59',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '0.5rem'
              }}>
                <BookOpen size={22} style={{ color: '#0c83c6' }} />
                Dosen (Lecturer)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {faqDosen.map((item, idx) => {
                  const key = `d-${idx}`;
                  const isOpen = faqStates[key];
                  return (
                    <div 
                      key={key}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        backgroundColor: isOpen ? '#f8fafc' : 'white',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {/* Accordion Trigger Header */}
                      <button
                        onClick={() => toggleFaq(key)}
                        style={{
                          width: '100%',
                          padding: '1.25rem',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          cursor: 'pointer',
                          color: '#0b2e59',
                          fontWeight: 600,
                          fontSize: '0.95rem'
                        }}
                      >
                        <span>{item.q}</span>
                        {isOpen ? <ChevronUp size={18} style={{ flexShrink: 0, color: '#0c83c6' }} /> : <ChevronDown size={18} style={{ flexShrink: 0, color: '#94a3b8' }} />}
                      </button>

                      {/* Expandable Body */}
                      <div style={{
                        maxHeight: isOpen ? '300px' : '0px',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0, 1, 0, 1)',
                        borderTop: isOpen ? '1px solid #e2e8f0' : '1px solid transparent'
                      }}>
                        <p style={{
                          padding: '1.25rem',
                          fontSize: '0.9rem',
                          color: '#4a5568',
                          lineHeight: 1.6
                        }}>
                          {item.a}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Contact Us Section */}
      <section 
        id="contact" 
        style={{
          padding: '100px 8%',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h4 style={{ 
              color: '#0c83c6', 
              fontSize: '1rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px',
              marginBottom: '0.5rem'
            }}>
              Get In Touch
            </h4>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              color: '#0b2e59', 
              marginBottom: '1rem' 
            }}>
              Contact Us
            </h2>
            <div style={{ 
              width: '60px', 
              height: '4px', 
              backgroundColor: '#0c83c6', 
              margin: '0 auto', 
              borderRadius: '2px' 
            }} />
          </div>

          {/* Content Columns: Google Maps vs Contact Cards */}
          <div 
            className="contact-container"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '3rem',
              alignItems: 'start'
            }}
          >
            {/* Left Column: Embed Google Map */}
            <div style={{
              borderRadius: '1.5rem',
              overflow: 'hidden',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              height: '450px'
            }}>
              <iframe
                title="PENS Campus Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3957.691978250953!2d112.79156701476906!3d-7.275847094748366!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fabb80a65383%3A0x6b81d7c49b01dc74!2sPoliteknik%20Elektronika%20Negeri%20Surabaya!5e0!3m2!1sid!2sid!4v1655938837130!5m2!1sid!2sid"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Right Column: Contact info details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Address card */}
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.5rem',
                display: 'flex',
                gap: '1rem'
              }}>
                <MapPin size={28} style={{ color: '#0c83c6', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: '#0b2e59', marginBottom: '0.25rem' }}>Address</h4>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Politeknik Elektronika Negeri Surabaya. Kampus, Jl. Raya ITS, Keputih, Kec. Sukolilo, Kota Surabaya, Jawa Timur 60111
                  </p>
                </div>
              </div>

              {/* Email & Phone Card */}
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.5rem',
                display: 'flex',
                gap: '1rem'
              }}>
                <Phone size={24} style={{ color: '#0c83c6', flexShrink: 0 }} />
                <div style={{ width: '100%' }}>
                  <h4 style={{ fontWeight: 700, color: '#0b2e59', marginBottom: '0.5rem' }}>Contacts</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem' }}>
                    <a href="mailto:info@pens.ac.id" style={{ color: '#0c83c6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail size={16} /> info@pens.ac.id
                    </a>
                    <a href="mailto:humas@pens.ac.id" style={{ color: '#0c83c6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail size={16} /> humas@pens.ac.id
                    </a>
                    <a href="tel:+62315947280" style={{ color: '#4a5568', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Phone size={14} /> +62 31 594 7280
                    </a>
                  </div>
                </div>
              </div>

              {/* Clock Work Hours card */}
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.5rem',
                display: 'flex',
                gap: '1rem'
              }}>
                <Clock size={24} style={{ color: '#0c83c6', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: '#0b2e59', marginBottom: '0.25rem' }}>Service Hours</h4>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Monday - Friday: 08:00 AM - 04:00 PM WIB (Service & Academic Admins)
                  </p>
                </div>
              </div>

              {/* USBJJ Call-To-Action Container */}
              <div style={{
                background: 'linear-gradient(135deg, #0b2e59 0%, #071936 100%)',
                color: 'white',
                borderRadius: '1.25rem',
                padding: '2rem',
                boxShadow: '0 10px 20px rgba(7, 25, 54, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginTop: '0.5rem'
              }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Request to Join as USBJJ?</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Follow instructions to connect your local vocational campus, manage hybrid classes and synchronizations.
                </p>
                <a 
                  href="https://ethol.pens.ac.id/usbjj/" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.color = '#0b2e59';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'white';
                  }}
                >
                  Instruction <ExternalLink size={14} />
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer Section */}
      <footer 
        style={{
          backgroundColor: '#3d3d3d',
          color: '#cbd5e1',
          padding: '80px 8% 40px',
          borderTop: '5px solid #0c83c6'
        }}
      >
        <div 
          className="footer-container"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            gap: '4rem',
            maxWidth: '1200px',
            margin: '0 auto',
            marginBottom: '4rem'
          }}
        >
          {/* Column 1: Logo & details */}
          <div>
            <div 
              className="footer-logo"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}
            >
              <img 
                src="/logo.png" 
                alt="Logo white" 
                style={{ 
                  height: '40px',
                  filter: 'brightness(0) invert(1)' 
                }} 
              />
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                ethol
              </span>
            </div>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: '#a0aec0',
              maxWidth: '380px'
            }}>
              Enterprise Technology Hybrid Online Learning is a platform that provides an excellent online learning experience for students, managed by Politeknik Elektronika Negeri Surabaya.
            </p>
          </div>

          {/* Column 2: Our Links */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'white',
              marginBottom: '1.5rem',
              position: 'relative',
              paddingBottom: '0.5rem'
            }}>
              Our Links
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '30px',
                height: '2px',
                backgroundColor: '#0c83c6'
              }} />
            </h4>
            <ul style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.9rem',
              padding: 0
            }}>
              {[
                { label: 'PENS Website', url: 'https://www.pens.ac.id' },
                { label: 'Students', url: 'https://student.pens.ac.id/' },
                { label: 'Lectures', url: 'https://lecturer.pens.ac.id/' },
                { label: 'Online MIS', url: 'https://online.mis.pens.ac.id/' },
                { label: 'PENS Editorial', url: 'https://editorial.pens.ac.id/' },
                { label: 'Virtual Tour', url: 'https://vt.pens.ac.id/' }
              ].map((link, idx) => (
                <li key={idx}>
                  <a 
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#a0aec0',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#0c83c6'}
                    onMouseLeave={(e) => e.target.style.color = '#a0aec0'}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Internal Navigation Anchor Links */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'white',
              marginBottom: '1.5rem',
              position: 'relative',
              paddingBottom: '0.5rem'
            }}>
              Internal Links
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '30px',
                height: '2px',
                backgroundColor: '#0c83c6'
              }} />
            </h4>
            <ul style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.9rem',
              padding: 0
            }}>
              {[
                { label: 'Home', id: 'home' },
                { label: 'About', id: 'about' },
                { label: 'Services', id: 'services' },
                { label: 'Why Choose Us', id: 'choose-us' },
                { label: 'FAQ', id: 'faq' },
                { label: 'Contact Us', id: 'contact' }
              ].map((link, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => scrollTo(link.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a0aec0',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      padding: 0,
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#0c83c6'}
                    onMouseLeave={(e) => e.target.style.color = '#a0aec0'}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div style={{
          borderTop: '1px solid #4a5568',
          paddingTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.85rem',
          color: '#718096',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <p>© 2026 ETHOL Dev Team - PENS. All Rights Reserved.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <p>Made with ❤ in Surabaya</p>
          </div>
        </div>
      </footer>

      {/* 9. Floating WhatsApp Customer Support Widget (Bottom-Left) */}
      <a
        href="https://wa.me/+6281331028783"
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '30px',
          backgroundColor: '#25D366',
          color: 'white',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(37, 211, 102, 0.4)',
          zIndex: 9999,
          textDecoration: 'none',
          animation: 'pulse-green 2s infinite',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-3px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
        }}
      >
        <MessageCircle size={32} fill="white" style={{ color: '#25D366' }} />
      </a>

    </div>
  );
}
