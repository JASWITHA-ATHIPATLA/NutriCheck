import React from 'react';

/**
 * High-craft custom vector cartoon illustrations of Doraemon + Eathy Botanical Leaves
 * Designed specifically for the user-friendly Daily Food & Nutrition Tracker UI.
 */

export function DoraemonChefCartoon({
  size = 84,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Doraemon Cartoon Mascot"
    >
      <defs>
        <radialGradient id="doraBlueHead" cx="38%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#29B6F6" />
          <stop offset="55%" stopColor="#0096E6" />
          <stop offset="100%" stopColor="#0277BD" />
        </radialGradient>
        <radialGradient id="doraNoseGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FF5252" />
          <stop offset="60%" stopColor="#E60012" />
          <stop offset="100%" stopColor="#99000D" />
        </radialGradient>
        <linearGradient id="doraBellGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>

      {/* Soft cheerful aura & floating botanical leaves */}
      <circle cx="80" cy="84" r="68" fill="#E0F2FE" opacity="0.7" />
      <path
        d="M18 52C10 42 14 28 26 30C34 31 36 44 28 52C24 55 20 55 18 52Z"
        fill="#4ADE80"
        stroke="#15803D"
        strokeWidth="2"
      />
      <path d="M18 36L27 49" stroke="#15803D" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M142 46C150 36 146 22 134 24C126 25 124 38 132 46C136 49 140 49 142 46Z"
        fill="#4ADE80"
        stroke="#15803D"
        strokeWidth="2"
      />
      <path d="M142 30L133 43" stroke="#15803D" strokeWidth="1.6" strokeLinecap="round" />

      {/* Doraemon Body */}
      <path
        d="M44 114C44 102 58 96 80 96C102 96 116 102 116 114V142C116 147 111 151 105 151H55C49 151 44 147 44 142V114Z"
        fill="url(#doraBlueHead)"
        stroke="#0F172A"
        strokeWidth="3"
      />

      {/* White Belly & 4D Magic Pocket */}
      <ellipse
        cx="80"
        cy="128"
        rx="25"
        ry="21"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.6"
      />
      <path
        d="M62 126H98C98 137 90 144 80 144C70 144 62 137 62 126Z"
        fill="#F8FAFC"
        stroke="#0F172A"
        strokeWidth="2.4"
      />

      {/* Left Arm waving */}
      <path
        d="M46 112C34 106 24 96 22 86C20 79 28 74 35 79L50 96"
        fill="url(#doraBlueHead)"
        stroke="#0F172A"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Left White Round Hand */}
      <circle cx="24" cy="80" r="10.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.8" />

      {/* Right Arm holding Healthy Salad / Dorayaki */}
      <path
        d="M114 112C126 108 135 100 137 90C139 83 131 78 124 83L110 98"
        fill="url(#doraBlueHead)"
        stroke="#0F172A"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Right White Round Hand */}
      <circle cx="135" cy="86" r="10.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.8" />

      {/* Cute Dorayaki / Healthy Snack in Right Hand */}
      <ellipse
        cx="138"
        cy="71"
        rx="14"
        ry="8.5"
        fill="#D97706"
        stroke="#0F172A"
        strokeWidth="2.4"
      />
      <path
        d="M125 71C129 75 147 75 151 71"
        stroke="#FEF3C7"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Doraemon Classic Round Blue Head */}
      <circle
        cx="80"
        cy="64"
        r="44"
        fill="url(#doraBlueHead)"
        stroke="#0F172A"
        strokeWidth="3.2"
      />

      {/* White Face Patch */}
      <ellipse
        cx="80"
        cy="72"
        rx="36"
        ry="31"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.8"
      />

      {/* Big Iconic Oval Eyes Touching at Center */}
      <ellipse
        cx="68.5"
        cy="46"
        rx="11.5"
        ry="14.5"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.8"
      />
      <ellipse
        cx="91.5"
        cy="46"
        rx="11.5"
        ry="14.5"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.8"
      />

      {/* Expressive Cheerful Pupils */}
      <ellipse cx="71.5" cy="47" rx="4.2" ry="6" fill="#0F172A" />
      <circle cx="70" cy="44.5" r="1.8" fill="#FFFFFF" />
      <ellipse cx="88.5" cy="47" rx="4.2" ry="6" fill="#0F172A" />
      <circle cx="87" cy="44.5" r="1.8" fill="#FFFFFF" />

      {/* Rosy Cartoon Cheeks */}
      <ellipse cx="52" cy="68" rx="6.5" ry="3.8" fill="#FDA4AF" opacity="0.75" />
      <ellipse cx="108" cy="68" rx="6.5" ry="3.8" fill="#FDA4AF" opacity="0.75" />

      {/* Iconic Glossy Red Nose */}
      <circle
        cx="80"
        cy="58"
        r="7.8"
        fill="url(#doraNoseGrad)"
        stroke="#0F172A"
        strokeWidth="2.6"
      />
      <circle cx="77.5" cy="55.5" r="2.3" fill="#FFFFFF" />

      {/* Center Philtrum Line */}
      <line
        x1="80"
        y1="65.8"
        x2="80"
        y2="77"
        stroke="#0F172A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Big Cheerful Doraemon Laughing Mouth & Tongue */}
      <path
        d="M56 75C62 78 98 78 104 75C103 92 92 98 80 98C68 98 57 92 56 75Z"
        fill="#E11D48"
        stroke="#0F172A"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M66 89C70 83 90 83 94 89C91 95 86 97.5 80 97.5C74 97.5 69 95 66 89Z"
        fill="#FB7185"
      />

      {/* 6 Classic Whiskers (3 Left, 3 Right) */}
      <line x1="43" y1="60" x2="62" y2="64" stroke="#0F172A" strokeWidth="2.3" strokeLinecap="round" />
      <line x1="41" y1="68" x2="61" y2="68" stroke="#0F172A" strokeWidth="2.3" strokeLinecap="round" />
      <line x1="43" y1="76" x2="62" y2="72" stroke="#0F172A" strokeWidth="2.3" strokeLinecap="round" />

      <line x1="117" y1="60" x2="98" y2="64" stroke="#0F172A" strokeWidth="2.3" strokeLinecap="round" />
      <line x1="119" y1="68" x2="99" y2="68" stroke="#0F172A" strokeWidth="2.3" strokeLinecap="round" />
      <line x1="117" y1="76" x2="98" y2="72" stroke="#0F172A" strokeWidth="2.3" strokeLinecap="round" />

      {/* Red Collar */}
      <rect
        x="48"
        y="99"
        width="64"
        height="9"
        rx="4.5"
        fill="#E60012"
        stroke="#0F172A"
        strokeWidth="2.6"
      />

      {/* Golden Yellow Bell on Collar */}
      <circle
        cx="80"
        cy="107"
        r="8.5"
        fill="url(#doraBellGrad)"
        stroke="#0F172A"
        strokeWidth="2.5"
      />
      <line x1="72" y1="105.5" x2="88" y2="105.5" stroke="#0F172A" strokeWidth="2" />
      <circle cx="80" cy="109.5" r="2" fill="#0F172A" />
      <line x1="80" y1="111" x2="80" y2="115" stroke="#0F172A" strokeWidth="2" />
    </svg>
  );
}

export function DoraemonBambooCopterCartoon({
  size = 92,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Doraemon with Bamboo Copter"
    >
      <defs>
        <radialGradient id="doraCopterBlue" cx="38%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0096E6" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>
      </defs>

      {/* Spinning Bamboo-Copter (Hopter) on top of Doraemon's head */}
      <ellipse
        cx="80"
        cy="14"
        rx="34"
        ry="5"
        fill="#FDE047"
         opacity="0.65"
      />
      <rect
        x="52"
        y="12"
        width="56"
        height="4.5"
        rx="2.25"
        fill="#FACC15"
        stroke="#0F172A"
        strokeWidth="2"
      />
      <rect
        x="77"
        y="15"
        width="6"
        height="14"
        fill="#FACC15"
        stroke="#0F172A"
        strokeWidth="2.2"
      />
      <path
        d="M73 28C73 25 87 25 87 28Z"
        fill="#EAB308"
        stroke="#0F172A"
        strokeWidth="2.2"
      />

      {/* Doraemon Round Blue Head */}
      <circle
        cx="80"
        cy="72"
        r="44"
        fill="url(#doraCopterBlue)"
        stroke="#0F172A"
        strokeWidth="3.2"
      />

      {/* White Face Patch */}
      <ellipse
        cx="80"
        cy="80"
        rx="36"
        ry="30"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.8"
      />

      {/* Eyes: Left Winking, Right Wide Happy */}
      <ellipse
        cx="68.5"
        cy="54"
        rx="11.5"
        ry="14"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.8"
      />
      <ellipse
        cx="91.5"
        cy="54"
        rx="11.5"
        ry="14"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.8"
      />
      {/* Left Winking Arc */}
      <path
        d="M63 55C65.5 50 72 50 74.5 55"
        stroke="#0F172A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Right Pupil */}
      <ellipse cx="89" cy="55" rx="4.2" ry="6" fill="#0F172A" />
      <circle cx="87.5" cy="52.5" r="1.8" fill="#FFFFFF" />

      {/* Cheeks */}
      <ellipse cx="52" cy="75" rx="6" ry="3.5" fill="#FDA4AF" opacity="0.8" />
      <ellipse cx="108" cy="75" rx="6" ry="3.5" fill="#FDA4AF" opacity="0.8" />

      {/* Red Nose */}
      <circle
        cx="80"
        cy="66"
        r="7.8"
        fill="#E60012"
        stroke="#0F172A"
        strokeWidth="2.6"
      />
      <circle cx="77.5" cy="63.5" r="2.2" fill="#FFFFFF" />

      {/* Philtrum & Big Smile */}
      <line x1="80" y1="73.8" x2="80" y2="84" stroke="#0F172A" strokeWidth="2.6" />
      <path
        d="M58 82C65 96 95 96 102 82"
        stroke="#0F172A"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M63 85C68 97 92 97 97 85Z"
        fill="#E11D48"
        stroke="#0F172A"
        strokeWidth="2.4"
      />
      <ellipse cx="80" cy="92" rx="9" ry="4" fill="#FB7185" />

      {/* Whiskers */}
      <line x1="44" y1="68" x2="62" y2="71" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="42" y1="75" x2="61" y2="75" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="44" y1="82" x2="62" y2="79" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />

      <line x1="116" y1="68" x2="98" y2="71" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="118" y1="75" x2="99" y2="75" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="116" y1="82" x2="98" y2="79" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />

      {/* Red Collar & Golden Bell */}
      <rect
        x="48"
        y="108"
        width="64"
        height="9"
        rx="4.5"
        fill="#E60012"
        stroke="#0F172A"
        strokeWidth="2.6"
      />
      <circle
        cx="80"
        cy="116"
        r="8.5"
        fill="#FACC15"
        stroke="#0F172A"
        strokeWidth="2.5"
      />
      <circle cx="80" cy="118" r="2" fill="#0F172A" />

      {/* Cute White Paws Peeking at Bottom */}
      <circle cx="52" cy="118" r="11" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.8" />
      <circle cx="108" cy="118" r="11" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.8" />
    </svg>
  );
}

/**
 * Exact Eathy Botanical Leaves Decoration (Left & Right Leaf Branches)
 */
export function EathyBotanicalLeavesLeft({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top-Left Light Green Pinnate Leaf Branch */}
      <g>
        <path
          d="M150 215C132 155 104 94 68 36"
          stroke="#5CC23B"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Leaflets */}
        <path
          d="M68 38C45 14 20 12 15 24C10 36 32 56 68 44Z"
          fill="#65C943"
        />
        <path
          d="M84 65C92 34 108 22 118 30C128 38 114 66 86 72Z"
          fill="#65C943"
        />
        <path
          d="M90 88C54 68 24 68 18 82C12 96 42 114 92 96Z"
          fill="#65C943"
        />
        <path
          d="M108 114C118 84 134 72 144 82C154 92 138 118 110 122Z"
          fill="#65C943"
        />
        <path
          d="M114 138C74 120 42 122 36 136C30 150 62 166 116 146Z"
          fill="#65C943"
        />
        <path
          d="M132 168C96 154 66 158 60 170C54 182 84 196 134 176Z"
          fill="#65C943"
        />
      </g>

      {/* Bottom-Left Deep Forest Green Veined Botanical Leaves */}
      <g>
        <path
          d="M168 345C120 330 58 292 8 240C42 308 82 355 156 368Z"
          fill="#0F6B1D"
        />
        <path
          d="M8 240C54 242 116 268 164 338C104 342 46 314 8 240Z"
          fill="#157A24"
        />
        <path
          d="M18 250C72 282 118 314 158 344"
          stroke="#4ADE80"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M62 276L92 266" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M62 276L54 302" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M102 302L130 292" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M102 302L92 326" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />

        {/* Lower overlapping dark leaf */}
        <path
          d="M20 398C52 346 106 328 168 352C126 392 74 408 20 398Z"
          fill="#126E20"
        />
        <path
          d="M32 392C78 372 122 362 162 356"
          stroke="#4ADE80"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function EathyBotanicalLeavesRight({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top-Right Dark Forest Green Leaf */}
      <path
        d="M12 185C32 132 82 96 154 78C144 146 104 192 12 185Z"
        fill="#0D5C18"
      />

      {/* Mid-to-Bottom Right Vibrant Green Pinnate Branch */}
      <g>
        <path
          d="M14 402C32 332 68 258 124 196"
          stroke="#3FA327"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M42 292C32 246 42 214 58 216C74 218 72 258 46 296Z"
          fill="#46AE2D"
        />
        <path
          d="M78 248C118 214 156 204 166 218C176 232 140 264 82 256Z"
          fill="#46AE2D"
        />
        <path
          d="M54 328C98 296 142 290 152 306C162 322 122 350 58 336Z"
          fill="#46AE2D"
        />
        <path
          d="M32 374C72 352 108 352 116 366C124 380 90 398 36 382Z"
          fill="#46AE2D"
        />
      </g>
    </svg>
  );
}

/**
 * Friendly Cartoon Doctor image for the "Prescription Health" header.
 */
export function DoctorCartoonMascot({
  size = 96,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/assets/aistudio/image_e704bd47.png"
      alt="Doctor Cartoon"
      width={size}
      height={Math.round(size * 1.35)}
      className={className}
      style={{
        width: size,
        height: Math.round(size * 1.35),
        objectFit: 'contain',
        display: 'block',
        borderRadius: '14px',
      }}
    />
  );
}


