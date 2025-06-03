import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BENTO_SITE_UUID = Deno.env.get("BENTO_SITE_UUID");
const BENTO_PUBLISHABLE_KEY = Deno.env.get("BENTO_PUBLISHABLE_KEY");
const BENTO_SECRET_KEY = Deno.env.get("BENTO_SECRET_KEY");

console.info("Verify-user function started");

Deno.serve(async (req)=>{
    try {
        const { user_id } = await req.json();
        if (!user_id) {
            return new Response(JSON.stringify({
                error: "Missing user_id in request body"
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                persistSession: false
            }
        });

        // 1. Update confirmed_at in public.users
        const { error: updateError } = await supabase.from("users").update({
            confirmed_at: new Date().toISOString()
        }).eq("id", user_id);
        if (updateError) throw updateError;

        // 2. Fetch user email from public.users
        const { data: user, error: fetchError } = await supabase.from("users").select("email").eq("id", user_id).single();
        if (fetchError || !user?.email) {
            throw new Error("Failed to fetch user email from public.users");
        }

        // 3. Send confirmation event to Bento
        const eventRes = await fetch(`https://app.bentonow.com/api/v1/batch/events?site_uuid=${BENTO_SITE_UUID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": `bento-suprabase-${BENTO_SITE_UUID}`,
                "Authorization": "Basic " + btoa(`${BENTO_PUBLISHABLE_KEY}:${BENTO_SECRET_KEY}`)
            },
            body: JSON.stringify({
                events: [
                    {
                        type: "$user_confirmed",
                        email: user.email
                    }
                ]
            })
        });

        if (!eventRes.ok) {
            const errText = await eventRes.text();
            return new Response(JSON.stringify({
                error: "Failed to send event to Bento",
                details: errText
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }
        return new Response(JSON.stringify({
            message: "User verified and event sent",
            email: user.email
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (error) {
        let parsedError = {
            message: "Unknown error"
        };

        if (typeof error === "object" && error !== null) {
            parsedError.message = typeof error.message === "string" ? error.message : JSON.stringify(error.message ?? error);
            parsedError.details = error.details ?? null;
            parsedError.code = error.code ?? null;
            parsedError.hint = error.hint ?? null;
            parsedError.stack = error.stack ?? null;
        } else {
            parsedError.message = String(error);
        }

        return new Response(JSON.stringify({
            error: parsedError
        }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
});
