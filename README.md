# Jarvis

Kişisel üretkenlik PWA'sı (Vite + Preact + TypeScript + Dexie). Tek kullanıcı, backend yok; veri tarayıcıda IndexedDB'de durur.

## Komutlar

```
npm install
npm run dev       # yerel geliştirme
npm test          # birim testleri
npm run build     # tip kontrolü + üretim derlemesi (dist/)
npm run preview   # derlemeyi yerelde sun
npm run deploy    # build + Cloudflare Pages'e yükle
```

## Yayınlama (Cloudflare Pages)

1. `npx wrangler login` (tarayıcıda Cloudflare hesabına giriş)
2. Bir kez: `npx wrangler pages project create jarvis --production-branch main`
3. `npm run deploy` -> `https://jarvis-xxx.pages.dev` adresi döner
4. Cloudflare Pages -> jarvis -> Custom domains -> `jarvis.emirhandurmuskaya.com` ekle.
   Alan adı Cloudflare'de değilse, DNS sağlayıcısında `jarvis` için `CNAME` kaydı ekle: `jarvis` -> `jarvis-xxx.pages.dev`
5. `https://jarvis.emirhandurmuskaya.com` açılmalı, HTTPS geçerli olmalı.

`public/_headers` service worker'ın (`/sw.js`) önbelleğe alınmamasını sağlar; güncellemeler böylece hemen görünür.

## Telefonda kurulum

Safari -> Paylaş -> Ana Ekrana Ekle. Ayarlar ekranındaki "iPhone Kısayolları" bölümünde Kısayollar için hazır adresler var.
