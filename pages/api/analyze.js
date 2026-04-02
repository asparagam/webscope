/**
 * WebScope — /api/analyze
 * Fast endpoint: returns geo + tech instantly (no PageSpeed)
 * Performance is loaded separately via /api/perf
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url parameter required' })

  const domain = url.replace(/https?:\/\//i, '').replace(/\/$/, '').toLowerCase()

  // ── 1. ipinfo.io — DNS resolve then geo lookup ──────────────────────────
  let geoData = null
  try {
    const token = process.env.IPINFO_TOKEN
    const dnsRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`)
    let ipAddress = null
    if (dnsRes.ok) {
      const dns = await dnsRes.json()
      const aRecord = dns.Answer?.find(r => r.type === 1)
      ipAddress = aRecord?.data || null
    }
    const endpoint = ipAddress
      ? `https://ipinfo.io/${ipAddress}?token=${token}`
      : `https://ipinfo.io?token=${token}`
    const ipRes = await fetch(endpoint, { headers: { 'Accept': 'application/json' } })
    if (ipRes.ok) {
      const ip = await ipRes.json()
      geoData = {
        ip: ipAddress || ip.ip,
        city: ip.city || null,
        region: ip.region || null,
        country: ip.country || null,
        country_name: getCountryName(ip.country),
        org: ip.org || null,
        timezone: ip.timezone || null,
        loc: ip.loc || null,
        hostname: domain,
      }
    }
  } catch (e) { console.error('ipinfo error:', e.message) }

  // ── 2. BuiltWith — Tech stack ───────────────────────────────────────────
  let techData = null
  try {
    const key = process.env.BUILTWITH_KEY
    const bwRes = await fetch(`https://api.builtwith.com/free1/api.json?KEY=${key}&LOOKUP=${domain}`)
    if (bwRes.ok) {
      const bw = await bwRes.json()
      const groups = bw.Results?.[0]?.Result?.Paths?.[0]?.Technologies || []
      techData = groups.map(t => ({
        name: t.Name,
        category: t.Categories?.[0] || 'Other',
        link: t.Link || null,
      })).slice(0, 20)
    }
  } catch (e) { console.error('builtwith error:', e.message) }

  return res.status(200).json({
    domain,
    fetched_at: new Date().toISOString(),
    geo: geoData,
    technologies: techData,
  })
}

function getCountryName(code) {
  const map = {
    US:'United States', TR:'Turkey', GB:'United Kingdom', DE:'Germany',
    FR:'France', JP:'Japan', CN:'China', IN:'India', BR:'Brazil',
    CA:'Canada', AU:'Australia', NL:'Netherlands', SE:'Sweden',
    NO:'Norway', CH:'Switzerland', SG:'Singapore', KR:'South Korea',
    RU:'Russia', IT:'Italy', ES:'Spain', MX:'Mexico', ZA:'South Africa',
    PL:'Poland', BE:'Belgium', AT:'Austria', IE:'Ireland', FI:'Finland',
    DK:'Denmark', PT:'Portugal', CZ:'Czech Republic', HU:'Hungary',
    RO:'Romania', IL:'Israel', SA:'Saudi Arabia', AE:'UAE',
    PK:'Pakistan', NG:'Nigeria', EG:'Egypt', AR:'Argentina', CL:'Chile',
  }
  return map[code] || code || 'Unknown'
}
