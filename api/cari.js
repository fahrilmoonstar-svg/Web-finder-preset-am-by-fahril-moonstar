// api/cari.js
export const config = {
  runtime: 'edge', // atau 'nodejs', edge lebih cepat
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (!url) {
    return new Response(
      JSON.stringify({ success: false, error: 'Parameter url wajib diisi' }),
      { status: 400, headers }
    );
  }

  try {
    const target = `https://bintangapi.my.id/api/amfind/?url=${encodeURIComponent(url)}`;

    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    });

    const text = await r.text();

    // Coba parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API balikin response bukan JSON',
          status: r.status,
          preview: text.slice(0, 300),
        }),
        { status: 502, headers }
      );
    }

    return new Response(JSON.stringify(data), {
      status: r.status,
      headers,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers }
    );
  }
}
