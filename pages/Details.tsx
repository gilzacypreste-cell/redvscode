import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Media, CastMember, Episode, Season, SimilarSeries } from '../types';
import {
  fetchSeriesDetail,
  fetchMovieDetail,
  fetchSeriesCredits,
  fetchSeasonEpisodes,
  fetchSimilarSeries,
  fetchSeriesProviders,
  getImageUrl,
  getLogo,
  getTrailer,
} from '../services/tmdb';
import {
  getSeriesByTmdbId,
  getSeasons as getDBSeasons,
  getEpisodes as getDBEpisodes,
} from '../services/supabaseService';
import { userService } from '../services/userService';
import { playSelectSound, playBackSound } from '../utils/soundEffects';
import {
  Play,
  ArrowLeft,
  Plus,
  Check,
  Clock,
  Star,
  Calendar,
  Film,
  Tv,
  Users,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';

interface DetailsProps {
  media: Media;
  onPlay: () => void;
  onBack: () => void;
}

/* ------------------------------------------------------------------ */
/*  Glass helper                                                       */
/* ------------------------------------------------------------------ */
const glass = (opacity = 0.08, blur = 40) => ({
  background: `linear-gradient(135deg, rgba(255,255,255,${opacity}) 0%, rgba(255,255,255,${opacity * 0.3}) 100%)`,
  backdropFilter: `blur(${blur}px) saturate(1.6)`,
  WebkitBackdropFilter: `blur(${blur}px) saturate(1.6)`,
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
});

const Details: React.FC<DetailsProps> = ({ media, onPlay, onBack }) => {
  /* ───── state ───── */
  const [detail, setDetail] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [similar, setSimilar] = useState<SimilarSeries[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  // Series-specific
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasonDropdown, setSeasonDropdown] = useState(false);
  const [dbSeasons, setDbSeasons] = useState<any[]>([]);

  // Library
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);

  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSeries = media.type === 'series';
  const tmdbId = media.tmdb_id ? Number(media.tmdb_id) : 0;

  /* ───── initial data fetch ───── */
  useEffect(() => {
    if (!tmdbId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const [det, cred, sim, prov, logo, trailer] = await Promise.all([
          isSeries ? fetchSeriesDetail(tmdbId) : fetchMovieDetail(tmdbId),
          fetchSeriesCredits(tmdbId, isSeries ? 'series' : 'movie'),
          fetchSimilarSeries(tmdbId, isSeries ? 'series' : 'movie'),
          fetchSeriesProviders(tmdbId, isSeries ? 'series' : 'movie'),
          getLogo(tmdbId, isSeries ? 'series' : 'movie'),
          getTrailer(tmdbId, isSeries ? 'series' : 'movie'),
        ]);
        setDetail(det);
        setCast(cred.cast?.slice(0, 12) || []);
        setSimilar(sim?.slice(0, 12) || []);
        setProviders(prov || []);
        setLogoUrl(logo || null);
        setTrailerKey(trailer || media.trailer_key || null);

        if (isSeries && det?.seasons) {
          const realSeasons = det.seasons.filter((s: any) => s.season_number > 0);
          setSeasons(realSeasons);
          if (realSeasons.length > 0) setSelectedSeason(realSeasons[0].season_number);
        }

        // Check library
        const id = media.tmdb_id || media.id;
        if (id) {
          userService.checkStatus(id).then(s => {
            setInWatchlist(s.inWatchlist);
            setInWatchLater(s.inWatchLater);
          }).catch(() => {});
        }

        // DB episodes for series
        if (isSeries) {
          const dbSeries = await getSeriesByTmdbId(tmdbId);
          if (dbSeries) {
            const dbS = await getDBSeasons(dbSeries.id);
            setDbSeasons(dbS);
          }
        }
      } catch (err) {
        console.error('Details load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tmdbId, isSeries, media.id, media.tmdb_id, media.trailer_key]);

  /* ───── episode fetch on season change ───── */
  useEffect(() => {
    if (!isSeries || !tmdbId || selectedSeason < 1) return;
    fetchSeasonEpisodes(tmdbId, selectedSeason).then(async eps => {
      // Merge DB stream_urls
      const dbSeason = dbSeasons.find((s: any) => s.season_number === selectedSeason);
      if (dbSeason) {
        try {
          const dbEps = await getDBEpisodes(dbSeason.id);
          eps = eps.map(ep => {
            const match = dbEps.find(d => d.episode_number === ep.episode_number);
            return match ? { ...ep, stream_url: match.stream_url } : ep;
          });
        } catch {}
      }
      setEpisodes(eps);
    }).catch(() => setEpisodes([]));
  }, [selectedSeason, tmdbId, isSeries, dbSeasons]);

  /* ───── library toggles ───── */
  const toggleWatchlist = useCallback(async () => {
    const id = media.tmdb_id || media.id;
    if (!id) return;
    setInWatchlist(p => !p);
    try {
      const r = await userService.toggleLibraryItem(id, isSeries ? 'tv' : 'movie', 'watchlist');
      if (r === 'auth_required') setInWatchlist(p => !p);
    } catch { setInWatchlist(p => !p); }
  }, [media, isSeries]);

  const toggleWatchLater = useCallback(async () => {
    const id = media.tmdb_id || media.id;
    if (!id) return;
    setInWatchLater(p => !p);
    try {
      const r = await userService.toggleLibraryItem(id, isSeries ? 'tv' : 'movie', 'watch_later');
      if (r === 'auth_required') setInWatchLater(p => !p);
    } catch { setInWatchLater(p => !p); }
  }, [media, isSeries]);

  /* ───── computed ───── */
  const backdropUrl = useMemo(() => {
    if (detail?.backdrop_path) return getImageUrl(detail.backdrop_path, 'original');
    return media.backdrop || media.poster || '';
  }, [detail, media]);

  const title = detail?.name || detail?.title || media.title;
  const overview = detail?.overview || media.description || '';
  const year = detail?.first_air_date?.slice(0, 4) || detail?.release_date?.slice(0, 4) || media.year;
  const rating = detail?.vote_average ? Number(detail.vote_average).toFixed(1) : null;
  const genres = detail?.genres?.map((g: any) => g.name) || media.genre || [];
  const runtime = detail?.runtime ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m` : media.duration;
  const tagline = detail?.tagline || '';
  const starCount = rating ? Math.round((Number(rating) / 10) * 5) : 0;

  /* ───── keyboard ───── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (showTrailer) { setShowTrailer(false); return; }
        if (seasonDropdown) { setSeasonDropdown(false); return; }
        playBackSound();
        onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack, showTrailer, seasonDropdown]);

  /* ───── loading ───── */
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black text-white">
      {/* ══════ HERO BACKDROP ══════ */}
      <div className="relative w-full h-[75vh] min-h-[500px]">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={backdropUrl} alt={title} className="w-full h-full object-cover object-top" />
          {/* Cinematic gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* Trailer overlay */}
        <AnimatePresence>
          {showTrailer && trailerKey && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20"
            >
              <iframe
                title="Trailer"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] h-[56.25vw] min-w-full min-h-full pointer-events-none"
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&controls=0&showinfo=0&rel=0&modestbranding=1`}
                allow="autoplay; encrypted-media"
              />
              <button
                onClick={() => setShowTrailer(false)}
                className="absolute top-6 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center"
                style={glass(0.12, 30)}
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => { playBackSound(); onBack(); }}
          className="absolute top-6 left-6 z-30 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={glass(0.12, 30)}
        >
          <ArrowLeft size={20} />
        </motion.button>

        {/* ══════ HERO CONTENT (inside backdrop area) ══════ */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-12 pb-10">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            {/* Logo or title */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className="max-h-[80px] max-w-[400px] w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] mb-4"
              />
            ) : (
              <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-2xl mb-4 text-balance leading-tight">
                {title}
              </h1>
            )}

            {/* Tagline */}
            {tagline && (
              <p className="text-base text-white/60 italic mb-3 font-medium">{tagline}</p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {rating && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={glass(0.1, 20)}>
                  <Star size={14} className="text-yellow-400" fill="currentColor" />
                  <span className="text-sm font-bold text-white">{rating}</span>
                  <span className="text-xs text-white/50">/10</span>
                </div>
              )}
              {year && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={glass(0.06, 20)}>
                  <Calendar size={13} className="text-white/60" />
                  <span className="text-sm font-medium text-white/80">{year}</span>
                </div>
              )}
              {runtime && !isSeries && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={glass(0.06, 20)}>
                  <Clock size={13} className="text-white/60" />
                  <span className="text-sm font-medium text-white/80">{runtime}</span>
                </div>
              )}
              {isSeries && detail?.number_of_seasons > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={glass(0.06, 20)}>
                  <Tv size={13} className="text-white/60" />
                  <span className="text-sm font-medium text-white/80">
                    {detail.number_of_seasons} Temporada{detail.number_of_seasons > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {isSeries ? (
                <Tv size={14} className="text-[#E50914]" />
              ) : (
                <Film size={14} className="text-[#E50914]" />
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {genres.slice(0, 4).map((g: string) => (
                  <span
                    key={g}
                    className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full text-white/70"
                    style={glass(0.06, 20)}
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3">
              {/* Play button */}
              <button
                onClick={() => { playSelectSound(); onPlay(); }}
                className="flex items-center gap-2.5 px-7 py-3 rounded-2xl bg-white text-black font-bold text-sm
                  hover:bg-white/90 hover:scale-[1.03] active:scale-95
                  transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Play size={18} fill="black" /> Assistir
              </button>

              {/* Trailer */}
              {trailerKey && (
                <button
                  onClick={() => { playSelectSound(); setShowTrailer(true); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm text-white
                    hover:scale-[1.03] active:scale-95 transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={glass(0.1, 30)}
                >
                  <Play size={16} /> Trailer
                </button>
              )}

              {/* Watchlist */}
              <button
                onClick={() => { playSelectSound(); toggleWatchlist(); }}
                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200
                  hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white
                  ${inWatchlist ? 'bg-green-500/20 border-green-400/40' : ''}`}
                style={!inWatchlist ? glass(0.1, 30) : { ...glass(0.1, 30), borderColor: 'rgba(74,222,128,0.4)' }}
                title={inWatchlist ? 'Remover da Lista' : 'Minha Lista'}
              >
                {inWatchlist ? <Check size={18} /> : <Plus size={18} />}
              </button>

              {/* Watch later */}
              <button
                onClick={() => { playSelectSound(); toggleWatchLater(); }}
                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200
                  hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white
                  ${inWatchLater ? 'bg-blue-500/20 border-blue-400/40' : ''}`}
                style={!inWatchLater ? glass(0.1, 30) : { ...glass(0.1, 30), borderColor: 'rgba(96,165,250,0.4)' }}
                title={inWatchLater ? 'Remover' : 'Assistir Depois'}
              >
                <Clock size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══════ CONTENT AREA ══════ */}
      <div className="relative z-10 -mt-4">
        {/* Overview */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="px-12 py-8 max-w-4xl"
        >
          <p className="text-base text-white/70 leading-relaxed">{overview}</p>
        </motion.section>

        {/* Star rating visual */}
        {rating && (
          <div className="px-12 pb-6 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < starCount ? 'text-yellow-400' : 'text-white/15'}
                fill={i < starCount ? 'currentColor' : 'none'}
              />
            ))}
            <span className="ml-2 text-sm text-white/40">{rating}</span>
          </div>
        )}

        {/* ══════ SEASONS & EPISODES (Series only) ══════ */}
        {isSeries && seasons.length > 0 && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="px-12 py-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold">Episodios</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />

              {/* Season selector */}
              <div className="relative">
                <button
                  onClick={() => setSeasonDropdown(p => !p)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={glass(0.1, 30)}
                >
                  Temporada {selectedSeason}
                  <ChevronDown size={14} className={`transition-transform ${seasonDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {seasonDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 min-w-[180px]"
                      style={glass(0.15, 50)}
                    >
                      {seasons.map(s => (
                        <button
                          key={s.season_number}
                          onClick={() => {
                            setSelectedSeason(s.season_number);
                            setSeasonDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors
                            ${s.season_number === selectedSeason ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                        >
                          Temporada {s.season_number}
                          {s.episode_count ? <span className="text-white/30 ml-2">({s.episode_count} ep)</span> : null}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Episode list */}
            <div className="flex flex-col gap-3">
              {episodes.map((ep, idx) => (
                <motion.div
                  key={ep.id || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-4 rounded-2xl p-3 transition-all hover:bg-white/[0.06] group cursor-pointer"
                  onClick={() => {
                    playSelectSound();
                    onPlay();
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative w-40 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                    {ep.still_path ? (
                      <img
                        src={getImageUrl(ep.still_path, 'w500')}
                        alt={ep.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Film size={24} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <Play size={24} fill="white" className="text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/30 text-xs font-bold">{ep.episode_number}</span>
                      <h4 className="text-sm font-semibold text-white truncate">{ep.name}</h4>
                    </div>
                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{ep.overview}</p>
                  </div>

                  {/* Stream badge */}
                  {ep.stream_url && (
                    <div className="flex-shrink-0 px-2 py-1 rounded-lg bg-[#E50914]/20 text-[#E50914] text-[10px] font-bold uppercase tracking-wider">
                      HD
                    </div>
                  )}

                  <ChevronRight size={16} className="text-white/20 flex-shrink-0 group-hover:text-white/50 transition-colors" />
                </motion.div>
              ))}

              {episodes.length === 0 && (
                <div className="py-12 text-center text-white/20 text-sm">Nenhum episodio disponivel</div>
              )}
            </div>
          </motion.section>
        )}

        {/* ══════ CAST ══════ */}
        {cast.length > 0 && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="px-12 py-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <Users size={18} className="text-[#E50914]" />
              <h2 className="text-2xl font-bold">Elenco</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {cast.map(actor => (
                <div
                  key={actor.id}
                  className="flex-shrink-0 w-28 flex flex-col items-center gap-2 group cursor-default"
                >
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden transition-transform group-hover:scale-110"
                    style={glass(0.06, 20)}
                  >
                    {actor.profile_path ? (
                      <img
                        src={getImageUrl(actor.profile_path, 'w200')}
                        alt={actor.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl font-bold">
                        {actor.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-white truncate w-full">{actor.name}</p>
                    <p className="text-[10px] text-white/40 truncate w-full">{actor.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════ STREAMING PROVIDERS ══════ */}
        {providers.length > 0 && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="px-12 py-6"
          >
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Disponivel em</h3>
            <div className="flex gap-3">
              {providers.map((p: any) => (
                <div
                  key={p.provider_id}
                  className="w-12 h-12 rounded-xl overflow-hidden transition-transform hover:scale-110"
                  style={glass(0.06, 20)}
                  title={p.provider_name}
                >
                  <img
                    src={getImageUrl(p.logo_path, 'w200')}
                    alt={p.provider_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════ SIMILAR TITLES ══════ */}
        {similar.length > 0 && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="px-12 py-6 pb-20"
          >
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold">Titulos Semelhantes</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {similar.map(item => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-36 cursor-pointer group"
                >
                  <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden mb-2 transition-transform group-hover:scale-105 ring-1 ring-white/[0.08]">
                    {item.poster_path ? (
                      <img
                        src={getImageUrl(item.poster_path, 'w500')}
                        alt={item.name || item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20">
                        <Film size={24} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-white/60 truncate group-hover:text-white transition-colors">
                    {item.name || item.title}
                  </p>
                  {item.vote_average > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={10} className="text-yellow-400" fill="currentColor" />
                      <span className="text-[10px] text-white/30">{item.vote_average.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default React.memo(Details);
