
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Media } from '../types';
import { Play, Info, Sparkles, Star, Heart } from 'lucide-react';
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

/* ─── Animated floating shapes (pure CSS via inline styles) ──────── */
const shapes = [
  { color: '#FF6B6B', size: 28, top: '6%', left: '4%', delay: 0, shape: 'circle' },
  { color: '#4ECDC4', size: 20, top: '10%', right: '7%', delay: 1.2, shape: 'triangle' },
  { color: '#FFE66D', size: 24, top: '22%', left: '8%', delay: 0.6, shape: 'star' },
  { color: '#A78BFA', size: 18, top: '18%', right: '3%', delay: 2.0, shape: 'circle' },
  { color: '#F472B6', size: 22, top: '35%', left: '2%', delay: 1.5, shape: 'diamond' },
  { color: '#34D399', size: 26, top: '45%', right: '5%', delay: 0.3, shape: 'star' },
  { color: '#60A5FA', size: 20, top: '58%', left: '6%', delay: 2.5, shape: 'circle' },
  { color: '#FBBF24', size: 16, top: '65%', right: '8%', delay: 1.8, shape: 'triangle' },
  { color: '#F87171', size: 22, top: '75%', left: '3%', delay: 0.9, shape: 'diamond' },
  { color: '#818CF8', size: 18, top: '82%', right: '4%', delay: 2.2, shape: 'star' },
  { color: '#2DD4BF', size: 14, top: '88%', left: '7%', delay: 1.0, shape: 'circle' },
  { color: '#FB923C', size: 20, top: '92%', right: '6%', delay: 0.5, shape: 'triangle' },
];

const FloatingShape: React.FC<{ color: string; size: number; style: React.CSSProperties; delay: number; shape: string }> = ({ color, size, style, delay, shape }) => {
  const renderShape = () => {
    switch (shape) {
      case 'star':
        return <Star size={size} fill={color} stroke="none" />;
      case 'triangle':
        return (
          <div style={{
            width: 0, height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
            opacity: 0.7,
          }} />
        );
      case 'diamond':
        return (
          <div style={{
            width: size, height: size,
            background: color,
            transform: 'rotate(45deg)',
            borderRadius: 3,
            opacity: 0.7,
          }} />
        );
      default:
        return (
          <div style={{
            width: size, height: size,
            background: color,
            borderRadius: '50%',
            opacity: 0.6,
          }} />
        );
    }
  };

  return (
    <motion.div
      className="absolute pointer-events-none select-none z-0"
      style={{ ...style, filter: `drop-shadow(0 0 ${size / 2}px ${color}40)` }}
      animate={{
        y: [0, -20, 0, 16, 0],
        rotate: [0, 15, -12, 8, 0],
        scale: [1, 1.15, 0.9, 1.1, 1],
        opacity: [0.5, 0.8, 0.5, 0.7, 0.5],
      }}
      transition={{ duration: 7 + delay * 0.5, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {renderShape()}
    </motion.div>
  );
};

/* ─── Animated rainbow gradient bar ─────────────────────────────── */
const RainbowBar: React.FC = () => (
  <div className="w-full h-1 relative overflow-hidden rounded-full">
    <motion.div
      className="absolute inset-0 h-full"
      style={{
        background: 'linear-gradient(90deg, #FF6B6B, #FFE66D, #4ECDC4, #60A5FA, #A78BFA, #F472B6, #FF6B6B)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

/* ─── Colorful section title ────────────────────────────────────── */
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
      style={{ background: `${color}25`, border: `2px solid ${color}50` }}
      whileHover={{ scale: 1.2, rotate: 10 }}
    >
      <span style={{ color }}>{icon}</span>
    </motion.div>
    <h2 className="text-2xl font-extrabold tracking-tight" style={{ color }}>
      {title}
    </h2>
    <div className="h-px flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
  </motion.div>
);

/* ════════════════════════════════════════════════════════════════════
   KIDS PAGE
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

  /* Animated gradient colors that cycle for the background */
  const bgColors = [
    'radial-gradient(ellipse at 20% 20%, rgba(255,107,107,0.15) 0%, transparent 50%)',
    'radial-gradient(ellipse at 80% 30%, rgba(78,205,196,0.12) 0%, transparent 50%)',
    'radial-gradient(ellipse at 50% 80%, rgba(167,139,250,0.10) 0%, transparent 50%)',
    'radial-gradient(ellipse at 30% 60%, rgba(255,230,109,0.08) 0%, transparent 50%)',
  ].join(', ');

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: '#0c0c18' }}>

      {/* ═══ ANIMATED BACKGROUND ═══ */}
      <div className="fixed inset-0 z-0">
        {/* Base dark with colorful radial glows */}
        <div className="absolute inset-0" style={{ background: bgColors }} />

        {/* Animated color wash */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(ellipse at 30% 40%, rgba(255,107,107,0.08) 0%, transparent 60%)',
              'radial-gradient(ellipse at 70% 60%, rgba(78,205,196,0.08) 0%, transparent 60%)',
              'radial-gradient(ellipse at 40% 70%, rgba(167,139,250,0.08) 0%, transparent 60%)',
              'radial-gradient(ellipse at 60% 30%, rgba(255,230,109,0.08) 0%, transparent 60%)',
              'radial-gradient(ellipse at 30% 40%, rgba(255,107,107,0.08) 0%, transparent 60%)',
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Blurred hero backdrop (when available) */}
        {heroBackdropUrl && (
          <div className="absolute inset-0 transition-opacity duration-700">
            <img
              src={heroBackdropUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: 'blur(80px) brightness(0.3) saturate(1.5)', transform: 'scale(1.2)' }}
            />
            <div className="absolute inset-0 bg-[#0c0c18]/60" />
          </div>
        )}
      </div>

      {/* ═══ FLOATING SHAPES ═══ */}
      {shapes.map((item, i) => (
        <FloatingShape
          key={i}
          color={item.color}
          size={item.size}
          shape={item.shape}
          style={{ top: item.top, left: item.left, right: (item as any).right }}
          delay={item.delay}
        />
      ))}

      {/* ═══ CONTENT ═══ */}
      <div className="relative z-10 w-full pb-24">

        {/* ─── KIDS HEADER BAR ─── */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-30 pt-24 pb-4 px-12"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="flex items-center gap-2 px-5 py-2.5 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(167,139,250,0.2), rgba(78,205,196,0.2))',
                border: '1.5px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(20px)',
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles size={18} className="text-yellow-300" />
              <span className="text-lg font-extrabold tracking-wide bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                KIDS
              </span>
            </motion.div>
            <div className="flex-1">
              <RainbowBar />
            </div>
          </div>
        </motion.div>

        {/* ─── HERO BANNER KIDS ─── */}
        {heroMovie && (
          <div className="relative w-full h-[75vh] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`kids-banner-${heroMovie.id}-${heroIndex}`}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                {/* Backdrop */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={heroMovie.backdrop || heroMovie.poster}
                    alt={heroMovie.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>

                {/* Trailer YouTube */}
                {showTrailer && trailerKey && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2 }}
                    className="absolute inset-0 z-10 overflow-hidden"
                  >
                    <iframe
                      title={`Trailer ${heroMovie.title}`}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] h-[56.25vw] min-w-full min-h-full pointer-events-none"
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailerKey}&modestbranding=1&iv_load_policy=3&disablekb=1`}
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </motion.div>
                )}

                {/* Colorful gradients overlay */}
                <div className="absolute inset-0 z-20" style={{
                  background: 'linear-gradient(to right, rgba(12,12,24,0.85) 0%, rgba(12,12,24,0.3) 40%, transparent 70%)',
                }} />
                <div className="absolute inset-0 z-20" style={{
                  background: 'linear-gradient(to top, #0c0c18 0%, rgba(12,12,24,0.5) 35%, transparent 60%)',
                }} />
                {/* Subtle color tint on bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 z-20" style={{
                  background: 'linear-gradient(to top, rgba(167,139,250,0.05), transparent)',
                }} />

                {/* ═══ HERO GLASS CARD ═══ */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                  className="absolute bottom-[14%] left-8 md:left-12 z-30 w-[400px] max-w-[90vw]"
                >
                  <div
                    className="rounded-3xl p-7 flex flex-col items-start gap-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                      backdropFilter: 'blur(40px) saturate(1.8)',
                      WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                      border: '1.5px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.1) inset',
                    }}
                  >
                    {/* Logo or title */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.7 }}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={heroMovie.title}
                          className="max-h-[80px] max-w-[300px] w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
                        />
                      ) : (
                        <h2 className="text-3xl font-black text-white drop-shadow-2xl leading-tight">
                          {heroMovie.title}
                        </h2>
                      )}
                    </motion.div>

                    {/* Rating stars + badges */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="flex items-center gap-3 flex-wrap"
                    >
                      <div className="flex gap-0.5">
                        {heroStars.map((filled, i) => (
                          <motion.span
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.08 }}
                            className={`text-sm ${filled ? 'text-yellow-300' : 'text-white/20'}`}
                          >
                            {'*'}
                          </motion.span>
                        ))}
                      </div>
                      <span
                        className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, rgba(78,205,196,0.25), rgba(96,165,250,0.25))',
                          border: '1px solid rgba(78,205,196,0.3)',
                          color: '#4ECDC4',
                        }}
                      >
                        {heroMovie.type === 'series' ? 'Serie' : 'Filme'}
                      </span>
                      <span
                        className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,230,109,0.2), rgba(251,191,36,0.2))',
                          border: '1px solid rgba(255,230,109,0.3)',
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
                        transition={{ delay: 0.5, duration: 0.7 }}
                        className="text-white/70 text-[13px] leading-relaxed line-clamp-3"
                      >
                        {heroMovie.description}
                      </motion.p>
                    )}

                    {/* Action buttons */}
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.6 }}
                      className="flex items-center gap-3 w-full mt-1"
                      data-nav-row={0}
                    >
                      <button
                        tabIndex={0}
                        data-nav-item
                        data-nav-col={0}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm
                          shadow-[0_4px_16px_rgba(255,107,107,0.3)]
                          hover:scale-[1.03] active:scale-95
                          transition-all duration-200 outline-none
                          focus-visible:ring-2 focus-visible:ring-white focus-visible:scale-[1.03]"
                        style={{
                          background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                          color: '#fff',
                        }}
                        onClick={() => {
                          playSelectSound();
                          onPlayMedia ? onPlayMedia(heroMovie) : onSelectMedia(heroMovie);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); playSelectSound(); onPlayMedia ? onPlayMedia(heroMovie) : onSelectMedia(heroMovie); } }}
                      >
                        <Play size={15} fill="white" /> Assistir
                      </button>

                      <button
                        tabIndex={0}
                        data-nav-item
                        data-nav-col={1}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm
                          hover:scale-[1.03] active:scale-95
                          transition-all duration-200 outline-none
                          focus-visible:ring-2 focus-visible:ring-white focus-visible:scale-[1.03]"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: '1.5px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                        }}
                        onClick={() => { playSelectSound(); onSelectMedia(heroMovie); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); playSelectSound(); onSelectMedia(heroMovie); } }}
                      >
                        <Info size={15} /> Detalhes
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Progress indicators */}
            {heroItems.length > 1 && (
              <div className="absolute bottom-6 right-12 flex gap-2 z-30">
                {heroItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setShowTrailer(false); setHeroIndex(idx); }}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer
                      ${idx === heroIndex ? 'w-10' : 'w-2'}`}
                    style={{
                      background: idx === heroIndex
                        ? 'linear-gradient(90deg, #FF6B6B, #A78BFA, #4ECDC4)'
                        : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {idx === heroIndex && (
                      <div
                        className="h-full rounded-full bg-white/60"
                        style={{ animation: `banner-progress ${(BACKDROP_DURATION + TRAILER_DURATION) / 1000}s linear forwards` }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── RAINBOW DIVIDER ─── */}
        <div className="px-12 pt-6 pb-2">
          <RainbowBar />
        </div>

        {/* ─── CONTENT ROWS ─── */}
        <div className="space-y-2 pt-4">
          {kidsContent.length > 0 && (
            <>
              <KidsSectionTitle title="Populares" color="#FF6B6B" icon={<Heart size={18} fill="currentColor" />} />
              <MediaRow
                title=""
                items={kidsContent.slice(0, 20)}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={1}
              />
            </>
          )}

          {animations.length > 0 && (
            <>
              <KidsSectionTitle title="Animacoes Incriveis" color="#A78BFA" icon={<Sparkles size={18} />} />
              <MediaRow
                title=""
                items={animations.slice(0, 20)}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={2}
              />
            </>
          )}

          {adventure.length > 0 && (
            <>
              <KidsSectionTitle title="Aventuras Magicas" color="#4ECDC4" icon={<Star size={18} fill="currentColor" />} />
              <MediaRow
                title=""
                items={adventure.slice(0, 20)}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={3}
              />
            </>
          )}

          {family.length > 0 && (
            <>
              <KidsSectionTitle title="Para Toda Familia" color="#FFE66D" icon={<Heart size={18} fill="currentColor" />} />
              <MediaRow
                title=""
                items={family.slice(0, 20)}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={4}
              />
            </>
          )}

          {kidsSeries.length > 0 && (
            <>
              <KidsSectionTitle title="Series para Criancas" color="#60A5FA" icon={<Sparkles size={18} />} />
              <MediaRow
                title=""
                items={kidsSeries.slice(0, 20)}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={5}
              />
            </>
          )}

          {kidsMovies.length > 0 && (
            <>
              <KidsSectionTitle title="Filmes Infantis" color="#F472B6" icon={<Star size={18} fill="currentColor" />} />
              <MediaRow
                title=""
                items={kidsMovies.slice(0, 20)}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={6}
              />
            </>
          )}

          {kidsContent.length > 36 && (
            <>
              <KidsSectionTitle title="Mais para Explorar" color="#34D399" icon={<Sparkles size={18} />} />
              <MediaRow
                title=""
                items={kidsContent.slice(36, 56)}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={7}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Kids);
