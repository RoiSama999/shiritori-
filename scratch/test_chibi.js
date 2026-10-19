// SVG illustration generator for Anime Chibi Character
function generateChibiSvg(mood = 'normal', isNeko = true) {
  const catEars = isNeko ? `
    <!-- Left Cat Ear -->
    <path d="M 18 24 Q 10 2 28 10 Z" fill="#ff75b6" stroke="#422838" stroke-width="2"/>
    <path d="M 19 22 Q 13 8 26 12 Z" fill="#ffb3d9"/>
    <!-- Right Cat Ear -->
    <path d="M 62 24 Q 70 2 52 10 Z" fill="#ff75b6" stroke="#422838" stroke-width="2"/>
    <path d="M 61 22 Q 67 8 54 12 Z" fill="#ffb3d9"/>
  ` : `
    <!-- Sakura Blossom Hairpins -->
    <g transform="translate(14, 12) scale(0.6)">
      <circle cx="10" cy="10" r="6" fill="#ff4d85"/>
      <circle cx="5" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="5" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="10" cy="10" r="3" fill="#ffbe0b"/>
    </g>
    <g transform="translate(54, 12) scale(0.6)">
      <circle cx="10" cy="10" r="6" fill="#ff4d85"/>
      <circle cx="5" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="5" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="10" cy="10" r="3" fill="#ffbe0b"/>
    </g>
  `;

  const eyes = mood === 'happy' ? `
    <!-- Happy Closed Crescent Eyes -->
    <path d="M 26 44 Q 32 38 38 44" fill="none" stroke="#2d1d29" stroke-width="3" stroke-linecap="round"/>
    <path d="M 42 44 Q 48 38 54 44" fill="none" stroke="#2d1d29" stroke-width="3" stroke-linecap="round"/>
  ` : mood === 'wink' ? `
    <!-- Left Winking Eye -->
    <path d="M 26 44 Q 32 38 38 44" fill="none" stroke="#2d1d29" stroke-width="3" stroke-linecap="round"/>
    <!-- Right Big Sparkle Eye -->
    <ellipse cx="48" cy="43" rx="6.5" ry="8" fill="#1e152a"/>
    <ellipse cx="48" cy="45" rx="5.5" ry="6" fill="#d946ef"/>
    <circle cx="46" cy="40" r="2.8" fill="#ffffff"/>
    <circle cx="50" cy="46" r="1.5" fill="#ffffff"/>
  ` : `
    <!-- Normal Big Anime Sparkling Eyes -->
    <ellipse cx="32" cy="43" rx="6.5" ry="8" fill="#1e152a"/>
    <ellipse cx="32" cy="45" rx="5.5" ry="6" fill="#ec4899"/>
    <circle cx="30" cy="40" r="2.8" fill="#ffffff"/>
    <circle cx="34" cy="46" r="1.5" fill="#ffffff"/>
    
    <ellipse cx="48" cy="43" rx="6.5" ry="8" fill="#1e152a"/>
    <ellipse cx="48" cy="45" rx="5.5" ry="6" fill="#ec4899"/>
    <circle cx="46" cy="40" r="2.8" fill="#ffffff"/>
    <circle cx="50" cy="46" r="1.5" fill="#ffffff"/>
  `;

  const mouth = mood === 'happy' ? `
    <!-- Cute open anime mouth -->
    <path d="M 37 53 Q 40 58 43 53 Z" fill="#ff3366"/>
  ` : `
    <!-- Cute Neko 'w' shaped mouth -->
    <path d="M 36 52 Q 38.5 54 40 52 Q 41.5 54 44 52" fill="none" stroke="#3d2232" stroke-width="1.8" stroke-linecap="round"/>
  `;

  return `
  <svg class="chibi-avatar-svg" viewBox="0 0 80 80" width="68" height="68" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chibiHairGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff75a0"/>
        <stop offset="100%" stop-color="#f43f5e"/>
      </linearGradient>
      <radialGradient id="chibiBlushGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ff4d85" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#ff4d85" stop-opacity="0"/>
      </radialGradient>
    </defs>
    
    <!-- Background aura glow -->
    <circle cx="40" cy="40" r="38" fill="rgba(255, 117, 160, 0.15)"/>
    
    ${catEars}
    
    <!-- Hair Back -->
    <path d="M 18 36 Q 12 55 20 68 Q 28 58 26 45 Z" fill="url(#chibiHairGrad)"/>
    <path d="M 62 36 Q 68 55 60 68 Q 52 58 54 45 Z" fill="url(#chibiHairGrad)"/>
    
    <!-- Face / Head Base -->
    <ellipse cx="40" cy="44" rx="23" ry="21" fill="#fff5ea" stroke="#f0d5c0" stroke-width="1"/>
    
    <!-- Rosy Cheek Blushes -->
    <circle cx="24" cy="49" r="6" fill="url(#chibiBlushGrad)"/>
    <circle cx="56" cy="49" r="6" fill="url(#chibiBlushGrad)"/>
    
    <!-- Eyes -->
    ${eyes}
    
    <!-- Cute Nose -->
    <circle cx="40" cy="49.5" r="0.9" fill="#ff758f"/>
    
    <!-- Cute Mouth -->
    ${mouth}
    
    <!-- Hair Front Bangs -->
    <path d="M 18 34 Q 40 18 62 34 Q 54 28 40 31 Q 26 28 18 34 Z" fill="url(#chibiHairGrad)"/>
    <path d="M 33 28 Q 36 38 31 38 Z" fill="url(#chibiHairGrad)"/>
    <path d="M 47 28 Q 44 38 49 38 Z" fill="url(#chibiHairGrad)"/>
    
    <!-- Collar & Little Bell -->
    <path d="M 30 63 Q 40 68 50 63" stroke="#f43f5e" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="65.5" r="3.5" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
  </svg>
  `;
}

console.log('Chibi SVG length:', generateChibiSvg().length);
