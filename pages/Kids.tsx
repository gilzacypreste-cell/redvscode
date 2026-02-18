
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Media } from '../types';
import { Play, Info, Sparkles, Star, Heart, Film, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaRow from '../components/MediaRow';
import { playSelectSound } from '../utils/soundEffects';
import { getAllMovies, getAllSeries } from '../services/supabaseService';
import { getMediaDetailsByID } from '../services/tmdb';

interface KidsProps {
  movies: Media[];
  series?: Media[];
  onSelectMedia: (media: Media) => void;
  onPlayMedia?: (media: Media) => void;
}

/* ─── Floating bubbles (matches reference design) ──────────────────── */
const bubbles = [
  { size: 40, top: '5%', left: '3%', delay: 0, opacity: 0.25 },
  { size: 24, top: '8%', right: '6%', delay: 1.5, opacity: 0.3 },
  { size: 32, top: '15%', left: '90%', delay: 0.8, opacity: 0.2 },
  { size: 18, top: '20%', left: '12%', delay: 2.2, opacity: 0.35 },
  { size: 28, top: '30%', right: '4%', delay: 0.4, opacity: 0.25 },
  { size: 14, top: '40%', left: '5%', delay: 1.8, opacity: 0.3 },
  { size: 36, top: '50%', right: '8%', delay: 1.0, opacity: 0.2 },
  { size: 20, top: '55%', left: '8%', delay: 2.5, opacity: 0.25 },
  { size: 22, top: '65%', right: '3%', delay: 0.6, opacity: 0.3 },
  { size: 16, top: '72%', left: '6%', delay: 1.3, opacity: 0.2 },
  { size: 30, top: '80%', right: '10%', delay: 2.0, opacity: 0.25 },
  { size: 12, top: '88%', left: '10%', delay: 0.9, opacity: 0.35 },
  { size: 26, top: '92%', right: '5%', delay: 1.6, opacity: 0.2 },
];

/* Sparkle decorations */
const sparkles = [
  { top: '4%', left: '25%', delay: 0.2, size: 8 },
  { top: '12%', right: '15%', delay: 1.4, size: 6 },
  { top: '28%', left: '45%', delay: 0.7, size: 10 },
  { top: '35%', right: '22%', delay: 2.1, size: 7 },
  { top: '52%', left: '30%', delay: 0.3, size: 9 },
  { top: '68%', right: '35%', delay: 1.9, size: 6 },
  { top: '78%', left: '55%', delay: 1.1, size: 8 },
  { top: '90%', left: '20%', delay: 0.5, size: 7 },
];

const FloatingBubble: React.FC<{ size: number; style: React.CSSProperties; delay: number; opacity: number }> = ({ size, style, delay, opacity }) => (
  <motion.div
    className="absolute pointer-events-none select-none z-0 rounded-full"
    style={{
      ...style,
      width: size,
      height: size,
      background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,${opacity + 0.15}), rgba(255,255,255,${opacity * 0.3}) 50%, transparent 70%)`,
      border: `1px solid rgba(255,255,255,${opacity * 0.5})`,
      boxShadow: `inset 0 -2px 6px rgba(255,255,255,${opacity * 0.2}), 0 0 ${size}px rgba(180,160,255,${opacity * 0.3})`,
    }}
    animate={{
      y: [0, -15, 5, -10, 0],
      x: [0, 5, -3, 8, 0],
      scale: [1, 1.08, 0.95, 1.05, 1],
    }}
    transition={{ duration: 8 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

const SparkleDecor: React.FC<{ style: React.CSSProperties; delay: number; size: number }> = ({ style, delay, size }) => (
  <motion.div
    className="absolute pointer-events-none select-none z-0"
    style={style}
    animate={{
      opacity: [0, 1, 0],
      scale: [0.5, 1.2, 0.5],
      rotate: [0, 180, 360],
    }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" fill="rgba(255,255,255,0.7)" />
    </svg>
  </motion.div>
);

/* ─── Colorful section title (matching reference style) ─────────────── */
const KidsSectionTitle: React.FC<{ title: string; color: string; icon: React.ReactNode }> = ({ title, color, icon }) => (
  <motion.div
    initial={{ x: -20, opacity: 0 }}
    whileInView={{ x: 0, opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    className="flex items-center gap-3 px-12 mb-4"
  >
    <motion.div
      className="flex items-center justify-center w-10 h-10 rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${color}30, ${color}15)`,
        border: `1.5px solid ${color}40`,
        backdropFilter: 'blur(10px)',
      }}
      whileHover={{ scale: 1.15, rotate: 8 }}
    >
      <span style={{ color }}>{icon}</span>
    </motion.div>
    <h2 className="text-2xl font-extrabold tracking-tight text-white">
      {title}
    </h2>
    <div
      className="h-px flex-1 rounded-full"
      style={{ background: `linear-gradient(90deg, ${color}50, transparent)` }}
    />
  </motion.div>
);

/* ════════════════════════════════════════════════════════════════════
   KIDS PAGE — Dreamy visionOS style (purple-blue gradient + bubbles)
   ════════════════════════════════════════════════════════════════════ */
const Kids: React.FC<KidsProps> = ({ movies, series = [], onSelectMedia, onPlayMedia }) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [localMovies, setLocalMovies] = useState<Media[] | null>(null);
  const [localSeries, setLocalSeries] = useState<Media[] | null>(null);

  useEffect(() => {
    if ((movies?.length || 0) === 0 && localMovies === null) {
      (async () => {
        try {
          const db = await getAllMovies();
          setLocalMovies(db.map(m => ({ ...m, type: 'movie' } as Media)));
        } catch { setLocalMovies([]); }
      })();
    }
    if ((series?.length || 0) === 0 && localSeries === null) {
      (async () => {
        try {
          const db = await getAllSeries();
          setLocalSeries(db.map(s => ({ ...s, type: 'series' } as Media)));
        } catch { setLocalSeries([]); }
      })();
    }
  }, [movies, series, localMovies, localSeries]);

  const allContent = useMemo(() => [
    ...(movies && movies.length > 0 ? movies : (localMovies || [])),
    ...(series && series.length > 0 ? series : (localSeries || [])),
  ], [movies, series, localMovies, localSeries]);

  const kidsGenres = useMemo(() => ['Animacao', 'Animation', 'Familia', 'Family', 'Comedia', 'Comedy', 'Kids', 'Aventura', 'Adventure', 'Fantasia', 'Fantasy', 'Infantil'], []);

  const kidsContent = useMemo(() => {
    const filtered = allContent.filter(m => {
      if (!m.genre || !Array.isArray(m.genre)) return false;
      return m.genre.some(g => kidsGenres.some(kg => g.toLowerCase().includes(kg.toLowerCase())));
    });
    return filtered.length > 0 ? filtered : allContent.slice(0, 50);
  }, [allContent, kidsGenres]);

  const kidsMovies = useMemo(() => kidsContent.filter(m => m.type === 'movie'), [kidsContent]);
  const kidsSeries = useMemo(() => kidsContent.filter(m => m.type === 'series'), [kidsContent]);
  const animations = useMemo(() => kidsContent.filter(m => m.genre?.some(g => g.toLowerCase().includes('anim'))), [kidsContent]);
  const adventure = useMemo(() => kidsContent.filter(m => m.genre?.some(g => g.toLowerCase().includes('avent') || g.toLowerCase().includes('adventure'))), [kidsContent]);
  const family = useMemo(() => kidsContent.filter(m => m.genre?.some(g => g.toLowerCase().includes('famil') || g.toLowerCase().includes('family'))), [kidsContent]);

  // Hero items
  const heroItems = useMemo(() => {
    const items = animations.filter(m => m.backdrop && m.poster);
    return items.slice(0, 8);
  }, [animations]);

  // Logo + Trailer from TMDB
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const logoCache = useRef<Map<string, string | null>>(new Map());
  const trailerCache = useRef<Map<string, string | null>>(new Map());

  const BACKDROP_DURATION = 5000;
  const TRAILER_DURATION = 15000;

  useEffect(() => {
    if (heroItems.length === 0) return;
    setShowTrailer(false);
    const trailerTimer = setTimeout(() => setShowTrailer(true), BACKDROP_DURATION);
    const nextTimer = setTimeout(() => {
      if (heroItems.length > 1) setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, BACKDROP_DURATION + TRAILER_DURATION);
    return () => { clearTimeout(trailerTimer); clearTimeout(nextTimer); };
  }, [heroIndex, heroItems.length]);

  useEffect(() => {
    const movie = heroItems[heroIndex];
    if (!movie) { setLogoUrl(null); setTrailerKey(null); return; }
    const cacheKey = `${movie.tmdb_id}_${movie.type}`;

    if (movie.logo_url) setLogoUrl(movie.logo_url);
    else if (logoCache.current.has(cacheKey)) setLogoUrl(logoCache.current.get(cacheKey) || null);
    else setLogoUrl(null);

    if (movie.trailer_key) setTrailerKey(movie.trailer_key);
    else if (trailerCache.current.has(cacheKey)) setTrailerKey(trailerCache.current.get(cacheKey) || null);
    else setTrailerKey(null);

    const needsLogo = !movie.logo_url && !logoCache.current.has(cacheKey);
    const needsTrailer = !movie.trailer_key && !trailerCache.current.has(cacheKey);

    if ((needsLogo || needsTrailer) && movie.tmdb_id && Number(movie.tmdb_id) > 0) {
      getMediaDetailsByID(Number(movie.tmdb_id), movie.type).then(details => {
        if (!details) return;
        if (needsLogo) { logoCache.current.set(cacheKey, details.logo || null); setLogoUrl(prev => prev || details.logo || null); }
        if (needsTrailer) { trailerCache.current.set(cacheKey, details.trailer || null); setTrailerKey(prev => prev || details.trailer || null); }
      }).catch(() => {
        if (needsLogo) logoCache.current.set(cacheKey, null);
        if (needsTrailer) trailerCache.current.set(cacheKey, null);
      });
    }
  }, [heroIndex, heroItems]);

  const heroMovie = heroItems[heroIndex];
  const heroBackdropUrl = heroMovie?.backdrop || heroMovie?.poster || '';
  const heroRating = heroMovie ? (typeof heroMovie.rating === 'number' ? heroMovie.rating : parseFloat(String(heroMovie.rating || '0'))) : 0;
  const heroStars = Array.from({ length: 5 }, (_, i) => i < Math.round((heroRating / 10) * 5));

  const handleSelect = useCallback((m: Media) => onSelectMedia(m), [onSelectMedia]);

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 15%, #6D28D9 30%, #6366F1 50%, #818CF8 65%, #93C5FD 80%, #A78BFA 100%)',
      }}
    >

      {/* ═══ DREAMY ANIMATED BACKGROUND LAYERS ═══ */}
      <div className="fixed inset-0 z-0">
        {/* Moving gradient mesh */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(ellipse at 20% 30%, rgba(236,72,153,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(96,165,250,0.25) 0%, transparent 50%)',
              'radial-gradient(ellipse at 60% 20%, rgba(167,139,250,0.3) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(52,211,153,0.2) 0%, transparent 50%)',
              'radial-gradient(ellipse at 40% 60%, rgba(251,191,36,0.2) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(236,72,153,0.25) 0%, transparent 50%)',
              'radial-gradient(ellipse at 20% 30%, rgba(236,72,153,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(96,165,250,0.25) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Soft light overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* ═══ FLOATING BUBBLES ═══ */}
      {bubbles.map((b, i) => (
        <FloatingBubble
          key={`bubble-${i}`}
          size={b.size}
          opacity={b.opacity}
          style={{ top: b.top, left: (b as any).left, right: (b as any).right }}
          delay={b.delay}
        />
      ))}

      {/* ═══ SPARKLE DECORATIONS ═══ */}
      {sparkles.map((s, i) => (
        <SparkleDecor
          key={`sparkle-${i}`}
          style={{ top: s.top, left: (s as any).left, right: (s as any).right }}
          delay={s.delay}
          size={s.size}
        />
      ))}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="relative z-10 w-full pb-24">

        {/* ─── KIDS HEADER ─── */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-30 pt-24 pb-4 px-12"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="flex items-center gap-2.5 px-6 py-3 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles size={20} className="text-yellow-200" />
              <span className="text-lg font-extrabold tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                REDX Kids
              </span>
            </motion.div>

            {/* Rainbow line */}
            <div className="flex-1 h-1 rounded-full overflow-hidden">
              <motion.div
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, #FF6B6B, #FFE66D, #4ECDC4, #60A5FA, #A78BFA, #F472B6, #FF6B6B)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>

        {/* ─── HERO BANNER (Glass card with backdrop) ─── */}
        {heroMovie && (
          <div className="relative w-full px-12 mt-2 mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`kids-hero-${heroMovie.id}-${heroIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.7 }}
                className="relative w-full rounded-[32px] overflow-hidden"
                style={{
                  height: 'min(55vh, 480px)',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(40px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 16px 64px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)',
                }}
              >
                {/* Backdrop image (right side) */}
                <div className="absolute inset-0 overflow-hidden rounded-[32px]">
                  <img
                    src={heroMovie.backdrop || heroMovie.poster}
                    alt={heroMovie.title}
                    className="absolute right-0 top-0 w-[65%] h-full object-cover"
                    loading="eager"
                    style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.8) 30%, transparent 90%)' }}
                  />

                  {/* Trailer YouTube overlay */}
                  {showTrailer && trailerKey && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.2 }}
                      className="absolute right-0 top-0 w-[65%] h-full z-10 overflow-hidden"
                      style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 40%, transparent 90%)' }}
                    >
                      <iframe
                        title={`Trailer ${heroMovie.title}`}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] h-[56.25vw] min-w-full min-h-full pointer-events-none"
                        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailerKey}&modestbranding=1&iv_load_policy=3&disablekb=1`}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                      />
                    </motion.div>
                  )}

                  {/* Glass overlay to soften image */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to right, rgba(139,92,246,0.6) 0%, rgba(139,92,246,0.2) 35%, transparent 65%)',
                    }}
                  />
                </div>

                {/* Glass specular highlight on top edge */}
                <div
                  className="absolute inset-x-0 top-0 h-[40%] pointer-events-none z-20"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%)',
                  }}
                />

                {/* Hero content (left side) */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                  className="relative z-20 flex flex-col justify-center h-full p-10 max-w-[50%]"
                >
                  {/* Logo or title */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.7 }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={heroMovie.title}
                        className="max-h-[90px] max-w-[320px] w-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                      />
                    ) : (
                      <h2 className="text-4xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.3)] leading-tight">
                        {heroMovie.title}
                      </h2>
                    )}
                  </motion.div>

                  {/* Rating stars + type badges */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.6 }}
                    className="flex items-center gap-3 flex-wrap mt-4"
                  >
                    <div className="flex gap-0.5">
                      {heroStars.map((filled, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={filled ? '#FFE66D' : 'transparent'}
                          stroke={filled ? '#FFE66D' : 'rgba(255,255,255,0.3)'}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <span
                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#fff',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {heroMovie.type === 'series' ? 'Serie' : 'Filme'}
                    </span>
                    <span
                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full"
                      style={{
                        background: 'rgba(255,230,109,0.2)',
                        border: '1px solid rgba(255,230,109,0.35)',
                        color: '#FFE66D',
                      }}
                    >
                      Kids
                    </span>
                  </motion.div>

                  {/* Description */}
                  {heroMovie.description && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45, duration: 0.7 }}
                      className="text-white/80 text-sm leading-relaxed line-clamp-2 mt-3"
                    >
                      {heroMovie.description}
                    </motion.p>
                  )}

                  {/* Action buttons */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.55, duration: 0.6 }}
                    className="flex items-center gap-3 mt-5"
                    data-nav-row={0}
                  >
                    <button
                      tabIndex={0}
                      data-nav-item
                      data-nav-col={0}
                      className="flex items-center justify-center gap-2 px-7 py-3 rounded-full font-bold text-sm
                        hover:scale-[1.03] active:scale-95 transition-all duration-200 outline-none
                        focus-visible:ring-2 focus-visible:ring-white focus-visible:scale-[1.03]"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        color: '#6D28D9',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 40px rgba(255,255,255,0.1)',
                      }}
                      onClick={() => {
                        playSelectSound();
                        onPlayMedia ? onPlayMedia(heroMovie) : onSelectMedia(heroMovie);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); playSelectSound(); onPlayMedia ? onPlayMedia(heroMovie) : onSelectMedia(heroMovie); } }}
                    >
                      <Play size={16} fill="currentColor" /> Assistir Agora
                    </button>

                    <button
                      tabIndex={0}
                      data-nav-item
                      data-nav-col={1}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm
                        hover:scale-[1.03] active:scale-95 transition-all duration-200 outline-none
                        focus-visible:ring-2 focus-visible:ring-white focus-visible:scale-[1.03]"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1.5px solid rgba(255,255,255,0.25)',
                        color: '#fff',
                      }}
                      onClick={() => { playSelectSound(); onSelectMedia(heroMovie); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); playSelectSound(); onSelectMedia(heroMovie); } }}
                    >
                      <Info size={15} /> Detalhes
                    </button>
                  </motion.div>
                </motion.div>

                {/* Play button on right side */}
                <motion.button
                  className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255,255,255,0.35)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playSelectSound();
                    onPlayMedia ? onPlayMedia(heroMovie) : onSelectMedia(heroMovie);
                  }}
                >
                  <Play size={28} fill="white" stroke="white" className="ml-1" />
                </motion.button>

                {/* Pagination dots */}
                {heroItems.length > 1 && (
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                    {heroItems.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setShowTrailer(false); setHeroIndex(idx); }}
                        aria-label={`Slide ${idx + 1}`}
                        className="h-2 rounded-full transition-all duration-500 cursor-pointer"
                        style={{
                          width: idx === heroIndex ? 32 : 8,
                          background: idx === heroIndex
                            ? 'rgba(255,255,255,0.9)'
                            : 'rgba(255,255,255,0.3)',
                          boxShadow: idx === heroIndex ? '0 0 12px rgba(255,255,255,0.5)' : 'none',
                        }}
                      >
                        {idx === heroIndex && (
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: 'rgba(255,255,255,0.6)',
                              animation: `banner-progress ${(BACKDROP_DURATION + TRAILER_DURATION) / 1000}s linear forwards`,
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ─── CONTENT ROWS ─── */}
        <div className="space-y-2 pt-4">
          {kidsContent.length > 0 && (
            <>
              <KidsSectionTitle title="Populares" color="#FF6B6B" icon={<Heart size={18} fill="currentColor" />} />
              <MediaRow title="" items={kidsContent.slice(0, 20)} onSelect={handleSelect} onPlay={onPlayMedia} rowIndex={1} />
            </>
          )}

          {animations.length > 0 && (
            <>
              <KidsSectionTitle title="Aventuras Magicas" color="#A78BFA" icon={<Sparkles size={18} />} />
              <MediaRow title="" items={animations.slice(0, 20)} onSelect={handleSelect} onPlay={onPlayMedia} rowIndex={2} />
            </>
          )}

          {adventure.length > 0 && (
            <>
              <KidsSectionTitle title="Amigos Animais" color="#4ECDC4" icon={<Star size={18} fill="currentColor" />} />
              <MediaRow title="" items={adventure.slice(0, 20)} onSelect={handleSelect} onPlay={onPlayMedia} rowIndex={3} />
            </>
          )}

          {family.length > 0 && (
            <>
              <KidsSectionTitle title="Familia Feliz" color="#FFE66D" icon={<Heart size={18} fill="currentColor" />} />
              <MediaRow title="" items={family.slice(0, 20)} onSelect={handleSelect} onPlay={onPlayMedia} rowIndex={4} />
            </>
          )}

          {kidsSeries.length > 0 && (
            <>
              <KidsSectionTitle title="Herois Divertidos" color="#60A5FA" icon={<Film size={18} />} />
              <MediaRow title="" items={kidsSeries.slice(0, 20)} onSelect={handleSelect} onPlay={onPlayMedia} rowIndex={5} />
            </>
          )}

          {kidsMovies.length > 0 && (
            <>
              <KidsSectionTitle title="Desenhos" color="#F472B6" icon={<Palette size={18} />} />
              <MediaRow title="" items={kidsMovies.slice(0, 20)} onSelect={handleSelect} onPlay={onPlayMedia} rowIndex={6} />
            </>
          )}

          {kidsContent.length > 36 && (
            <>
              <KidsSectionTitle title="Mais para Explorar" color="#34D399" icon={<Sparkles size={18} />} />
              <MediaRow title="" items={kidsContent.slice(36, 56)} onSelect={handleSelect} onPlay={onPlayMedia} rowIndex={7} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Kids);
