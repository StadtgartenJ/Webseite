/**
 * Statische Schnittzeichnung als Ersatz, solange das 3D-Modell lädt
 * oder wenn der Browser kein WebGL anbietet. Konzeptdarstellung, nicht maßstäblich.
 */
export function CutawayFallback({ className = "" }: { className?: string }) {
  const ink = "#252824";
  const muted = "#6b7068";
  const water = "#8dbfd4";
  return (
    <svg
      className={`cutaway ${className}`}
      viewBox="0 0 880 500"
      role="img"
      aria-labelledby="cutaway-title cutaway-desc"
    >
      <title id="cutaway-title">Konzeptdarstellung: Längsschnitt durch den Pflanzkasten</title>
      <desc id="cutaway-desc">
        Von oben nach unten: Klemmstange mit zwei Haken, Pflanzeinsatz mit Erde, gelochte Trennplatte, zwei Dochte, die
        aus dem Wasserreservoir am Boden nach oben führen. Rechts ein Schacht zum Nachfüllen. Vorne eine
        Füllstandsanzeige. Nicht maßstäblich.
      </desc>

      {/* Laibung */}
      <g fill="none" stroke={muted} strokeWidth="1">
        <path d="M60 70 V430 M60 70 h-22 M60 430 h-22" />
        <path d="M820 70 V430 M820 70 h22 M820 430 h22" />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={`l${i}`} d={`M38 ${80 + i * 30} l22 -18`} opacity=".5" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <path key={`r${i}`} d={`M820 ${80 + i * 30} l22 -18`} opacity=".5" />
        ))}
      </g>

      {/* Klemmstange + Haken (H) */}
      <rect x="66" y="112" width="748" height="12" rx="6" fill="#fff" stroke={ink} strokeWidth="1.4" />
      <rect x="60" y="102" width="10" height="32" rx="2" fill="#3a3d39" />
      <rect x="810" y="102" width="10" height="32" rx="2" fill="#3a3d39" />
      <path d="M290 118 v74 M590 118 v74" stroke={ink} strokeWidth="5" strokeLinecap="round" />

      {/* Pflanzen (vereinfacht) */}
      <g fill="#c9d5c2" stroke="#6f8a68" strokeWidth="1">
        {[180, 230, 285, 340, 400, 455, 515, 570, 625].map((x, i) => (
          <path key={x} d={`M${x} 176 c${-18 + (i % 2) * 6} -18 ${-8 + i} -46 ${10 - (i % 3) * 4} -54 c16 10 18 38 -10 54z`} />
        ))}
        <path d="M168 182 c-24 22 -30 60 -22 96 M164 214 c-14 4 -18 12 -16 22" fill="none" />
      </g>

      {/* Außenschale (A) */}
      <path
        d="M140 150 V266 A114 114 0 0 0 254 380 H626 A114 114 0 0 0 740 266 V150"
        fill="none"
        stroke={ink}
        strokeWidth="9"
        strokeLinejoin="round"
        opacity=".14"
      />
      <path
        d="M140 150 V266 A114 114 0 0 0 254 380 H626 A114 114 0 0 0 740 266 V150"
        fill="none"
        stroke={ink}
        strokeWidth="1.6"
      />
      <path d="M149 150 V266 A105 105 0 0 0 254 371 H626 A105 105 0 0 0 731 266 V150" fill="none" stroke={ink} strokeWidth="1" />

      {/* Reservoir (C) mit Wasser */}
      <path d="M156 300 H724 V300 C724 340 700 366 650 366 H230 C180 366 156 340 156 300 Z" fill="#e8f2f6" stroke={muted} strokeWidth="1" />
      <path d="M162 326 H718 C712 350 690 362 650 362 H230 C190 362 168 350 162 326 Z" fill={water} opacity=".8" />

      {/* Trennplatte (E) */}
      <path d="M160 296 H690" stroke={ink} strokeWidth="2.5" strokeDasharray="7 5" />

      {/* Pflanzeinsatz (B) mit Erde */}
      <rect x="160" y="168" width="508" height="122" rx="8" fill="#2b2e2a" />
      <rect x="168" y="182" width="492" height="102" rx="5" fill="#3a2c22" />

      {/* Dochte (D) */}
      <rect x="262" y="262" width="26" height="96" fill="#f3f1ea" stroke="#bdb8ac" />
      <rect x="592" y="262" width="26" height="96" fill="#f3f1ea" stroke="#bdb8ac" />
      <g stroke="#2a83b0" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M275 344 V276 m-7 9 l7 -9 l7 9" />
        <path d="M605 344 V276 m-7 9 l7 -9 l7 9" />
      </g>

      {/* Einfüll- und Luftweg (F) */}
      <rect x="690" y="140" width="22" height="200" rx="4" fill="#fff" stroke={ink} strokeWidth="1.2" />
      <rect x="684" y="134" width="34" height="8" rx="3" fill="#fff" stroke={ink} strokeWidth="1.2" />

      {/* Füllstandsanzeige (G), liegt vorne: gestrichelt */}
      <rect x="434" y="214" width="14" height="56" rx="7" fill="none" stroke={ink} strokeDasharray="4 3" />

      {/* Beschriftungen */}
      <g fontFamily="var(--font-text), system-ui, sans-serif" fontSize="15" fill={ink}>
        {[
          ["A", "Außenschale", 112, 404, 160, 376],
          ["B", "Pflanzeinsatz", 112, 238, 160, 238],
          ["C", "Reservoir", 344, 440, 380, 352],
          ["D", "Kapillarelement", 190, 466, 270, 352],
          ["E", "Trennplatte", 470, 466, 470, 298],
          ["F", "Einfüll- und Luftweg", 650, 440, 700, 342],
          ["G", "Füllstandsanzeige", 470, 210, 448, 230],
          ["H", "Klemmstange und Haken", 330, 96, 330, 112],
        ].map(([l, name, tx, ty, px, py]) => (
          <g key={l as string}>
            <path d={`M${px} ${py} L${tx} ${(ty as number) - 6}`} stroke={muted} strokeWidth="0.8" fill="none" />
            <circle cx={tx as number} cy={(ty as number) - 6} r="2.5" fill={ink} />
            <text x={(tx as number) + 8} y={ty as number}>
              <tspan fontWeight="500">{l}</tspan> {name}
            </text>
          </g>
        ))}
      </g>
      <text x="840" y="490" textAnchor="end" fontFamily="var(--font-text), system-ui, sans-serif" fontSize="13" fill={muted}>
        Konzeptdarstellung, nicht maßstäblich
      </text>
    </svg>
  );
}
