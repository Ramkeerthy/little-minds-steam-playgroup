import { useEffect, useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import './App.css';

const fallbackSessions = [
  {
    id: 'steam-mix-01',
    title: 'Topic: Learning & Learning',
    date: 'Nov 20-24',
    time: '10:00 AM - 11:00 AM',
    subtitle: 'November: 3-2 Base',
    status: 'Available slots',
    highlights: ['Hands-on experiments', 'Sensory play', 'Simple engineering'],
    bookingUrl: 'https://calendly.com/',
  },
  {
    id: 'steam-mix-02',
    title: 'Topic: Bonanoris',
    date: 'Nov 27-Dec 1',
    time: '11:30 AM - 12:30 PM',
    subtitle: 'November: 5-2 Puzzles',
    status: 'Available slots',
    highlights: ['Block engineering', 'Pattern making', 'Fine motor play'],
    bookingUrl: 'https://calendly.com/',
  },
  {
    id: 'steam-mix-03',
    title: 'Topic: Learning & Learning',
    date: 'Nov 23-Dec 3',
    time: '9:30 AM - 10:30 AM',
    subtitle: 'November: 3-2 Base',
    status: 'Available slots',
    highlights: ['Balance and motion', 'Simple physics', 'Music and rhythm'],
    bookingUrl: 'https://calendly.com/',
  },
];

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

function App() {
  const [sessions, setSessions] = useState(fallbackSessions);
  const [selectedSession, setSelectedSession] = useState(fallbackSessions[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostalCheck, setShowPostalCheck] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [postalStatus, setPostalStatus] = useState({ eligible: false, message: '' });
  const [serviceAreaConfig, setServiceAreaConfig] = useState({
    center: { lat: 42.9872, lng: -81.2496 },
    radiusKm: 5,
    countryCode: 'CA',
    fallbackPostalPrefixes: ['N6E'],
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/eligibility-config.json');
        if (response.ok) {
          const config = await response.json();
          if (config?.center && config.radiusKm) {
            setServiceAreaConfig(config);
          }
        }
      } catch (error) {
        console.warn('Unable to load eligibility config, using default values.', error);
      }
    };

    const loadSessions = async () => {
      try {
        const response = await fetch('/sessions.json');
        if (!response.ok) {
          throw new Error('Unable to load sessions');
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data);
          setSelectedSession(data[0]);
        }
      } catch (error) {
        setSessions(fallbackSessions);
        setSelectedSession(fallbackSessions[0]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
    loadSessions();
  }, []);

  const geocodePostalCode = async (postalCodeValue) => {
    const normalized = postalCodeValue.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!normalized) {
      return null;
    }

    try {
      const countryCode = (serviceAreaConfig.countryCode || 'CA').toLowerCase();
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=${countryCode}&postalcode=${encodeURIComponent(normalized)}&limit=1`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        return null;
      }

      const results = await response.json();
      const match = results?.[0];

      if (!match || !match.lat || !match.lon) {
        return null;
      }

      return {
        lat: Number(match.lat),
        lng: Number(match.lon),
      };
    } catch (error) {
      console.warn('Postal code lookup failed.', error);
      return null;
    }
  };

  const validatePostalCode = async (postalCodeValue) => {
    const normalized = postalCodeValue.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (!normalized) {
      return { eligible: false, message: 'Please enter your postal code to check eligibility.' };
    }

    const geocode = await geocodePostalCode(normalized);
    if (geocode) {
      const distanceKm = getDistanceKm(
        serviceAreaConfig.center.lat,
        serviceAreaConfig.center.lng,
        geocode.lat,
        geocode.lng,
      );

      if (distanceKm <= serviceAreaConfig.radiusKm) {
        return {
          eligible: true,
          message: `Your postcode is within ${serviceAreaConfig.radiusKm} km of the service area. Redirecting to registration...`,
        };
      }

      return {
        eligible: false,
        message: `This postcode is outside the ${serviceAreaConfig.radiusKm} km service area for this playgroup.`,
      };
    }

    const prefixMatches = (serviceAreaConfig.fallbackPostalPrefixes || []).some((prefix) =>
      normalized.toUpperCase().startsWith(prefix.toUpperCase()),
    );

    if (prefixMatches) {
      return {
        eligible: true,
        message: `This postcode matches the configured local area and is eligible for registration.`,
      };
    }

    return {
      eligible: false,
      message: `This postcode is outside the ${serviceAreaConfig.radiusKm} km service area for this playgroup.`,
    };
  };

  const handleRegisterClick = () => {
    setShowPostalCheck(true);
    setPostalStatus({ eligible: false, message: '' });
    setPostalCode('');
  };

  const handlePostalSubmit = async (event) => {
    event.preventDefault();
    const result = await validatePostalCode(postalCode);
    setPostalStatus(result);

    if (!result.eligible) {
      return;
    }

    setTimeout(() => {
      setShowPostalCheck(false);
      window.open(selectedSession?.bookingUrl || 'https://calendly.com/', '_blank', 'noopener,noreferrer');
    }, 500);
  };

  return (
    <Box className="page-shell">
      <Container maxWidth="xl" className="page-container">
        <Box className="topbar">
          <Box className="brand-wrap">
            <Box className="brand-icon">
              <span className="gear gear-one" />
              <span className="gear gear-two" />
              <span className="gear gear-three" />
            </Box>
            <Typography variant="h3" className="brand-name">
              TINY THINKERS CLUB
            </Typography>
          </Box>

          <Box className="main-nav">
            <a href="#home">HOME</a>
            <a href="#sessions">PROGRAMS</a>
            <a href="#about">ABOUT</a>
            <a href="#contact">CONTACT</a>
          </Box>

        </Box>

        <Box id="home" className="hero-section">
          <Box className="hero-copy">
            <Typography className="hero-tagline">Little hands, big discoveries!</Typography>
            <Typography variant="h1" className="hero-heading">Welcome to Tiny Tinkerers Club</Typography>
            <Typography className="hero-subheadline">
              A free, cozy neighborhood playgroup where toddlers and early preschoolers (ages 2–4.5) explore, build, and make friends through hands-on Science, Technology, Engineering, Arts, and Math.
            </Typography>

            <Box className="hero-highlights">
              <Box className="hero-highlight-item">
                <Typography className="highlight-label">Age Group</Typography>
                <Typography className="highlight-text">Ages 2 to 4.5</Typography>
              </Box>
              <Box className="hero-highlight-item">
                <Typography className="highlight-label">Group Size</Typography>
                <Typography className="highlight-text">Strictly capped at 4 kids</Typography>
              </Box>
              <Box className="hero-highlight-item">
                <Typography className="highlight-label">Cost</Typography>
                <Typography className="highlight-text">100% free community initiative</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="bottom-grid" id="sessions">
          <Box className="sessions-panel">
            <Typography variant="h4" className="panel-title">
              SESSION DATES &amp; TOPICS
            </Typography>

            <Box className="session-list">
              {isLoading ? (
                <Typography>Loading sessions...</Typography>
              ) : (
                sessions.map((session) => (
                  <Box className="session-card-group" key={session.id}>
                    <Box
                      className={`session-item ${selectedSession?.id === session.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSession(session)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedSession(session);
                        }
                      }}
                    >
                      <Box className="session-main">
                        <Typography className="session-topic">{session.title}</Typography>
                        <Typography className="session-date">{session.date}</Typography>
                        <Typography className="session-time">{session.time}</Typography>
                      </Box>
                    </Box>

                    {selectedSession?.id === session.id && (
                      <Box className="mobile-session-detail">
                        <Box className="detail-card mobile-detail-card">
                          <Typography className="detail-title">{selectedSession?.title}</Typography>
                          <Typography className="detail-date">{selectedSession?.date}</Typography>
                          <Typography className="detail-time">{selectedSession?.time}</Typography>

                          {selectedSession?.highlights?.length > 0 && (
                            <Box className="detail-tags">
                              {selectedSession.highlights.map((tag) => (
                                <Box component="span" className="detail-tag" key={tag}>
                                  {tag}
                                </Box>
                              ))}
                            </Box>
                          )}

                          <Box className="detail-info-box">
                            <Typography className="detail-label">Theme</Typography>
                            <Typography className="detail-value">STEAM Play &amp; Discovery</Typography>
                          </Box>

                          <Box className="detail-info-box">
                            <Typography className="detail-label">Age group</Typography>
                            <Typography className="detail-value">Toddlers 2.5 to 4 years</Typography>
                          </Box>

                          <Box className="detail-info-box">
                            <Typography className="detail-label">What children will do</Typography>
                            <Typography className="detail-value">
                              Hands-on building, sensory play, storytelling, early science exploration, and creative movement.
                            </Typography>
                          </Box>

                          <Button className="primary-btn register-btn detail-btn" onClick={handleRegisterClick}>
                            REGISTER NOW
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>

          <Box className="session-detail-panel">
            <Typography variant="h4" className="panel-title">
              PROGRAM DETAILS
            </Typography>

            <Box className="detail-card">
              <Typography className="detail-title">{selectedSession?.title}</Typography>
              <Typography className="detail-date">{selectedSession?.date}</Typography>
              <Typography className="detail-time">{selectedSession?.time}</Typography>

              {selectedSession?.highlights?.length > 0 && (
                <Box className="detail-tags">
                  {selectedSession.highlights.map((tag) => (
                    <Box component="span" className="detail-tag" key={tag}>
                      {tag}
                    </Box>
                  ))}
                </Box>
              )}

              <Box className="detail-info-box">
                <Typography className="detail-label">Theme</Typography>
                <Typography className="detail-value">STEAM Play &amp; Discovery</Typography>
              </Box>

              <Box className="detail-info-box">
                <Typography className="detail-label">Age group</Typography>
                <Typography className="detail-value">Toddlers 2.5 to 4 years</Typography>
              </Box>

              <Box className="detail-info-box">
                <Typography className="detail-label">What children will do</Typography>
                <Typography className="detail-value">
                  Hands-on building, sensory play, storytelling, early science exploration, and creative movement.
                </Typography>
              </Box>

              <Button className="primary-btn register-btn detail-btn" onClick={handleRegisterClick}>
                REGISTER NOW
              </Button>
            </Box>
          </Box>
        </Box>

        {showPostalCheck && (
          <Box className="postal-modal-overlay" onClick={() => setShowPostalCheck(false)}>
            <Box className="postal-modal" onClick={(event) => event.stopPropagation()}>
              <Typography className="postal-title">Check your eligibility</Typography>
              <Typography className="postal-description">
                Enter your postal code to confirm you are within 5 km of our neighborhood playgroup before we reserve a spot.
              </Typography>

              <Box component="form" onSubmit={handlePostalSubmit} className="postal-form">
                <input
                  type="text"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  placeholder="Enter postal code"
                  className="postal-input"
                />

                {postalStatus.message && (
                  <Typography className={`postal-message ${postalStatus.eligible ? 'success' : 'error'}`}>
                    {postalStatus.message}
                  </Typography>
                )}

                <Box className="postal-actions">
                  <Button type="button" className="secondary-btn postal-cancel" onClick={() => setShowPostalCheck(false)}>
                    CANCEL
                  </Button>
                  <Button type="submit" className="primary-btn register-btn postal-submit">
                    CHECK
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <Box id="about" className="about-section">
          <Typography variant="h4" className="panel-title about-title">ABOUT</Typography>

          <Box className="about-story-block">
            <Typography className="about-text">
              Every great adventure starts with a curious child. Our son <strong>Viaan</strong> began attending monthly library STEAM sessions when he was just 8 months old. We fell completely in love with how he engaged, experimented, and lit up with every new sensory experience and block tower.
            </Typography>
            <Typography className="about-text">
              Now at 2.5 years old, we wanted to expand that magic. Created by Alekhya and family, <strong>Tiny Tinkerers Club</strong> is a warm, welcoming home playgroup designed for children ages 2 to 4.5 and their parents to explore, learn, and build lasting friendships together.
            </Typography>
          </Box>

          <Box className="about-subsection">
            <Typography variant="h5" className="about-subheading">Our Philosophy &amp; Learning Pillars</Typography>
            <Box className="pillars-grid">
              <Box className="pillar-card">
                <Typography className="pillar-icon">🔬</Typography>
                <Typography className="pillar-title">Science &amp; Sensory</Typography>
                <Typography className="pillar-text">Safe, taste-safe experiments like color mixing, water play, and texture exploration.</Typography>
              </Box>
              <Box className="pillar-card">
                <Typography className="pillar-icon">🧱</Typography>
                <Typography className="pillar-title">Engineering &amp; Building</Typography>
                <Typography className="pillar-text">Large blocks, foam towers, and simple cause-and-effect structures.</Typography>
              </Box>
              <Box className="pillar-card">
                <Typography className="pillar-icon">🎨</Typography>
                <Typography className="pillar-title">Art &amp; Expression</Typography>
                <Typography className="pillar-text">Finger-painting, tactile crafts, and creative freedom.</Typography>
              </Box>
              <Box className="pillar-card">
                <Typography className="pillar-icon">🔢</Typography>
                <Typography className="pillar-title">Math Through Play</Typography>
                <Typography className="pillar-text">Sorting, counting objects, and spatial awareness naturally woven into play.</Typography>
              </Box>
            </Box>
          </Box>

          <Box className="about-subsection">
            <Typography variant="h5" className="about-subheading">Why a Small Group (Max 4 Kids)?</Typography>
            <Box className="pillars-grid">
              <Box className="pillar-card">
                <Typography className="pillar-icon">🛡️</Typography>
                <Typography className="pillar-title">Safety &amp; Comfort</Typography>
                <Typography className="pillar-text">A calm, toddler-proof home environment tailored for little learners.</Typography>
              </Box>
              <Box className="pillar-card">
                <Typography className="pillar-icon">🎯</Typography>
                <Typography className="pillar-title">Focused Attention</Typography>
                <Typography className="pillar-text">No overwhelming crowds, allowing every child to fully engage with the materials.</Typography>
              </Box>
              <Box className="pillar-card">
                <Typography className="pillar-icon">🤝</Typography>
                <Typography className="pillar-title">Community for Parents</Typography>
                <Typography className="pillar-text">A wonderful village for moms and dads to connect, chat, and share parenting insights while children play.</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

      </Container>
    </Box>
  );
}

export default App;
