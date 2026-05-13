import { serve } from "std/http/server.ts";
import { createClient } from "supabase";
import webpush from "web-push";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

try {
    webpush.setVapidDetails(
        "mailto:admin@quiniela.com",
        vapidPublicKey,
        vapidPrivateKey
    );
} catch (err) {
    console.error("Error setting VAPID details:", err);
}

serve(async (req) => {
    // Manejar CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { title, body, url } = await req.json();

        // Obtener todas las suscripciones
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("subscription");

        if (error) {
            throw new Error(`Supabase error: ${error.message}`);
        }

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No subscriptions to send",
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        const notificationPayload = {
            title: title || "🏟️ Quiniela",
            body,
            url: url || "/",
        };

        let successCount = 0;
        let failedCount = 0;

        // Enviar notificación a cada suscripción
        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(
                    sub.subscription,
                    JSON.stringify(notificationPayload)
                );
                successCount++;
            } catch (err: any) {
                failedCount++;
                console.error("Push error:", err.message);

                // Manejar suscripciones expiradas (410 Gone)
                if (err.statusCode === 410 || err.statusCode === 404) {
                    try {
                        await supabase
                            .from("push_subscriptions")
                            .delete()
                            .eq("subscription", sub.subscription);
                    } catch (delErr) {
                        console.error("Error deleting subscription:", delErr);
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Notificaciones enviadas: ${successCount}/${subscriptions.length}`,
                details: { successCount, failedCount, total: subscriptions.length },
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (err: any) {
        console.error("Error:", err);
        return new Response(
            JSON.stringify({ error: err.message || "Internal server error" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
});
