import { useEffect, useRef, useState } from 'react';

/**
 * Logo kutusu + parçacık toplanması animasyonu.
 * - Sayfa mount'unda 1 kez oynar (React StrictMode çifte çağrısına karşı ref korumalı)
 * - prefers-reduced-motion aktifse parçacık yok, logo direkt görünür
 * - Animasyon bitince parçacık div'leri DOM'dan silinir
 */
export default function LogoIntro() {
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const hasRun       = useRef(false);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [imgError,   setImgError]     = useState(false);

  useEffect(() => {
    // StrictMode double-invoke koruması
    if (hasRun.current) return;
    hasRun.current = true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setLogoOpacity(1);
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const COUNT  = 14;
    const CX     = 32; // logo kutusunun merkezi (h-16 w-16 = 64px → 32px)
    const CY     = 32;
    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < COUNT; i++) {
      // Parçacıkları dairesel + hafif rastgele saçılmış yerleştir
      const angle  = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const radius = 52 + Math.random() * 32;          // 52–84 px logo merkezinden
      const x      = CX + Math.cos(angle) * radius;   // wrapper içi mutlak px
      const y      = CY + Math.sin(angle) * radius;
      const size   = 3 + Math.random() * 2.5;          // 3–5.5 px

      const p = document.createElement('div');
      Object.assign(p.style, {
        position:        'absolute',
        left:            `${x}px`,
        top:             `${y}px`,
        width:           `${size}px`,
        height:          `${size}px`,
        borderRadius:    '50%',
        background:      'var(--accent)',
        opacity:         '0.85',
        transform:       'translate(-50%, -50%)',
        // Hedef: merkeze ulaş ve sönerek kaybol
        transition:      [
          'left   680ms cubic-bezier(0.2, 0.7, 0.2, 1)',
          'top    680ms cubic-bezier(0.2, 0.7, 0.2, 1)',
          'opacity 580ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        ].join(', '),
        pointerEvents:   'none',
        willChange:      'left, top, opacity',
        zIndex:          '20',
      });

      wrapper.appendChild(p);
      particles.push(p);
    }

    // İki RAF: ilki layout'u flushlıyor, ikincisi transition'ı tetikliyor
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        particles.forEach(p => {
          p.style.left    = `${CX}px`;
          p.style.top     = `${CY}px`;
          p.style.opacity = '0';
        });
      });
    });

    // Logo ~500ms sonra fade-in başlasın (parçacıklar henüz yoldayken)
    const t1 = setTimeout(() => setLogoOpacity(1), 500);

    // Parçacıkları 950ms sonra DOM'dan temizle
    const t2 = setTimeout(() => {
      particles.forEach(p => p.parentNode && p.parentNode.removeChild(p));
    }, 950);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      particles.forEach(p => p.parentNode && p.parentNode.removeChild(p));
    };
  }, []);

  return (
    // overflow:visible — parçacıklar 64px kutu dışına taşar
    <div ref={wrapperRef} className="relative h-16 w-16" style={{ overflow: 'visible' }}>
      {/* Logo kutusu */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
      >
        {imgError ? (
          <span className="text-2xl font-bold text-blue-400">T</span>
        ) : (
          <img
            src="/logo.png"
            alt="Tuzla Belediyesi"
            className="h-10 w-10 object-contain"
            style={{
              opacity:    logoOpacity,
              transition: 'opacity 400ms ease-out',
            }}
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Glow ring — logo görününce ortaya çıksın */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl animate-pulse-subtle"
        style={{
          boxShadow: '0 0 20px rgba(59,130,246,0.3)',
          opacity:    logoOpacity * 0.4,
          transition: 'opacity 400ms ease-out',
        }}
      />
    </div>
  );
}
