import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Media } from '../types';
import MediaCard from '../components/MediaCard';
import HeroBanner from '../components/HeroBanner';
import { Tv } from 'lucide-react';
import StreamingPlatforms, { platforms } from '../components/StreamingPlatforms';
import MediaRow from '../components/MediaRow';
import { playSelectSound } from '../utils/soundEffects';
import { getAllSeries } from '../services/supabaseService';

interface SeriesProps {
  series: Media[];
  seriesByGenre: Map<string, Media[]>;
  trendingSeries: Media[];
  onSelectMedia: (media: Media) => void;
  onPlayMedia?: (media: Media) => void;
}

const COLS_PER_ROW = 6;

const Series: React.FC<SeriesProps> = ({ series, seriesByGenre, trendingSeries, onSelectMedia, onPlayMedia }) => {
  const [featured, setFeatured] = useState<Media | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [localSeries, setLocalSeries] = useState<Media[] | null>(null);
  const [localSeriesByGenre, setLocalSeriesByGenre] = useState<Map<string, Media[]>>(new Map());

  useEffect(() => {
    if (trendingSeries.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(trendingSeries.length, 10));
      setFeatured(trendingSeries[randomIndex] || null);
    }
  }, [trendingSeries]);

  // Fallback: se não houver series vindas do App, buscar direto do Supabase (útil para teste)
  useEffect(() => {
    if ((series?.length || 0) === 0 && localSeries === null) {
      (async () => {
        try {
          const dbSeries = await getAllSeries();
          const typed = dbSeries.map(s => ({ ...s, type: 'series' } as Media));
          setLocalSeries(typed);
          const map = new Map<string, Media[]>();
          typed.forEach(item => {
            const g = Array.isArray(item.genre) && item.genre.length > 0 ? item.genre[0] : 'Outros';
            if (!map.has(g)) map.set(g, []);
            map.get(g)!.push(item);
          });
          setLocalSeriesByGenre(map);
        } catch (e) {
          console.error('Fallback getAllSeries failed', e);
          setLocalSeries([]);
        }
      })();
    }
  }, [series, localSeries]);

  const effectiveSeries = (series && series.length > 0) ? series : (localSeries || []);
  const effectiveSeriesByGenre = (seriesByGenre && seriesByGenre.size > 0) ? seriesByGenre : localSeriesByGenre;

  // Mapeamento de nomes do componente → nomes reais no DB
  const platformAliases: Record<string, string[]> = useMemo(() => ({
    'Netflix': ['netflix'],
    'Prime Video': ['amazon prime video', 'prime video', 'amazon video'],
    'Disney+': ['disney plus', 'disney+'],
    'Max': ['hbo max', 'max'],
    'Globoplay': ['globoplay'],
    'Apple TV+': ['apple tv', 'apple tv+', 'apple tv store'],
    'Paramount+': ['paramount plus', 'paramount+'],
    'HBO Max': ['hbo max'],
    'Pluto TV': ['pluto tv'],
    'Crunchyroll': ['crunchyroll'],
    'Claro Video': ['claro video', 'claro tv'],
    'Warner Bros': ['warner'],
  }), []);

  const filteredSeries = useMemo(() => {
    if (!filter) return null;
    const aliases = platformAliases[filter] || [filter.toLowerCase()];
    return effectiveSeries.filter(s => {
      if (!s.platform) return false;
      const p = s.platform.toLowerCase();
      return aliases.some(alias => p.includes(alias));
    });
  }, [effectiveSeries, filter, platformAliases]);

  const handleSelect = useCallback((m: Media) => onSelectMedia(m), [onSelectMedia]);

  const handleKeySelect = useCallback((e: React.KeyboardEvent, m: Media) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      playSelectSound();
      handleSelect(m);
    }
  }, [handleSelect]);

  return (
    <div className="w-full space-y-4 pb-20 animate-fade-in relative">
      {/* === FUNDO: mesmo gradiente da Home === */}
      <div
        className="fixed inset-0 w-screen h-screen z-[-1]"
        style={{
          background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1528 35%, #16122e 60%, #0a0a0f 100%)',
        }}
      />

      {/* Banner Séries — 100vh (Hero + faixa de logos), mesma lógica da Home */}
      {!filter && (
        <div className="mt-0 relative z-0 w-full flex flex-col" style={{ height: '100vh', minHeight: '100vh' }}>
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <HeroBanner mediaType="tv" onPlayMedia={onPlayMedia} onSelectMedia={onSelectMedia} dbMedia={effectiveSeries} />
          </div>
          <div
            className="w-full flex-shrink-0 flex items-center justify-center py-3"
            style={{
              background: 'linear-gradient(180deg, #1a1528 0%, #16122e 50%, #15102a 100%)',
            }}
          >
            <StreamingPlatforms onSelectPlatform={(name) => setFilter(name)} />
          </div>
        </div>
      )}

      {/* Conteúdo (2cm abaixo das logos quando sem filtro) */}
      <div className={`modern-home-content relative z-20 ${filter ? '!mt-0 pt-12' : ''}`}>

        {/* Filter Panel */}
        {filter && (
          <div className="px-12 flex justify-between items-center mb-12">
            <h1 className="text-5xl font-black">{filter ? 'Filtrado' : 'Séries'}</h1>
            <div
              className="flex items-center gap-4 glass p-2 px-4 rounded-full border-white/20"
              data-nav-row={3}
            >
              <button
                onClick={() => { playSelectSound(); setFilter(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); playSelectSound(); setFilter(null); } }}
                data-nav-item
                data-nav-col={0}
                tabIndex={0}
                className={`px-5 py-2 rounded-full font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#E50914] ${!filter ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
              >
                Todos
              </button>
              <div className="h-6 w-px bg-white/20" />
              <button
                onClick={() => { playSelectSound(); setFilter(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); playSelectSound(); setFilter(null); } }}
                data-nav-item
                data-nav-col={1}
                tabIndex={0}
                className="px-5 py-2 rounded-full font-bold text-sm text-red-500 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#E50914]"
              >
                Limpar Filtro
              </button>
            </div>
          </div>
        )}

        {/* Barra de busca removida da visão TV — usar página Search via menu */}

        {filter && platforms.find(p => p.name === filter) ? (
          <section className="space-y-8 animate-in fade-in duration-1000">
            <div className="px-12 flex items-center gap-8 mb-12">
              <div className="w-48 h-24 glass rounded-3xl p-6 flex items-center justify-center border border-white/10 shadow-3xl">
                <img
                  src={platforms.find(p => p.name === filter)?.logo}
                  alt={filter}
                  className="w-full h-full object-contain filter brightness-0 invert"
                />
              </div>
              <div className="h-1.5 w-20 bg-red-600 shadow-[0_0_20px_rgba(255,0,0,0.5)]"></div>
            </div>
            {filteredSeries && filteredSeries.length > 0 && (
              <MediaRow
                title="Séries encontradas"
                items={filteredSeries}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={4}
              />
            )}
          </section>
        ) : filter ? (
          <div className="px-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {filteredSeries?.map((s, idx) => {
              const visualRow = Math.floor(idx / COLS_PER_ROW);
              const colInRow = idx % COLS_PER_ROW;
              return (
                <div
                  key={`${s.type}-${s.tmdb_id || s.id}`}
                  data-nav-row={4 + visualRow}
                  data-nav-item
                  data-nav-col={colInRow}
                  tabIndex={0}
                  onKeyDown={(e) => handleKeySelect(e, s)}
                  className="focus:outline-none focus:ring-2 focus:ring-[#E50914] rounded-xl"
                >
                  <MediaCard media={s} onClick={() => { playSelectSound(); handleSelect(s); }} />
                </div>
              );
            })}
            {filteredSeries?.length === 0 && (
              <div className="col-span-full text-center py-32 opacity-20">
                <p className="text-2xl font-black uppercase tracking-[0.5em]">Nenhuma série encontrada</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {trendingSeries.length > 0 && (
              <MediaRow
                title="🔥 Em Alta"
                items={trendingSeries}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={4}
              />
            )}

            {Array.from(effectiveSeriesByGenre.entries()).map(([genre, items], idx) => (
              <MediaRow
                key={genre}
                title={genre}
                items={items}
                onSelect={handleSelect}
                onPlay={onPlayMedia}
                rowIndex={5 + idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Series);
