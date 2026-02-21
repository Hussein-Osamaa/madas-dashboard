import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, db } from '../../lib/firebase';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import { useSiteSections } from '../../hooks/useSiteSections';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import NavbarSection from '../../components/builder/sections/NavbarSection';
import FooterSection from '../../components/builder/sections/FooterSection';

const AboutPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [aboutContent, setAboutContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { settings, businessId } = useWebsiteSettings(siteId, null);
  const { navbarSection, footerSection, loading: sectionsLoading } = useSiteSections(siteId, businessId);

  useEffect(() => {
    const loadAboutContent = async () => {
      if (!siteId || !businessId) {
        setLoading(false);
        return;
      }

      try {
        const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
        const siteSnap = await getDoc(siteRef);
        
        if (siteSnap.exists()) {
          const data = siteSnap.data();
          const sections = data.sections || [];
          const aboutSection = sections.find((s: any) => s.type === 'about');
          
          if (aboutSection) {
            setAboutContent(aboutSection.data);
          } else {
            setAboutContent({
              title: 'About Us',
              content: 'Welcome to our company. We are dedicated to providing the best products and services to our customers.'
            });
          }
        }
      } catch (error) {
        console.error('Error loading about content:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadAboutContent();
  }, [siteId, businessId]);

  if (loading || sectionsLoading) {
    return <FullScreenLoader message="Loading..." />;
  }

  const primaryColor = settings.theme.primaryColor;
  const secondaryColor = settings.theme.secondaryColor;
  const backgroundColor = settings.theme.backgroundColor;
  const textColor = settings.theme.textColor;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: backgroundColor,
      color: textColor,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Navbar */}
      {navbarSection && (
        <NavbarSection 
          data={navbarSection.data as any} 
          style={navbarSection.style as any} 
          siteId={siteId}
        />
      )}
      <style>{`
        :root {
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeInUp 0.6s ease-out;
        }
        .value-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .value-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }
      `}</style>

      {/* Hero Section with Parallax Effect */}
      <section style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        color: '#FFFFFF',
        padding: '6rem 1rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 30% 50%, ${secondaryColor}40 0%, transparent 60%)`,
          pointerEvents: 'none'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }} className="fade-in">
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 6vw, 4rem)', 
            fontWeight: '900', 
            margin: 0,
            letterSpacing: '-0.03em',
            textShadow: '0 4px 30px rgba(0,0,0,0.3)'
          }}>
            {aboutContent?.title || 'About Us'}
          </h1>
          <p style={{ 
            marginTop: '1.5rem', 
            fontSize: '1.375rem', 
            opacity: 0.95,
            fontWeight: '300',
            maxWidth: '600px',
            margin: '1.5rem auto 0'
          }}>
            Learn more about our story, mission, and values
          </p>
        </div>
      </section>

      {/* Content Section */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '5rem 1rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
          marginBottom: '6rem'
        }} className="fade-in">
          <div>
            <div
              style={{
                fontSize: '1.1875rem',
                lineHeight: '1.9',
                color: textColor,
                whiteSpace: 'pre-line'
              }}
              dangerouslySetInnerHTML={{ 
                __html: aboutContent?.content || 'Your story here...' 
              }}
            />
          </div>
          <div style={{
            height: '450px',
            background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`,
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            {aboutContent?.image ? (
              <img 
                src={aboutContent.image} 
                alt={aboutContent.title}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '24px'
                }}
              />
            ) : (
              <span className="material-icons" style={{ 
                fontSize: '8rem', 
                color: primaryColor, 
                opacity: 0.15 
              }}>
                image
              </span>
            )}
          </div>
        </div>

        {/* Values Section */}
        <section style={{ 
          marginTop: '6rem', 
          paddingTop: '6rem', 
          borderTop: `2px solid ${primaryColor}20`
        }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: '800',
              marginBottom: '1rem',
              color: primaryColor,
              letterSpacing: '-0.02em'
            }}>
              Our Core Values
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: textColor,
              opacity: 0.7,
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              The principles that guide everything we do
            </p>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            {[
              { 
                icon: 'handshake', 
                title: 'Trust & Integrity', 
                description: 'Building lasting relationships with our customers through transparency and honesty' 
              },
              { 
                icon: 'star', 
                title: 'Quality Excellence', 
                description: 'Delivering excellence in everything we do, never compromising on quality' 
              },
              { 
                icon: 'lightbulb', 
                title: 'Innovation', 
                description: 'Constantly improving and evolving to meet the changing needs of our customers' 
              },
              { 
                icon: 'groups', 
                title: 'Customer First', 
                description: 'Putting our customers at the heart of every decision we make' 
              }
            ].map((value, index) => (
              <div
                key={index}
                className="value-card"
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 2rem',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 1.5rem',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.3s ease'
                }} className="value-icon">
                  <span className="material-icons" style={{
                    fontSize: '2.5rem',
                    color: primaryColor
                  }}>
                    {value.icon}
                  </span>
                </div>
                <style>{`
                  .value-card:hover .value-icon {
                    transform: scale(1.1) rotate(5deg);
                  }
                `}</style>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  color: primaryColor
                }}>
                  {value.title}
                </h3>
                <p style={{ 
                  color: textColor, 
                  opacity: 0.75,
                  lineHeight: '1.7',
                  fontSize: '1rem'
                }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section style={{
          marginTop: '6rem',
          padding: '4rem 2rem',
          background: `linear-gradient(135deg, ${primaryColor}08 0%, ${secondaryColor}08 100%)`,
          borderRadius: '24px',
          border: `1px solid ${primaryColor}15`
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            textAlign: 'center'
          }}>
            {[
              { number: '10K+', label: 'Happy Customers' },
              { number: '500+', label: 'Products' },
              { number: '50+', label: 'Team Members' },
              { number: '15+', label: 'Years Experience' }
            ].map((stat, index) => (
              <div key={index}>
                <div style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: '800',
                  color: primaryColor,
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em'
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '1rem',
                  color: textColor,
                  opacity: 0.7,
                  fontWeight: '500'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      {footerSection && (
        <FooterSection 
          data={footerSection.data as any} 
          style={footerSection.style as any}
          siteId={siteId}
        />
      )}
    </div>
  );
};

export default AboutPage;
