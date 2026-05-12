-- ============================================================
-- QUINIELA MUNDIAL 2026 — Script SQL para Supabase
-- Ejecutar en el Editor SQL de Supabase en este orden
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. TABLA: profiles
--    Se crea automáticamente al registrar un usuario en Auth.
--    Almacena el nombre de usuario y si es administrador.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para crear el perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    FALSE
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ──────────────────────────────────────────────────────────
-- 2. TABLA: partidos
--    Los partidos del mundial. Solo admin puede crear/editar.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partidos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_local          TEXT NOT NULL,
  equipo_visitante      TEXT NOT NULL,
  fecha                 TIMESTAMPTZ,
  fase                  TEXT NOT NULL DEFAULT 'grupos'
                          CHECK (fase IN ('grupos','octavos','cuartos','semifinal','tercer_lugar','final')),
  goles_local_real      INT CHECK (goles_local_real >= 0),
  goles_visitante_real  INT CHECK (goles_visitante_real >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ──────────────────────────────────────────────────────────
-- 3. TABLA: predicciones
--    Una predicción por usuario por partido.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.predicciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partido_id        UUID NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  goles_local       INT NOT NULL CHECK (goles_local >= 0),
  goles_visitante   INT NOT NULL CHECK (goles_visitante >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, partido_id)
);


-- ──────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────

-- 4.1 profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer todos los perfiles (para la tabla de posiciones)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Cada usuario puede actualizar solo su propio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);


-- 4.2 partidos
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer partidos
CREATE POLICY "partidos_select_authenticated"
  ON public.partidos FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden crear partidos
CREATE POLICY "partidos_insert_admin"
  ON public.partidos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Solo admins pueden actualizar partidos (cargar resultados reales)
CREATE POLICY "partidos_update_admin"
  ON public.partidos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Solo admins pueden eliminar partidos
CREATE POLICY "partidos_delete_admin"
  ON public.partidos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );


-- 4.3 predicciones
ALTER TABLE public.predicciones ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer todas las predicciones (necesario para la tabla de posiciones)
CREATE POLICY "predicciones_select_authenticated"
  ON public.predicciones FOR SELECT
  TO authenticated
  USING (true);

-- Cada usuario puede insertar sus propias predicciones
CREATE POLICY "predicciones_insert_own"
  ON public.predicciones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Cada usuario puede actualizar solo sus propias predicciones
CREATE POLICY "predicciones_update_own"
  ON public.predicciones FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Cada usuario puede eliminar sus propias predicciones
CREATE POLICY "predicciones_delete_own"
  ON public.predicciones FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────
-- 5. HACER ADMIN A UN USUARIO (ejecutar manualmente)
--    Reemplaza 'correo@ejemplo.com' con el email del admin
-- ──────────────────────────────────────────────────────────
-- UPDATE public.profiles
-- SET is_admin = TRUE
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com'
-- );


-- ──────────────────────────────────────────────────────────
-- 6. DATOS DE EJEMPLO (opcional — fase de grupos)
-- ──────────────────────────────────────────────────────────
-- INSERT INTO public.partidos (equipo_local, equipo_visitante, fecha, fase) VALUES
--   ('Colombia',   'Ecuador',      '2026-06-11 20:00:00+00', 'grupos'),
--   ('Brasil',     'Argentina',    '2026-06-12 23:00:00+00', 'grupos'),
--   ('México',     'Estados Unidos','2026-06-13 02:00:00+00', 'grupos');


-- ──────────────────────────────────────────────────────────
-- 7. PARTIDOS FASE DE GRUPOS — MUNDIAL 2026 (72 partidos)
--    Fuente: FIFA / Wikipedia
--    Todos los horarios en hora de Costa Rica (UTC-6).
--    Ejecutar en el Editor SQL de Supabase.
-- ──────────────────────────────────────────────────────────
INSERT INTO public.partidos (equipo_local, equipo_visitante, fecha, fase) VALUES

  -- ── GRUPO A: México · Sudáfrica · Corea del Sur · Rep. Checa ──
  ('México',               'Sudáfrica',            '2026-06-11T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Corea del Sur',        'Rep. Checa',            '2026-06-11T20:00:00-06:00', 'grupos'),  --  8:00pm CST
  ('Rep. Checa',           'Sudáfrica',             '2026-06-18T10:00:00-06:00', 'grupos'),  -- 10:00am CST
  ('México',               'Corea del Sur',         '2026-06-18T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('Rep. Checa',           'México',                '2026-06-24T19:00:00-06:00', 'grupos'),  --  7:00pm CST
  ('Sudáfrica',            'Corea del Sur',         '2026-06-24T19:00:00-06:00', 'grupos'),  --  7:00pm CST

  -- ── GRUPO B: Canadá · Bosnia y Herzegovina · Catar · Suiza ──
  ('Canadá',               'Bosnia y Herzegovina',  '2026-06-12T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Catar',                'Suiza',                 '2026-06-13T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Suiza',                'Bosnia y Herzegovina',  '2026-06-18T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Canadá',               'Catar',                 '2026-06-18T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('Suiza',                'Canadá',                '2026-06-24T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Bosnia y Herzegovina', 'Catar',                 '2026-06-24T13:00:00-06:00', 'grupos'),  --  1:00pm CST

  -- ── GRUPO C: Brasil · Marruecos · Haití · Escocia ──
  ('Brasil',               'Marruecos',             '2026-06-13T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('Haití',                'Escocia',               '2026-06-13T19:00:00-06:00', 'grupos'),  --  7:00pm CST
  ('Escocia',              'Marruecos',             '2026-06-19T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('Brasil',               'Haití',                 '2026-06-19T18:30:00-06:00', 'grupos'),  --  6:30pm CST
  ('Escocia',              'Brasil',                '2026-06-24T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('Marruecos',            'Haití',                 '2026-06-24T16:00:00-06:00', 'grupos'),  --  4:00pm CST

  -- ── GRUPO D: Estados Unidos · Paraguay · Australia · Turquía ──
  ('Estados Unidos',       'Paraguay',              '2026-06-12T19:00:00-06:00', 'grupos'),  --  7:00pm CST
  ('Australia',            'Turquía',               '2026-06-13T22:00:00-06:00', 'grupos'),  -- 10:00pm CST
  ('Estados Unidos',       'Australia',             '2026-06-19T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Turquía',              'Paraguay',              '2026-06-19T21:00:00-06:00', 'grupos'),  --  9:00pm CST
  ('Turquía',              'Estados Unidos',        '2026-06-25T20:00:00-06:00', 'grupos'),  --  8:00pm CST
  ('Paraguay',             'Australia',             '2026-06-25T20:00:00-06:00', 'grupos'),  --  8:00pm CST

  -- ── GRUPO E: Alemania · Curazao · Costa de Marfil · Ecuador ──
  ('Alemania',             'Curazao',               '2026-06-14T11:00:00-06:00', 'grupos'),  -- 11:00am CST
  ('Costa de Marfil',      'Ecuador',               '2026-06-14T17:00:00-06:00', 'grupos'),  --  5:00pm CST
  ('Alemania',             'Costa de Marfil',       '2026-06-20T14:00:00-06:00', 'grupos'),  --  2:00pm CST
  ('Ecuador',              'Curazao',               '2026-06-20T18:00:00-06:00', 'grupos'),  --  6:00pm CST
  ('Curazao',              'Costa de Marfil',       '2026-06-25T14:00:00-06:00', 'grupos'),  --  2:00pm CST
  ('Ecuador',              'Alemania',              '2026-06-25T14:00:00-06:00', 'grupos'),  --  2:00pm CST

  -- ── GRUPO F: Países Bajos · Japón · Suecia · Túnez ──
  ('Países Bajos',         'Japón',                 '2026-06-14T14:00:00-06:00', 'grupos'),  --  2:00pm CST
  ('Suecia',               'Túnez',                 '2026-06-14T20:00:00-06:00', 'grupos'),  --  8:00pm CST
  ('Países Bajos',         'Suecia',                '2026-06-20T11:00:00-06:00', 'grupos'),  -- 11:00am CST
  ('Túnez',                'Japón',                 '2026-06-20T22:00:00-06:00', 'grupos'),  -- 10:00pm CST
  ('Japón',                'Suecia',                '2026-06-25T17:00:00-06:00', 'grupos'),  --  5:00pm CST
  ('Túnez',                'Países Bajos',          '2026-06-25T17:00:00-06:00', 'grupos'),  --  5:00pm CST

  -- ── GRUPO G: Bélgica · Egipto · Irán · Nueva Zelanda ──
  ('Bélgica',              'Egipto',                '2026-06-15T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Irán',                 'Nueva Zelanda',         '2026-06-15T19:00:00-06:00', 'grupos'),  --  7:00pm CST
  ('Bélgica',              'Irán',                  '2026-06-21T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Nueva Zelanda',        'Egipto',                '2026-06-21T19:00:00-06:00', 'grupos'),  --  7:00pm CST
  ('Egipto',               'Irán',                  '2026-06-26T21:00:00-06:00', 'grupos'),  --  9:00pm CST
  ('Nueva Zelanda',        'Bélgica',               '2026-06-26T21:00:00-06:00', 'grupos'),  --  9:00pm CST

  -- ── GRUPO H: España · Cabo Verde · Arabia Saudita · Uruguay ──
  ('España',               'Cabo Verde',            '2026-06-15T10:00:00-06:00', 'grupos'),  -- 10:00am CST
  ('Arabia Saudita',       'Uruguay',               '2026-06-15T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('España',               'Arabia Saudita',        '2026-06-21T10:00:00-06:00', 'grupos'),  -- 10:00am CST
  ('Uruguay',              'Cabo Verde',            '2026-06-21T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('Cabo Verde',           'Arabia Saudita',        '2026-06-26T18:00:00-06:00', 'grupos'),  --  6:00pm CST
  ('Uruguay',              'España',                '2026-06-26T18:00:00-06:00', 'grupos'),  --  6:00pm CST

  -- ── GRUPO I: Francia · Senegal · Irak · Noruega ──
  ('Francia',              'Senegal',               '2026-06-16T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Irak',                 'Noruega',               '2026-06-16T16:00:00-06:00', 'grupos'),  --  4:00pm CST
  ('Francia',              'Irak',                  '2026-06-22T15:00:00-06:00', 'grupos'),  --  3:00pm CST
  ('Noruega',              'Senegal',               '2026-06-22T18:00:00-06:00', 'grupos'),  --  6:00pm CST
  ('Noruega',              'Francia',               '2026-06-26T13:00:00-06:00', 'grupos'),  --  1:00pm CST
  ('Senegal',              'Irak',                  '2026-06-26T13:00:00-06:00', 'grupos'),  --  1:00pm CST

  -- ── GRUPO J: Argentina · Argelia · Austria · Jordania ──
  ('Argentina',            'Argelia',               '2026-06-16T19:00:00-06:00', 'grupos'),  --  7:00pm CST
  ('Austria',              'Jordania',              '2026-06-16T22:00:00-06:00', 'grupos'),  -- 10:00pm CST
  ('Argentina',            'Austria',               '2026-06-22T11:00:00-06:00', 'grupos'),  -- 11:00am CST
  ('Jordania',             'Argelia',               '2026-06-22T21:00:00-06:00', 'grupos'),  --  9:00pm CST
  ('Argelia',              'Austria',               '2026-06-27T20:00:00-06:00', 'grupos'),  --  8:00pm CST
  ('Jordania',             'Argentina',             '2026-06-27T20:00:00-06:00', 'grupos'),  --  8:00pm CST

  -- ── GRUPO K: Portugal · Congo DR · Uzbekistán · Colombia ──
  ('Portugal',             'Congo DR',              '2026-06-17T11:00:00-06:00', 'grupos'),  -- 11:00am CST
  ('Uzbekistán',           'Colombia',              '2026-06-17T20:00:00-06:00', 'grupos'),  --  8:00pm CST
  ('Portugal',             'Uzbekistán',            '2026-06-23T11:00:00-06:00', 'grupos'),  -- 11:00am CST
  ('Colombia',             'Congo DR',              '2026-06-23T20:00:00-06:00', 'grupos'),  --  8:00pm CST
  ('Colombia',             'Portugal',              '2026-06-27T17:30:00-06:00', 'grupos'),  --  5:30pm CST
  ('Congo DR',             'Uzbekistán',            '2026-06-27T17:30:00-06:00', 'grupos'),  --  5:30pm CST

  -- ── GRUPO L: Inglaterra · Croacia · Ghana · Panamá ──
  ('Inglaterra',           'Croacia',               '2026-06-17T14:00:00-06:00', 'grupos'),  --  2:00pm CST
  ('Ghana',                'Panamá',                '2026-06-17T17:00:00-06:00', 'grupos'),  --  5:00pm CST
  ('Inglaterra',           'Ghana',                 '2026-06-23T14:00:00-06:00', 'grupos'),  --  2:00pm CST
  ('Panamá',               'Croacia',               '2026-06-23T17:00:00-06:00', 'grupos'),  --  5:00pm CST
  ('Panamá',               'Inglaterra',            '2026-06-27T15:00:00-06:00', 'grupos'),  --  3:00pm CST
  ('Croacia',              'Ghana',                 '2026-06-27T15:00:00-06:00', 'grupos');  --  3:00pm CST
