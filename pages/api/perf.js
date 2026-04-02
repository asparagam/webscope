/**
 * WebScope — /api/perf
 * Slow endpoint: runs Google PageSpeed Lighthouse test
 * Called separately after fast data is already shown
 */

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url parameter required' })

  const domain = url.replace(/https?:\/\//i, '').replace(/\/$/, '').toLowerCase()
  const fullUrl = 'https://' + domain

  try {
    const key = process.env.GOOGLE_PAGESPEED_KEY
    const psRes = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(fullUrl)}&strategy=mobile&key=${key}`,
      { signal: AbortSignal.timeout(25000) }
    )
    if (!psRes.ok) return res.status(200).json({ performance: null })

    const ps = await psRes.json()
    const cats   = ps.lighthouseResult?.categories || {}
    const audits = ps.lighthouseResult?.audits || {}

    return res.status(200).json({
      performance: {
        performance:   Math.round((cats.performance?.score   || 0) * 100),
        accessibility: Math.round((cats.accessibility?.score || 0) * 100),
        seo:           Math.round((cats.seo?.score           || 0) * 100),
        fcp:  audits['first-contentful-paint']?.displayValue  || null,
        lcp:  audits['largest-contentful-paint']?.displayValue || null,
        cls:  audits['cumulative-layout-shift']?.displayValue  || null,
        tti:  audits['interactive']?.displayValue              || null,
        tbt:  audits['total-blocking-time']?.displayValue      || null,
        server_response: audits['server-response-time']?.displayValue || null,
      }
    })
  } catch (e) {
    console.error('pagespeed error:', e.message)
    return res.status(200).json({ performance: null })
  }
}
