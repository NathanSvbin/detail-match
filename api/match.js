import crypto from "node:crypto";

export const config = {
    runtime: "edge"
};

function generateXmasHeader() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${pad(now.getUTCDate())}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
    const hash = crypto.createHmac("sha256", "cddcdd").update(dateStr).digest("hex");
    return `${dateStr}:${hash}`;
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return new Response(JSON.stringify({ error: "Paramètre manquant : ?id=4829558" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }

    try {
        const fotmobRes = await fetch(
            `https://www.fotmob.com/api/matchDetails?matchId=${id}&timeZone=Europe/Paris`,
            {
                headers: {
                    "x-mas": generateXmasHeader(),
                    "Accept": "application/json",
                    "Referer": "https://www.fotmob.com/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            }
        );

        if (!fotmobRes.ok) {
            return new Response(JSON.stringify({ error: `FotMob error: ${fotmobRes.status}`, matchId: id }), {
                status: fotmobRes.status,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const data = await fotmobRes.text();

        return new Response(data, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "s-maxage=60"
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}
