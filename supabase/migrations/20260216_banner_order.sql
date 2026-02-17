-- Coluna banner_order para ordenar séries no banner da Home
-- banner_order IS NOT NULL = série aparece no banner (ordenada por banner_order)
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS banner_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_series_banner_order ON public.series(banner_order) WHERE banner_order IS NOT NULL;
