# 🔍 WebScope — Site Analiz Platformu

Gerçek zamanlı web analiz platformu. ipinfo.io, Google PageSpeed ve BuiltWith API'larını kullanır.

---

## 🚀 Kurulum (5 dakika)

### 1. Bağımlılıkları yükle
```bash
npm install
```

### 2. API Key'leri al (hepsi ücretsiz)

| Servis | Ücretsiz Kota | Kayıt |
|--------|--------------|-------|
| ipinfo.io | 50.000 sorgu/ay | https://ipinfo.io/signup |
| Google PageSpeed | 25.000 sorgu/gün | https://console.cloud.google.com |
| BuiltWith | 500 sorgu/ay | https://api.builtwith.com |

### 3. .env.local dosyası oluştur
```bash
cp .env.example .env.local
```

`.env.local` dosyasını düzenle:
```
IPINFO_TOKEN=buraya_ipinfo_token
GOOGLE_PAGESPEED_KEY=buraya_google_key
BUILTWITH_KEY=buraya_builtwith_key
```

### 4. Geliştirme sunucusunu başlat
```bash
npm run dev
```

Tarayıcıda aç: http://localhost:3000

---

## ☁️ Vercel'e Deploy

### Yöntem 1 — GitHub üzerinden (önerilen)
1. Bu klasörü GitHub'a push et
2. vercel.com → "New Project" → repoyu seç
3. Vercel panelinde: Settings → Environment Variables
4. Şu değişkenleri ekle:
   - `IPINFO_TOKEN`
   - `GOOGLE_PAGESPEED_KEY`
   - `BUILTWITH_KEY`
5. Redeploy → canlıya geç 🎉

### Yöntem 2 — Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 📡 API Endpoint

```
GET /api/analyze?url=apple.com
```

Döndürdüğü veri:
```json
{
  "domain": "apple.com",
  "fetched_at": "2026-04-01T10:00:00.000Z",
  "geo": {
    "ip": "17.253.144.10",
    "city": "Cupertino",
    "region": "California",
    "country": "US",
    "country_name": "Amerika Birleşik Devletleri",
    "org": "AS714 Apple Inc.",
    "timezone": "America/Los_Angeles"
  },
  "performance": {
    "performance": 92,
    "accessibility": 88,
    "seo": 95,
    "fcp": "1.2 s",
    "lcp": "2.1 s",
    "cls": "0.02"
  },
  "technologies": [
    { "name": "Akamai", "category": "CDN" },
    ...
  ]
}
```

---

## 🗺️ Mimari

```
Browser → Next.js Frontend (pages/index.js)
               ↓
         Next.js API Route (pages/api/analyze.js)   ← API key'ler burada gizli
               ↓
    ┌──────────┬──────────┬──────────┐
 ipinfo.io  PageSpeed  BuiltWith
```

---

## 💰 Startup Büyüme Planı

| Aşama | API'lar | Maliyet |
|-------|---------|---------|
| MVP | ipinfo + PageSpeed + BuiltWith | Ücretsiz |
| Beta | + Majestic (backlink) | ~$50/ay |
| Pro | + SimilarWeb API (trafik) | ~$200/ay |
| Scale | + SEMrush (keywords) | ~$500/ay |
