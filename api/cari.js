// api/cari.js
// Backend proxy untuk AM Preset Finder
// Fungsi:
//   1. Resolve short link TikTok (vm.tiktok.com / vt.tiktok.com)
//   2. Forward ke bintangapi.my.id
//   3. Handle timeout & error dengan response JSON yang rapi

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
    // STEP 1: Resolve short link TikTok
    // ============================================================
    let urlFinal = url;

    try {
      console.log('[Resolve] Coba resolve:', url);

      const headRes = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
      });

      if (headRes.url && headRes.url.includes('tiktok.com')) {
        urlFinal = headRes.url;
        console.log('[Resolve] Sukses:', urlFinal);
      } else {
        console.warn('[Resolve] URL final tidak valid, pakai URL asli');
      }
    } catch (err) {
      console.warn('[Resolve] Gagal:', err.message, '— pakai URL asli');
    }

    // ============================================================
    // STEP 2: Fetch ke bintangapi dengan timeout
    // ============================================================
    const target = `https://bintangapi.my.id/api/amfind/?url=${encodeURIComponent(urlFinal)}`;
    console.log('[Fetch API]', target);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 detik

    let r;
    try {
      r = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Server preset (bintangapi) kelamaan nebak preset (>50 detik). Coba lagi atau pakai video dengan komentar lebih sedikit.',
          resolvedUrl: urlFinal,
        });
      }
      throw err;
    }
    clearTimeout(timeoutId);

    console.log('[API Status]', r.status);

    // ============================================================
    // STEP 3: Baca & parse response
    // ============================================================
    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Bukan JSON — berarti HTML error dari Cloudflare / Nginx bintangapi
      const preview = text.slice(0, 200).replace(/\s+/g, ' ');

      if (text.includes('504') || text.toLowerCase().includes('gateway time-out') || text.toLowerCase().includes('timeout')) {
        return res.status(504).json({
          success: false,
          error: 'Server preset (bintangapi) timeout. Kemungkinan video punya terlalu banyak komentar.',
          status: r.status,
          resolvedUrl: urlFinal,
        });
      }

      if (text.includes('403') || text.toLowerCase().includes('forbidden')) {
        return res.status(403).json({
          success: false,
          error: 'Akses ke server preset diblokir. Coba beberapa saat lagi.',
          status: r.status,
        });
      }

      return res.status(502).json({
        success: false,
        error: 'Server preset balikin error tidak dikenal.',
        status: r.status,
        preview,
        resolvedUrl: urlFinal,
      });
    }

    // Tambah info URL final
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