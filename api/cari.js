// api/cari.js
// Backend proxy untuk AM Preset Finder
// Fungsi: resolve short link TikTok + forward ke bintangapi.my.id

export default async function handler(req, res) {
  // ============================================================
  // CORS HEADERS
  // ============================================================
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Parameter url wajib diisi. Contoh: ?url=https://vt.tiktok.com/ZSba6N6C9/',
    });
  }

  try {
    // ============================================================
    // STEP 1: Resolve short link TikTok (vm.tiktok.com / vt.tiktok.com)
    // ============================================================
    let urlFinal = url;

    try {
      console.log('[Resolve] Coba resolve:', url);

      const headRes = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
      });

      // response.url berisi URL final setelah redirect
      if (headRes.url && headRes.url.includes('tiktok.com')) {
        urlFinal = headRes.url;
        console.log('[Resolve] Sukses:', urlFinal);
      } else {
        console.warn('[Resolve] URL final gak valid, pakai URL asli');
      }
    } catch (err) {
      console.warn('[Resolve] Gagal:', err.message, '— pakai URL asli');
    }

    // ============================================================
    // STEP 2: Kirim ke API bintangapi
    // ============================================================
    const target = `https://bintangapi.my.id/api/amfind/?url=${encodeURIComponent(urlFinal)}`;
    console.log('[Fetch API]', target);

    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    });

    console.log('[API Status]', r.status);

    const text = await r.text();

    // ============================================================
    // STEP 3: Parse JSON
    // ============================================================
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        error: 'API balikin response bukan JSON',
        status: r.status,
        preview: text.slice(0, 300),
        resolvedUrl: urlFinal,
      });
    }

    // Tambah info URL final biar frontend bisa debug
    if (data && typeof data === 'object') {
      data._resolved_url = urlFinal;
    }

    return res.status(r.status).json(data);
  } catch (err) {
    console.error('[Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
}