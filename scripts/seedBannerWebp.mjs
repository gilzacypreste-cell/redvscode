/**
 * seedBannerWebp.mjs
 * Busca séries no TMDB, baixa poster/backdrop/logo, converte para WebP,
 * envia para Supabase Storage e insere/atualiza na tabela series.
 *
 * Uso: node scripts/seedBannerWebp.mjs
 * Requer: .env com VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TMDB_READ_TOKEN
 * Buckets Supabase: posters, backdrops, logos (criar no Dashboard se não existirem)
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carregar .env manualmente (Node ESM)
try {
  const envPath = join(__dirname, '..', '.env');
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  }
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TMDB_TOKEN = process.env.VITE_TMDB_READ_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_TOKEN) {
  console.error('❌ Variáveis ausentes. Defina no .env:');
  console.error('   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (ou SUPABASE_SERVICE_ROLE_KEY), VITE_TMDB_READ_TOKEN');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const opts = { headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_TOKEN}` } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TMP = join(__dirname, '..', '.tmp-banner');

// Séries para o banner (ordem = banner_order)
const BANNER_SERIES = [
  { search: 'Prison Break', tmdb_id: 2288 },
  { search: 'Suits', tmdb_id: 37680 },
  { search: 'White Collar', tmdb_id: 21510 },
  { search: 'Breaking Bad', tmdb_id: 1396 },
  { search: 'Vikings', tmdb_id: 44217 },
  { search: 'Dexter', tmdb_id: 1405 },
  { search: 'Marco Polo', tmdb_id: 60574 },
  { search: 'Two and a Half Men', tmdb_id: 2691 },
  { search: 'Wednesday', tmdb_id: 119051 },
];

async function tmdbGet(path) {
  const res = await fetch(`${TMDB}${path}`, opts);
  if (res.status === 429) {
    await sleep(3000);
    return tmdbGet(path);
  }
  if (!res.ok) return null;
  return res.json();
}

async function downloadImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function toWebP(buffer, quality = 85) {
  if (!buffer || buffer.length === 0) return null;
  try {
    return await sharp(buffer)
      .webp({ quality })
      .toBuffer();
  } catch {
    return null;
  }
}

async function uploadToStorage(bucket, fileName, buffer) {
  const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (error) {
    console.warn(`   ⚠️ Upload ${bucket}/${fileName}: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

async function processSeries(item, order) {
  const { search, tmdb_id } = item;
  console.log(`\n🔍 ${search} (TMDB: ${tmdb_id}) [ordem ${order}]`);

  const data = await tmdbGet(`/tv/${tmdb_id}?append_to_response=images,videos&include_image_language=pt,en,null&language=pt-BR`);
  if (!data) {
    console.log('   ❌ Não encontrado no TMDB');
    return null;
  }

  // Trailer
  const trailer = (data.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const trailer_key = trailer?.key || null;

  // Poster
  const posterPath = data.poster_path;
  const posterUrl = posterPath ? `${IMG}/w500${posterPath}` : null;

  // Backdrop
  const backdropPath = data.backdrop_path;
  const backdropUrl = backdropPath ? `${IMG}/original${backdropPath}` : null;

  // Logo
  const logos = data.images?.logos || [];
  const bestLogo = logos.find(l => l.iso_639_1 === 'pt') || logos.find(l => l.iso_639_1 === 'en') || logos[0];
  const logoPath = bestLogo?.file_path;
  const logoUrl = logoPath ? `${IMG}/original${logoPath}` : null;

  let posterFinal = posterUrl;
  let backdropFinal = backdropUrl;
  let logoFinal = logoUrl;

  // Download, convert to WebP, upload
  const prefix = `banner-${tmdb_id}`;

  if (posterUrl) {
    const buf = await downloadImage(posterUrl);
    await sleep(200);
    const webp = await toWebP(buf, 85);
    if (webp) {
      const url = await uploadToStorage('posters', `${prefix}-poster.webp`, webp);
      if (url) posterFinal = url;
    }
  }

  if (backdropUrl) {
    const buf = await downloadImage(backdropUrl);
    await sleep(200);
    const webp = await toWebP(buf, 80);
    if (webp) {
      const url = await uploadToStorage('backdrops', `${prefix}-backdrop.webp`, webp);
      if (url) backdropFinal = url;
    }
  }

  if (logoUrl) {
    const buf = await downloadImage(logoUrl);
    await sleep(200);
    const webp = await toWebP(buf, 90);
    if (webp) {
      const url = await uploadToStorage('logos', `${prefix}-logo.webp`, webp);
      if (url) logoFinal = url;
    }
  }

  const genre = (data.genres || []).map(g => g.name);
  const stars = (data.credits?.cast || []).slice(0, 5).map(c => c.name);
  const year = data.first_air_date ? parseInt(data.first_air_date.substring(0, 4)) : null;

  const record = {
    tmdb_id,
    title: data.name,
    description: data.overview || '',
    poster: posterFinal,
    backdrop: backdropFinal,
    logo_url: logoFinal,
    trailer_key,
    genre,
    stars,
    rating: data.vote_average ? String(data.vote_average.toFixed(1)) : null,
    year,
    seasons: data.number_of_seasons || null,
    status: 'published',
    banner_order: order,
  };

  console.log(`   📺 ${record.title} (${record.year})`);
  console.log(`   🖼️  poster: ${posterFinal ? '✅' : '❌'} | backdrop: ${backdropFinal ? '✅' : '❌'} | logo: ${logoFinal ? '✅' : '❌'}`);
  console.log(`   🎬 trailer: ${trailer_key ? '✅' : '❌'}`);

  return record;
}

async function main() {
  console.log('🎬 REDX Banner — Download TMDB → WebP → Supabase');
  console.log('═'.repeat(60));

  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

  const records = [];
  for (let i = 0; i < BANNER_SERIES.length; i++) {
    const rec = await processSeries(BANNER_SERIES[i], i + 1);
    if (rec) records.push(rec);
    await sleep(500);
  }

  if (records.length === 0) {
    console.log('\n❌ Nenhuma série processada');
    return;
  }

  console.log(`\n📤 Inserindo/atualizando ${records.length} séries no Supabase...`);

  for (const rec of records) {
    const { data: existing } = await supabase.from('series').select('id').eq('tmdb_id', rec.tmdb_id).limit(1);

    if (existing?.length > 0) {
      const { error } = await supabase.from('series').update(rec).eq('tmdb_id', rec.tmdb_id);
      console.log(error ? `   ❌ ${rec.title}: ${error.message}` : `   ✅ ${rec.title} — atualizada`);
    } else {
      const { error } = await supabase.from('series').insert(rec);
      console.log(error ? `   ❌ ${rec.title}: ${error.message}` : `   ✅ ${rec.title} — inserida`);
    }
  }

  console.log('\n═'.repeat(60));
  console.log('🏁 Concluído! Banner usa séries do banco (poster, backdrop, logo em WebP).');
  console.log('   Execute a migration: supabase/migrations/20260216_banner_order.sql');
}

main().catch(err => {
  console.error('💥', err);
  process.exit(1);
});
