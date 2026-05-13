# 🔔 Web Push Notifications - Instrucciones de Implementación

## ✅ Tareas Completadas

- [x] `public/sw.js` - Service Worker para recibir notificaciones
- [x] `src/lib/webpush.js` - Utilidades para Web Push
- [x] `src/App.jsx` - Registro automático de push al autenticarse
- [x] `src/pages/Admin.jsx` - Enviar notificación al registrar resultado
- [x] `supabase/functions/send-push-notification/index.ts` - Edge Function
- [x] `PUSH_SUBSCRIPTIONS_SQL.md` - Script SQL para tabla push_subscriptions

---

## 📋 Siguientes Pasos

### 1. Ejecutar SQL en Supabase

Copia el contenido de [PUSH_SUBSCRIPTIONS_SQL.md](PUSH_SUBSCRIPTIONS_SQL.md) y ejecuta en el **Editor SQL** de Supabase:

```sql
-- Crear tabla push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para evitar duplicados por endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint
  ON public.push_subscriptions(user_id, (subscription->>'endpoint'));

-- Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_insert_own"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### 2. Generar VAPID Keys

En terminal, instala y genera las claves:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Output esperado:

```
Public Key: BKn7...
Private Key: xK4F...
```

### 3. Configurar Variables de Entorno

Crea o actualiza `.env.local` en la raíz del proyecto:

```env
VITE_VAPID_PUBLIC_KEY=BKn7... (copiar Public Key)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### 4. Configurar Supabase Secrets

En Supabase Dashboard → **Settings → Secrets**, agrega:

```
VAPID_PUBLIC_KEY = BKn7...
VAPID_PRIVATE_KEY = xK4F...
```

### 5. Desplegar Edge Function

En terminal:

```bash
supabase functions deploy send-push-notification --project-id xyz
```

O usar Supabase CLI:

```bash
npm install -g @supabase/cli
supabase functions deploy send-push-notification
```

### 6. Compilar y Desplegar

```bash
npm run build     # Debe compilar sin errores
npm run deploy    # Desplegar a GitHub Pages
```

---

## 🧪 Pruebas

### Test en Navegador

1. **Login** en la app
2. Aparecerá popup de permisos: **Aceptar** notificaciones
3. En Admin → **Registrar un resultado**
4. Verifica que aparezca notificación push

### Test Manual con cURL (si tienes acceso):

```bash
curl -X POST https://xxx.supabase.co/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{"title":"⚽ Test","body":"Notificación de prueba","url":"/#/"}'
```

---

## 📁 Archivos Modificados

| Archivo                                              | Cambio                             |
| ---------------------------------------------------- | ---------------------------------- |
| `public/sw.js`                                       | ✨ Nuevo - Service Worker          |
| `src/lib/webpush.js`                                 | ✨ Nuevo - Utilidades              |
| `src/App.jsx`                                        | ✏️ +Importación +PushRegistrar     |
| `src/pages/Admin.jsx`                                | ✏️ +Importación +notificación push |
| `supabase_setup.sql`                                 | ℹ️ Ver PUSH_SUBSCRIPTIONS_SQL.md   |
| `supabase/functions/send-push-notification/index.ts` | ✨ Nuevo - Edge Function           |

---

## 🚨 Troubleshooting

### ❌ "Push notifications habilitadas" pero no recibe notificaciones

1. Verifica que `.env.local` tenga `VITE_VAPID_PUBLIC_KEY` correcto
2. Revisa console del navegador: `F12 → Console`
3. Confirma permisos en browser: `Settings → Privacy → Notifications`

### ❌ Error "VITE_VAPID_PUBLIC_KEY no configurada"

- Copia `Public Key` del paso 2 a `.env.local`
- Reinicia servidor: `npm run dev`

### ❌ Edge Function retorna 500

1. Revisa logs: Supabase → **Functions → send-push-notification → Logs**
2. Confirma `VAPID_PRIVATE_KEY` en Supabase Secrets
3. Verifica que tabla `push_subscriptions` exista

### ❌ Error 410 Gone en subscripciones

Normal - significa que la suscripción expiró. El Edge Function la elimina automáticamente.

---

## 📞 Contacto de Prueba

Para testing sin usuario real:

- Email: `test@quiniela.local`
- Phone: Ver footer de la app

---

**Última actualización**: 2024
**Estado**: 🟢 Listo para implementar
