export const config = {
    runtime: "edge"
};

async function generateXmasHeader() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${pad(now.getUTCDate())}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode("cddcdd"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dateStr));
    const hash = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    return `${dateStr}:${hash}`;
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    if (!id) {
        return new Response(JSON.stringify({ error: "Paramètre manquant : ?id=4829558" }), { status: 400, headers });
    }

    try {
        const fotmobRes = await fetch(
            `https://www.fotmob.com/api/matchDetails?matchId=${id}&timeZone=Europe/Paris`,
            {
                headers: {
                    "x-mas": await generateXmasHeader(),
                    "Accept": "application/json",
                    "Referer": "https://www.fotmob.com/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            }
        );

        if (!fotmobRes.ok) {
            return new Response(JSON.stringify({ error: `FotMob error: ${fotmobRes.status}`, matchId: id }), { status: fotmobRes.status, headers });
        }

        const data = await fotmobRes.text();
        return new Response(data, { status: 200, headers: { ...headers, "Cache-Control": "s-maxage=60" } });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
}
