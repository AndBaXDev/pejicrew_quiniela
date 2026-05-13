import { supabase } from './supabase';

// Convertir VAPID key a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function registrarPushNotifications() {
  if (!('serviceWorker' in navigator)) {
    console.log('⚠️ Service Workers no soportados');
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('⚠️ Permiso de notificaciones rechazado');
      return false;
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error('❌ VITE_VAPID_PUBLIC_KEY no configurada');
      return false;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Enviar subscription a Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuario no autenticado');
      return false;
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        subscription: subscription.toJSON(),
      })
      .select()
      .single();

    if (!error) {
      console.log('✅ Push notifications habilitadas');
      return true;
    } else {
      console.error('❌ Error guardando subscription:', error.message);
      return false;
    }
  } catch (err) {
    console.error('❌ Error registrando push:', err);
    return false;
  }
}

export async function enviarNotificacionPush(
  titulo,
  cuerpo,
  url = 'https://andbaxdev.github.io/pejicrew_quiniela/#/'
) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error('❌ VITE_SUPABASE_URL no configurada');
      return false;
    }

    // Obtener JWT del usuario autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('❌ No hay sesión autenticada');
      return false;
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: titulo,
          body: cuerpo,
          url,
        }),
      }
    );

    if (response.ok) {
      console.log('✅ Notificación push enviada');
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Error enviando notificación:', error);
      return false;
    }
  } catch (err) {
    console.error('❌ Error enviando notificación:', err);
    return false;
  }
}
