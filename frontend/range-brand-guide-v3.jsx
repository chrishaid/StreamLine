import React from 'react';

const RangeBrandGuide = () => {
  const colors = {
    // Core green palette
    forest: '#1e3a2f',
    pine: '#2d5a47',
    sage: '#4a7c67',
    mist: '#e8f0ec',
    
    // Emphasis / Contrast colors
    ember: '#c2410c',       // Warm emphasis - alerts, key callouts
    gold: '#a16207',        // Secondary warm - highlights, achievements
    
    // Neutrals
    ink: '#1a1a1a',
    slate: '#5c6b64',
    stone: '#94a39b',
    paper: '#fafbfa',
    
    // Service palettes - sequential
    // Leadership Development (warm)
    lead: {
      100: '#fef3e2',
      200: '#fcd9a8',
      300: '#f5b056',
      400: '#d97706',
      500: '#a16207',
      600: '#713f12'
    },
    // Analytics (cool blue-green)  
    analytics: {
      100: '#e0f7fa',
      200: '#b2ebf2',
      300: '#4dd0e1',
      400: '#0891b2',
      500: '#0e7490',
      600: '#164e63'
    },
    // Process Improvement (purple/violet)
    process: {
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#c084fc',
      400: '#9333ea',
      500: '#7c3aed',
      600: '#5b21b6'
    }
  };

  // Tightened logo - bracket moved right (closer to arrow)
  const RangeLogo = ({ size = 48, variant = 'default', light = false }) => {
    const primary = light ? '#ffffff' : colors.forest;
    const accent = light ? '#ffffff' : colors.sage;
    
    if (variant === 'function') {
      // f(x) style - tighter
      return (
        <svg width={size} height={size * 0.6} viewBox="0 0 48 28" fill="none">
          <circle cx="8" cy="14" r="5" stroke={primary} strokeWidth="2" fill="none" />
          <path d="M15 14H29" stroke={primary} strokeWidth="2" strokeLinecap="round" />
          <path d="M25 10L30 14L25 18" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="38" cy="14" r="5" fill={accent} />
        </svg>
      );
    }
    
    if (variant === 'minimal') {
      return (
        <svg width={size} height={size * 0.5} viewBox="0 0 48 24" fill="none">
          <path d="M4 12H36" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 6L38 12L30 18" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="42" cy="12" r="4" fill={accent} />
        </svg>
      );
    }

    if (variant === 'mark') {
      // Square icon mark - tightened
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path d="M14 14V34M14 14H19M14 34H19" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 24H32" stroke={primary} strokeWidth="2" strokeLinecap="round" />
          <path d="M29 20L34 24L29 28" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="38" cy="24" r="4" fill={accent} />
        </svg>
      );
    }
    
    // Default - bracket moved closer to arrow (was x=4, now x=8)
    return (
      <svg width={size} height={size * 0.55} viewBox="0 0 48 26" fill="none">
        {/* Input bracket - moved right */}
        <path d="M8 4V22M8 4H13M8 22H13" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Arrow - starts closer to bracket */}
        <path d="M17 13H31" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        <path d="M27 8L33 13L27 18" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Output */}
        <circle cx="40" cy="13" r="4.5" fill={accent} />
      </svg>
    );
  };

  // Sequential palette display component
  const SequentialPalette = ({ palette, name, description }) => (
    <div>
      <div style={{ display: 'flex', height: '40px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
        {Object.values(palette).map((c, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </div>
      <p style={{ fontSize: '12px', fontWeight: '600', color: colors.forest, fontFamily: 'system-ui, sans-serif' }}>{name}</p>
      <p style={{ fontSize: '11px', color: colors.slate, marginTop: '2px' }}>{description}</p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.paper,
      padding: '48px 32px',
      fontFamily: '"Computer Modern Serif", "Latin Modern Roman", Georgia, "Times New Roman", serif'
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <RangeLogo size={72} />
          <h1 style={{ 
            fontSize: '52px', 
            fontWeight: '400', 
            fontStyle: 'italic',
            color: colors.forest,
            marginTop: '20px',
            marginBottom: '8px',
            letterSpacing: '-0.01em'
          }}>
            Range
          </h1>
          <p style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            color: colors.stone, 
            textTransform: 'uppercase', 
            letterSpacing: '3px',
            fontWeight: '500'
          }}>
            Brand Guidelines
          </p>
        </div>

        {/* Brand Concept */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Concept
          </h2>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '20px', fontStyle: 'italic', color: colors.forest, marginBottom: '20px', lineHeight: '1.5' }}>
              Domain → Range. Input transformed to output. The mathematical elegance of meaningful change.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.mist}` }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: colors.forest, marginBottom: '4px', fontFamily: 'system-ui, sans-serif' }}>Mathematical</p>
                <p style={{ fontSize: '13px', color: colors.slate, lineHeight: '1.5' }}>
                  f(x) → y. Every input yields meaningful output.
                </p>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: colors.forest, marginBottom: '4px', fontFamily: 'system-ui, sans-serif' }}>Versatility</p>
                <p style={{ fontSize: '13px', color: colors.slate, lineHeight: '1.5' }}>
                  Breadth of capability. Moving fluidly across domains.
                </p>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: colors.forest, marginBottom: '4px', fontFamily: 'system-ui, sans-serif' }}>Expansive</p>
                <p style={{ fontSize: '13px', color: colors.slate, lineHeight: '1.5' }}>
                  Wide-open possibility. Room to grow.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Logo Section */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Logo System
          </h2>

          {/* Primary */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Primary Lockup
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <RangeLogo size={56} />
              <span style={{ fontSize: '38px', fontWeight: '400', fontStyle: 'italic', color: colors.forest }}>Range</span>
            </div>
            <p style={{ fontSize: '12px', color: colors.slate, marginTop: '16px', lineHeight: '1.5' }}>
              Bracket notation with transformation arrow — structured input becoming meaningful output.
            </p>
          </div>

          {/* Variants grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Function Variant
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <RangeLogo size={44} variant="function" />
                <span style={{ fontSize: '26px', fontStyle: 'italic', color: colors.forest }}>Range</span>
              </div>
              <p style={{ fontSize: '11px', color: colors.stone, marginTop: '12px' }}>Domain → Range mapping</p>
            </div>
            
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Minimal Variant
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <RangeLogo size={44} variant="minimal" />
                <span style={{ fontSize: '26px', fontStyle: 'italic', color: colors.forest }}>Range</span>
              </div>
              <p style={{ fontSize: '11px', color: colors.stone, marginTop: '12px' }}>Compact applications</p>
            </div>
          </div>

          {/* Dark + Stacked */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ backgroundColor: colors.forest, borderRadius: '8px', padding: '28px' }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Reversed
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <RangeLogo size={48} light={true} />
                <span style={{ fontSize: '32px', fontStyle: 'italic', color: 'white' }}>Range</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Stacked
              </p>
              <RangeLogo size={48} variant="mark" />
              <p style={{ marginTop: '8px', fontSize: '24px', fontStyle: 'italic', color: colors.forest }}>Range</p>
              <p style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', color: colors.stone, letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>
                Leadership · Analytics · Process
              </p>
            </div>
          </div>

          {/* Icons */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              App Icons & Favicons
            </p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {[56, 44, 32, 20].map(s => (
                <div key={s} style={{ 
                  width: `${s}px`, 
                  height: `${s}px`, 
                  backgroundColor: colors.forest, 
                  borderRadius: `${s * 0.2}px`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <RangeLogo size={s * 0.65} variant="mark" light={true} />
                </div>
              ))}
              <span style={{ fontSize: '11px', color: colors.stone, marginLeft: '8px' }}>Scales cleanly to 16px</span>
            </div>
          </div>
        </section>

        {/* Domain */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Domain
          </h2>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '32px', marginBottom: '16px' }}>
              <p style={{ fontSize: '32px', fontStyle: 'italic', color: colors.forest }}>
                arran<span style={{ color: colors.sage }}>.</span>ge
              </p>
              <p style={{ fontSize: '32px', fontStyle: 'italic', color: colors.forest }}>
                <span style={{ opacity: 0.35 }}>arran</span><span style={{ color: colors.sage }}>.</span>ge
              </p>
            </div>
            <p style={{ fontSize: '13px', color: colors.slate, lineHeight: '1.6' }}>
              The domain creates wordplay with "arrange" — reinforcing process design and organizational work.
            </p>
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontFamily: 'ui-monospace, monospace', fontSize: '13px', color: colors.stone }}>
              <span>hello@arran.ge</span>
              <span>www.arran.ge</span>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Typography
          </h2>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {/* Display */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Display — Computer Modern / Latin Modern Roman
              </p>
              <p style={{ fontSize: '44px', fontStyle: 'italic', color: colors.forest }}>Range</p>
              <p style={{ fontSize: '12px', color: colors.slate, marginTop: '8px' }}>
                Italic for wordmark, headlines, and key statements. The mathematical heritage of TeX.
              </p>
            </div>

            {/* Sans for web */}
            <div style={{ marginBottom: '24px', paddingTop: '20px', borderTop: `1px solid ${colors.mist}` }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Web & Applications — Inter
              </p>
              <p style={{ fontSize: '32px', fontWeight: '300', color: colors.forest, fontFamily: 'Inter, system-ui, sans-serif' }}>Range</p>
              <p style={{ fontSize: '12px', color: colors.slate, marginTop: '8px', fontFamily: 'system-ui, sans-serif' }}>
                Inter for web apps, dashboards, and UI. Clean, legible, and highly versatile at all sizes.
              </p>
            </div>

            {/* Type scale */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.mist}` }}>
              <div>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Print / Marketing</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '24px', fontStyle: 'italic', color: colors.forest }}>Headlines — Italic</p>
                  <p style={{ fontSize: '16px', color: colors.forest }}>Subheads — Roman</p>
                  <p style={{ fontSize: '14px', color: colors.slate, lineHeight: '1.6' }}>Body text in regular weight for extended reading.</p>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Web / Applications</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: colors.forest }}>Headlines — Semibold</p>
                  <p style={{ fontSize: '16px', fontWeight: '500', color: colors.forest }}>Subheads — Medium</p>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: colors.slate, lineHeight: '1.6' }}>Body text in regular weight for UI and content.</p>
                </div>
              </div>
            </div>

            {/* Monospace */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.mist}` }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Technical / Code — JetBrains Mono
              </p>
              <p style={{ fontSize: '14px', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', color: colors.forest }}>
                f(domain) → range  |  O(n log n)  |  p &lt; 0.05  |  SELECT * FROM insights
              </p>
            </div>
          </div>
        </section>

        {/* Color - Core */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Color — Core Palette
          </h2>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {/* Primary greens */}
            <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Primary
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { color: colors.forest, name: 'Forest', hex: '#1e3a2f', role: 'Primary' },
                { color: colors.pine, name: 'Pine', hex: '#2d5a47', role: 'Secondary' },
                { color: colors.sage, name: 'Sage', hex: '#4a7c67', role: 'Accent' },
                { color: colors.mist, name: 'Mist', hex: '#e8f0ec', role: 'Background' }
              ].map(c => (
                <div key={c.name}>
                  <div style={{ 
                    height: '56px', 
                    backgroundColor: c.color, 
                    borderRadius: '6px', 
                    marginBottom: '8px',
                    border: c.name === 'Mist' ? '1px solid #d1ddd6' : 'none'
                  }} />
                  <p style={{ fontSize: '12px', fontWeight: '600', color: colors.forest, fontFamily: 'system-ui, sans-serif' }}>{c.name}</p>
                  <p style={{ fontSize: '10px', color: colors.stone }}>{c.role}</p>
                  <p style={{ fontSize: '10px', color: colors.stone, fontFamily: 'monospace', marginTop: '2px' }}>{c.hex}</p>
                </div>
              ))}
            </div>

            {/* Emphasis colors */}
            <div style={{ borderTop: `1px solid ${colors.mist}`, paddingTop: '20px', marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Emphasis — For Contrast & Callouts
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ height: '56px', backgroundColor: colors.ember, borderRadius: '6px', marginBottom: '8px' }} />
                  <p style={{ fontSize: '12px', fontWeight: '600', color: colors.forest, fontFamily: 'system-ui, sans-serif' }}>Ember</p>
                  <p style={{ fontSize: '10px', color: colors.stone }}>Alerts, critical</p>
                  <p style={{ fontSize: '10px', color: colors.stone, fontFamily: 'monospace', marginTop: '2px' }}>#c2410c</p>
                </div>
                <div>
                  <div style={{ height: '56px', backgroundColor: colors.gold, borderRadius: '6px', marginBottom: '8px' }} />
                  <p style={{ fontSize: '12px', fontWeight: '600', color: colors.forest, fontFamily: 'system-ui, sans-serif' }}>Gold</p>
                  <p style={{ fontSize: '10px', color: colors.stone }}>Highlights, wins</p>
                  <p style={{ fontSize: '10px', color: colors.stone, fontFamily: 'monospace', marginTop: '2px' }}>#a16207</p>
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', paddingLeft: '16px' }}>
                  <p style={{ fontSize: '12px', color: colors.slate, lineHeight: '1.5' }}>
                    Use sparingly for data visualization emphasis, alerts, and key metrics that need to stand out from the green palette.
                  </p>
                </div>
              </div>
            </div>

            {/* Neutrals */}
            <div style={{ borderTop: `1px solid ${colors.mist}`, paddingTop: '20px' }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Neutrals
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { color: colors.ink, name: 'Ink', hex: '#1a1a1a' },
                  { color: colors.slate, name: 'Slate', hex: '#5c6b64' },
                  { color: colors.stone, name: 'Stone', hex: '#94a39b' },
                  { color: colors.paper, name: 'Paper', hex: '#fafbfa' }
                ].map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      backgroundColor: c.color, 
                      borderRadius: '4px',
                      border: c.name === 'Paper' ? '1px solid #e5e7e6' : 'none',
                      flexShrink: 0
                    }} />
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '600', color: colors.forest, fontFamily: 'system-ui, sans-serif' }}>{c.name}</p>
                      <p style={{ fontSize: '9px', color: colors.stone, fontFamily: 'monospace' }}>{c.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Color - Service Palettes */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Color — Service Area Palettes
          </h2>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '13px', color: colors.slate, marginBottom: '24px', lineHeight: '1.6' }}>
              Each service area has a dedicated sequential palette for data visualization, allowing clear differentiation while maintaining cohesion across deliverables.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
              <SequentialPalette 
                palette={colors.lead} 
                name="Leadership Development" 
                description="Warm amber tones — human, growth-oriented" 
              />
              <SequentialPalette 
                palette={colors.analytics} 
                name="Analytics & ML/AI" 
                description="Cool cyan tones — precise, technical" 
              />
              <SequentialPalette 
                palette={colors.process} 
                name="Process Improvement" 
                description="Violet tones — transformation, innovation" 
              />
            </div>

            {/* Hex values */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${colors.mist}` }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Hex Values
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: colors.slate }}>
                <div>
                  <p style={{ marginBottom: '4px', fontFamily: 'system-ui, sans-serif', fontWeight: '500', color: colors.forest }}>Leadership</p>
                  {Object.entries(colors.lead).map(([k, v]) => (
                    <span key={k} style={{ marginRight: '8px' }}>{v}</span>
                  ))}
                </div>
                <div>
                  <p style={{ marginBottom: '4px', fontFamily: 'system-ui, sans-serif', fontWeight: '500', color: colors.forest }}>Analytics</p>
                  {Object.entries(colors.analytics).map(([k, v]) => (
                    <span key={k} style={{ marginRight: '8px' }}>{v}</span>
                  ))}
                </div>
                <div>
                  <p style={{ marginBottom: '4px', fontFamily: 'system-ui, sans-serif', fontWeight: '500', color: colors.forest }}>Process</p>
                  {Object.entries(colors.process).map(([k, v]) => (
                    <span key={k} style={{ marginRight: '8px' }}>{v}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Viz */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Data Visualization
          </h2>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {/* KPIs with emphasis */}
            <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              KPI Cards — Using Emphasis Colors
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1, padding: '16px', backgroundColor: colors.mist, borderRadius: '6px', borderLeft: `3px solid ${colors.forest}` }}>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.sage, fontWeight: '500' }}>Baseline</p>
                <p style={{ fontSize: '24px', fontStyle: 'italic', color: colors.forest }}>847K</p>
              </div>
              <div style={{ flex: 1, padding: '16px', backgroundColor: '#fef3e2', borderRadius: '6px', borderLeft: `3px solid ${colors.gold}` }}>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.gold, fontWeight: '500' }}>Highlight</p>
                <p style={{ fontSize: '24px', fontStyle: 'italic', color: colors.gold }}>+34%</p>
              </div>
              <div style={{ flex: 1, padding: '16px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: `3px solid ${colors.ember}` }}>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.ember, fontWeight: '500' }}>Alert</p>
                <p style={{ fontSize: '24px', fontStyle: 'italic', color: colors.ember }}>3 items</p>
              </div>
            </div>

            {/* Service area charts */}
            <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Charts by Service Area
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {/* Leadership chart */}
              <div style={{ padding: '16px', backgroundColor: colors.paper, borderRadius: '6px' }}>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.lead[500], fontWeight: '500', marginBottom: '8px' }}>Leadership</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
                  {[35, 45, 42, 58, 52, 65].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}px`, backgroundColor: Object.values(colors.lead)[i], borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
              {/* Analytics chart */}
              <div style={{ padding: '16px', backgroundColor: colors.paper, borderRadius: '6px' }}>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.analytics[500], fontWeight: '500', marginBottom: '8px' }}>Analytics</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
                  {[40, 52, 48, 62, 55, 70].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}px`, backgroundColor: Object.values(colors.analytics)[i], borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
              {/* Process chart */}
              <div style={{ padding: '16px', backgroundColor: colors.paper, borderRadius: '6px' }}>
                <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.process[500], fontWeight: '500', marginBottom: '8px' }}>Process</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
                  {[38, 48, 55, 50, 62, 68].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}px`, backgroundColor: Object.values(colors.process)[i], borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Combined example */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.mist}` }}>
              <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Multi-Service Comparison
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '100px', padding: '16px', backgroundColor: colors.paper, borderRadius: '6px' }}>
                {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
                  <div key={q} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, height: `${30 + i * 12}px`, backgroundColor: colors.lead[400], borderRadius: '2px 2px 0 0' }} />
                      <div style={{ flex: 1, height: `${40 + i * 10}px`, backgroundColor: colors.analytics[400], borderRadius: '2px 2px 0 0' }} />
                      <div style={{ flex: 1, height: `${35 + i * 14}px`, backgroundColor: colors.process[400], borderRadius: '2px 2px 0 0' }} />
                    </div>
                    <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginTop: '6px' }}>{q}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', justifyContent: 'center' }}>
                {[
                  { color: colors.lead[400], label: 'Leadership' },
                  { color: colors.analytics[400], label: 'Analytics' },
                  { color: colors.process[400], label: 'Process' }
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', backgroundColor: item.color, borderRadius: '2px' }} />
                    <span style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Clear Space */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ 
            fontSize: '11px', 
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '600', 
            color: colors.sage, 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            Clear Space
          </h2>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={{ position: 'relative', padding: '24px', border: `2px dashed ${colors.mist}`, display: 'inline-block' }}>
                  <RangeLogo size={56} />
                  <span style={{ position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50)', fontSize: '9px', color: colors.sage }}>1x</span>
                </div>
                <p style={{ fontSize: '11px', color: colors.stone, marginTop: '8px' }}>Clear space = circle height</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                {[20, 28, 40, 56].map(s => (
                  <div key={s} style={{ textAlign: 'center' }}>
                    <RangeLogo size={s} />
                    <p style={{ fontSize: '9px', color: colors.stone, marginTop: '4px' }}>{s}px</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: `1px solid ${colors.mist}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <RangeLogo size={28} />
            <span style={{ fontSize: '18px', fontStyle: 'italic', color: colors.forest }}>Range</span>
          </div>
          <p style={{ fontSize: '13px', color: colors.sage, marginTop: '6px', fontFamily: 'monospace' }}>
            arran.ge
          </p>
          <p style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: colors.stone, marginTop: '8px' }}>
            Brand Guidelines v1.0
          </p>
        </div>

      </div>
    </div>
  );
};

export default RangeBrandGuide;
