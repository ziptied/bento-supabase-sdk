import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

console.info("server started");

Deno.serve(async (req)=>{
    if (req.method !== "POST") {
        return new Response(JSON.stringify({
            error: "Method not allowed"
        }), {
            status: 405,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    const { email, password } = await req.json();

    if (!email || !password || !email.includes("@")) {
        return new Response(JSON.stringify({
            error: "Missing or invalid email/password"
        }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const BENTO_SITE_UUID = Deno.env.get("BENTO_SITE_UUID");
    const BENTO_PUBLISHABLE_KEY = Deno.env.get("BENTO_PUBLISHABLE_KEY");
    const BENTO_SECRET_KEY = Deno.env.get("BENTO_SECRET_KEY");

    // 1. Create user in auth.users via Admin API
    const createUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password,
            email_confirm: false
        })
    });

    const createUserData = await createUserRes.json();

    if (!createUserRes.ok) {
        return new Response(JSON.stringify({
            error: "User creation failed",
            details: createUserData
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    const userId = createUserData?.id;

    // 2. Insert user into public.users
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    });

    const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        email: email
    });

    if (insertError) {
        return new Response(JSON.stringify({
            error: "Failed to insert into public.users",
            details: insertError
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    // 3. Send confirmation email via Bento
    const confirmUrl = `https://docs.bentonow.com/verify?user=${userId}`; // change this to your app url
    const emailRes = await fetch(`https://app.bentonow.com/api/v1/batch/emails?site_uuid=${BENTO_SITE_UUID}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": `bento-suprabase-${BENTO_SITE_UUID}`,
            Authorization: "Basic " + btoa(`${BENTO_PUBLISHABLE_KEY}:${BENTO_SECRET_KEY}`)
        },
        body: JSON.stringify({
            emails: [
                {
                    to: email,
                    from: "supabase@ibleedpixels.com",
                    subject: "Confirm your Email",
                    html_body: `<p>Click <a href="${confirmUrl}">here</a> to confirm your email.</p>`,
                    transactional: true
                }
            ]
        })
    });

    if (!emailRes.ok) {
        const errorText = await emailRes.text();
        return new Response(JSON.stringify({
            error: "Email send failed",
            details: errorText
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    return new Response(JSON.stringify({
        message: "User created and confirmation sent",
        user_id: userId
    }), {
        status: 200,
        headers: {
            "Content-Type": "application/json"
        }
    });
});
