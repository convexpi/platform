'use client'

export function HeroViz() {
  return (
    <svg
      viewBox="0 0 500 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full opacity-90"
      aria-hidden
    >
      {/* Subtle grid */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 55} y1="0" x2={i * 55} y2="420"
          stroke="#1e3a5f" strokeWidth="0.5" />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 60} x2="500" y2={i * 60}
          stroke="#1e3a5f" strokeWidth="0.5" />
      ))}

      {/* Equity curves */}
      <path
        d="M 20 320 C 80 310 120 280 180 240 C 240 200 280 220 340 180 C 380 155 420 130 480 100"
        stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
        style={{ animation: 'dash 3s ease-in-out forwards', strokeDasharray: 800, strokeDashoffset: 800 }}
      />
      <path
        d="M 20 360 C 80 355 130 340 190 310 C 260 275 300 290 360 260 C 410 235 445 200 480 170"
        stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"
        style={{ animation: 'dash 3.5s 0.3s ease-in-out forwards', strokeDasharray: 800, strokeDashoffset: 800 }}
      />
      <path
        d="M 20 380 C 60 370 100 360 160 350 C 230 338 280 360 340 330 C 390 305 440 270 480 240"
        stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"
        style={{ animation: 'dash 4s 0.6s ease-in-out forwards', strokeDasharray: 800, strokeDashoffset: 800 }}
      />

      {/* Network nodes */}
      {[
        { x: 180, y: 240, r: 5, c: '#3b82f6', delay: '1s' },
        { x: 340, y: 180, r: 6, c: '#3b82f6', delay: '1.2s' },
        { x: 260, y: 150, r: 4, c: '#14b8a6', delay: '1.4s' },
        { x: 390, y: 260, r: 5, c: '#14b8a6', delay: '1.6s' },
        { x: 130, y: 190, r: 4, c: '#f59e0b', delay: '1.8s' },
        { x: 440, y: 130, r: 4, c: '#f59e0b', delay: '2s' },
        { x: 310, y: 310, r: 3, c: '#3b82f6', delay: '2.1s' },
        { x: 200, y: 300, r: 3, c: '#14b8a6', delay: '2.2s' },
      ].map((n, i) => (
        <circle
          key={i} cx={n.x} cy={n.y} r={n.r} fill={n.c}
          style={{ opacity: 0, animation: `fadeIn 0.4s ${n.delay} ease-out forwards` }}
        />
      ))}

      {/* Network edges */}
      {[
        [180, 240, 260, 150],
        [260, 150, 340, 180],
        [180, 240, 310, 310],
        [340, 180, 390, 260],
        [130, 190, 180, 240],
        [390, 260, 440, 130],
        [200, 300, 310, 310],
        [260, 150, 130, 190],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#1e3a5f" strokeWidth="1"
          style={{ opacity: 0, animation: `fadeIn 0.3s ${1.2 + i * 0.1}s ease-out forwards` }}
        />
      ))}

      {/* Glow on primary curve end */}
      <circle cx="480" cy="100" r="8" fill="#3b82f6" opacity="0.25"
        style={{ animation: 'pulse 2s 3s ease-in-out infinite' }} />
      <circle cx="480" cy="100" r="4" fill="#3b82f6"
        style={{ opacity: 0, animation: 'fadeIn 0.3s 3s ease-out forwards' }} />

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </svg>
  )
}
