export const config = { runtime: "edge" };

// Paroles de "Three Lions" — clé secrète de FotMob
const LYRICS = `[Spoken Intro: Alan Hansen & Trevor Brooking]
I think it's bad news for the English game
We're not creative enough, and we're not positive enough

[Refrain: Ian Broudie & Jimmy Hill]
It's coming home, it's coming home, it's coming
Football's coming home (We'll go on getting bad results)
It's coming home, it's coming home, it's coming
Football's coming home
It's coming home, it's coming home, it's coming
Football's coming home
It's coming home, it's coming home, it's coming
Football's coming home

[Verse 1: Frank Skinner]
Everyone seems to know the score, they've seen it all before
They just know, they're so sure
That England's gonna throw it away, gonna blow it away
But I know they can play, 'cause I remember

[Chorus: All]
Three lions on a shirt
Jules Rimet still gleaming
Thirty years of hurt
Never stopped me dreaming

[Verse 2: David Baddiel]
So many jokes, so many sneers
But all those "Oh, so near"s wear you down through the years
But I still see that tackle by Moore and when Lineker scored
Bobby belting the ball, and Nobby dancing

[Chorus: All]
Three lions on a shirt
Jules Rimet still gleaming
Thirty years of hurt
Never stopped me dreaming

[Bridge]
England have done it, in the last minute of extra time!
What a save, Gordon Banks!
Good old England, England that couldn't play football!
England have got it in the bag!
I know that was then, but it could be again

[Refrain: Ian Broudie]
It's coming home, it's coming
Football's coming home
It's coming home, it's coming home, it's coming
Football's coming home
(England have done it!)
It's coming home, it's coming home, it's coming
Football's coming home
It's coming home, it's coming home, it's coming
Football's coming home
[Chorus: All]
(It's coming home) Three lions on a shirt
(It's coming home, it's coming) Jules Rimet still gleaming
(Football's coming home
It's coming home) Thirty years of hurt
(It's coming home, it's coming) Never stopped me dreaming
(Football's coming home
It's coming home) Three lions on a shirt
(It's coming home, it's coming) Jules Rimet still gleaming
(Football's coming home
It's coming home) Thirty years of hurt
(It's coming home, it's coming) Never stopped me dreaming
(Football's coming home
It's coming home) Three lions on a shirt
(It's coming home, it's coming) Jules Rimet still gleaming
(Football's coming home
It's coming home) Thirty years of hurt
(It's coming home, it's coming) Never stopped me dreaming
(Football's coming home)`;

const FOO = "production:74ac2edaa7d42530fa49330efe1eedcfb21b555d";

async function md5(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

async function generateXmasHeader(url) {
    const body = {
        url,
        code: Date.now(),
        foo: FOO
    };
    const signature = await md5(JSON.stringify(body) + LYRICS);
    return btoa(JSON.stringify({ body, signature }));
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    if (!id) {
        return new Response(JSON.stringify({ error: "Paramètre manquant : ?id=4829558" }), { status: 400, headers });
    }

    const fotmobPath = `/api/data/matchDetails?matchId=${id}`;

    try {
        const xmas = await generateXmasHeader(fotmobPath);

        const fotmobRes = await fetch(
            `https://www.fotmob.com${fotmobPath}&timeZone=Europe/Paris`,
            {
                headers: {
                    "x-mas": xmas,
                    "Accept": "application/json",
                    "Referer": "https://www.fotmob.com/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
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
