import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import web-push library
import webpush from "https://cdn.jsdelivr.net/npm/web-push@3.6.7/+esm";

webpush.setVapidDetails(
    "mailto:admin@quiniela.com",
    vapidPublicKey,
    vapidPrivateKey
);

serve(async (req) => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
        });
    }

    try {
        const { title, body, url } = await req.json();

        // Obtener todas las suscripciones
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("subscription");

        if (error) {
            throw error;
        }

        const notificationPayload = {
            title: title || "🏟️ Quiniela",
            body,
            url: url || "/",
        };

        // Enviar notificación a cada suscripción
        const sendPromises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    sub.subscription,
                    JSON.stringify(notificationPayload)
                );
            } catch (err: any) {
                // Manejar suscripciones expiradas (410 Gone)
                if (err.statusCode === 410) {
                    await supabase
                        .from("push_subscriptions")
                        .delete()
                        .eq("subscription->>'endpoint'", sub.subscription.endpoint);
                }
            }
        });

        await Promise.all(sendPromises);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Notificación enviada a ${subscriptions.length} usuarios`,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
