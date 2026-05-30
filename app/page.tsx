import Link from 'next/link';
import styles from './css/landing.module.css';
import { BookOpen, Video, Users, Activity, Award, Globe, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="ETHOL Logo" className={styles.logoImage} />
          <span className={styles.logoSubtitle}>Enterprise Technology Hybrid Online Learning</span>
        </div>
        
        <div className={styles.navLinks}>
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact Us</a>
        </div>
        
        <div>
          <Link href="/login" className={styles.btnLogin}>Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h4 className={styles.heroSubtitle}>Bright Future</h4>
            <h1 className={styles.heroTitle}>
              Learn Something New <br/>
              <span className={styles.heroTitleHighlight}>Every Day, Anywhere Anytime</span>
            </h1>
            <p className={styles.heroDesc}>
              The official digital learning platform of PENS to support asynchronous & synchronous hybrid learning.
            </p>
            <button className={styles.btnLearn}>Learn Now</button>
          </div>
          
          <div className={styles.heroGraphic}>
            <div className={styles.blob}></div>
            <div className={styles.graphicContainer}>
              <div className={styles.badgeLogo1}>
                <img src="/logo.png" alt="ETHOL Logo" className={styles.logoImage} />
              </div>
              <div className={styles.badgeLogo2}>
                PENS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className={styles.services}>
        <div className={styles.servicesContainer}>
          <div className={styles.servicesLeft}>
            <div className={styles.dottedPattern}></div>
            <div className={styles.servicesBadges}>
              <div className={styles.serviceBadgeBig} style={{ color: '#0D8ECF' }}>ETHOL</div>
              <div className={styles.serviceBadgeBig} style={{ color: '#E67E22' }}>PENS</div>
            </div>
          </div>
          
          <div className={styles.servicesRight}>
            <div className={styles.serviceItem}>
              <div className={styles.serviceIcon}><BookOpen size={24} /></div>
              <div>
                <h3 className={styles.serviceItemTitle}>Learning Management System</h3>
                <p className={styles.serviceItemDesc}>Our modern, easy to use, mobile friendly learning management system will be your loyal friend while you study.</p>
              </div>
            </div>
            
            <div className={styles.serviceItem}>
              <div className={styles.serviceIcon}><Video size={24} /></div>
              <div>
                <h3 className={styles.serviceItemTitle}>Online learning Video for Students</h3>
                <p className={styles.serviceItemDesc}>Our millions video are available for you to be accessed anytime and anywhere. You can choose your own pace.</p>
              </div>
            </div>
            
            <div className={styles.serviceItem}>
              <div className={styles.serviceIcon}><Users size={24} /></div>
              <div>
                <h3 className={styles.serviceItemTitle}>Conference Synchronous Learning</h3>
                <p className={styles.serviceItemDesc}>Students and Teachers will be able to communicate and discuss various topics through our video conference facilities.</p>
              </div>
            </div>
            
            <div className={styles.serviceItem}>
              <div className={styles.serviceIcon}><Activity size={24} /></div>
              <div>
                <h3 className={styles.serviceItemTitle}>Monitoring of Learning Effectiveness</h3>
                <p className={styles.serviceItemDesc}>Teachers and Admins can see monitoring of student activities while studying online.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why You Should Choose Us Section */}
      <section className={styles.whyChooseUs}>
        <div className={styles.whyOverlay}></div>
        <div className={styles.whyContainer}>
          <div className={styles.whyHeader}>
            <h2>Why You Should</h2>
            <span>Choose Us</span>
          </div>
          
          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <div className={styles.whyCardIcon}><Award size={32} /></div>
              <h3 className={styles.whyCardTitle}>#1 Polytechnic in Indonesia</h3>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyCardIcon}><Globe size={32} /></div>
              <h3 className={styles.whyCardTitle}>Pioneer of Distance Learning</h3>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyCardIcon}><ShieldCheck size={32} /></div>
              <h3 className={styles.whyCardTitle}>Best Quality for Online Learning</h3>
            </div>
          </div>
          
          <p className={styles.whyDesc}>
            We are the number one Polytechnic in Indonesia and we have long experiences in distance educations. our students spread all over Indonesia and even abroad like in Taiwan.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.faqContainer}>
          <div className={styles.faqHeader}>
            <h2>FAQ</h2>
            <div className={styles.headingUnderline}></div>
          </div>
          
          <div className={styles.faqList}>
            <div className={styles.faqItem}>
              <h4>Apa yang harus dilakukan jika tidak bisa login ke ETHOL karena lupa email dan password ?</h4>
            </div>
            <div className={styles.faqItem}>
              <h4>Bagaimana jika kuliah saya di semester ini tidak muncul ?</h4>
            </div>
            <div className={styles.faqItem}>
              <h4>Bagaimana jika saya tidak dapat melakukan klik pada tombol Presensi saat akan mengikuti perkuliahan online ?</h4>
            </div>
            <div className={styles.faqItem}>
              <h4>Data rekap presensi yang valid apakah yang ada di ETHOL atau Online MIS ?</h4>
            </div>
            <div className={styles.faqItem}>
              <h4>Bagaimana cara setting Conference Lainnya ?</h4>
            </div>
            <div className={styles.faqItem}>
              <h4>Apakah dosen bisa membuka presensi di kuliah yang berbeda dalam waktu bersamaan ?</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactContainer}>
          <div className={styles.contactInfo}>
            <div className={styles.contactHeader}>
              <h2>Contact Us</h2>
              <div className={styles.headingUnderline}></div>
            </div>
            
            <h3 className={styles.contactCampus}>Politeknik Elektronika Negeri Surabaya.</h3>
            <p className={styles.contactDetail}>Kampus, Jl. Raya ITS, Keputih, Kec. Sukolilo, Kota Surabaya, Jawa Timur 60111</p>
            <p className={styles.contactDetail}>info@pens.ac.id<br/>humas@pens.ac.id<br/>+62 31 594 7280</p>
            <p className={styles.contactDetail}>Available from Monday-Friday at 08:00-16:00 local time</p>
          </div>
          
          <div className={styles.contactAction}>
            <h3>Request for Join as USBJJ ?</h3>
            <p>Follow the instruction bellow</p>
            <a href="https://ethol.pens.ac.id/usbjj/" className={styles.btnInstruction}>Instruction »</a>
            <p className={styles.contactSubDesc}>
              Enterprise Technology Hybrid Online Learning is a platform that provides an excellent online learning experience for students, with many features and easy to use and has a good user experience.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerUpper}>
          <div className={styles.footerCol1}>
            <img src="/logo.png" alt="ETHOL Logo" className={styles.logoImageFooter} />
            <p className={styles.footerDesc}>
              Enterprise Technology Hybrid Online Learning is a platform that provides an excellent online learning experience for students, with many features and easy to use and has a good user experience.
            </p>
          </div>
          
          <div className={styles.footerCol2}>
            <h4 className={styles.footerColTitle}>Our Links</h4>
            <ul className={styles.footerLinks}>
              <li><a href="https://www.pens.ac.id">• PENS Website</a></li>
              <li><a href="https://student.pens.ac.id/">• Students</a></li>
              <li><a href="https://lecturer.pens.ac.id/">• Lectures</a></li>
              <li><a href="https://online.mis.pens.ac.id/">• Online MIS</a></li>
              <li><a href="http://redaksi.pens.ac.id/">• PENS Editorial</a></li>
              <li><a href="http://virtualtour.pens.ac.id/">• Virtual Tour</a></li>
            </ul>
          </div>
          
          <div className={styles.footerCol3}>
            <h4 className={styles.footerColTitle}>Internal Links</h4>
            <ul className={styles.footerLinks}>
              <li><a href="#services">• Services</a></li>
              <li><a href="#about">• About</a></li>
              <li><a href="#contact">• Contact Us</a></li>
              <li><a href="#faq">• FAQ</a></li>
            </ul>
          </div>
        </div>
        
        <div className={styles.footerLower}>
          <div className={styles.footerLowerContainer}>
            <span>Made with ❤ in Surabaya</span>
            <span>© 2026 ETHOL Dev Team. All Right Reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
