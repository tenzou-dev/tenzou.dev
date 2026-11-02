# tenzou.dev

Situs pribadi + admin panel. Statis (HTML/CSS/JS), konten disimpan di Cloudflare KV
lewat Pages Functions. Tanpa framework, tanpa build step.

```
tenzou-dev/
├─ index.html            # home
├─ projects.html         # /projects  (auto dari GitHub API)
├─ blog.html             # /blog
├─ admin.html            # /admin     (password)
├─ content.json          # default content (dipakai kalau KV masih kosong)
├─ assets/
│  ├─ style.css
│  ├─ theme.js           # tema + toast
│  ├─ site.js            # render halaman publik
│  └─ admin.js           # editor konten
├─ functions/
│  ├─ _lib/http.js
│  └─ api/
│     ├─ auth.js         # POST /api/auth
│     ├─ content.js      # GET / PUT /api/content
│     └─ where.js        # GET /api/where (lokasi pengunjung via request.cf)
├─ dev-server.mjs        # server lokal (menjalankan Functions yang sama)
├─ DEPLOY.md             # panduan deploy Cloudflare (mulai dari sini)
├─ robots.txt
├─ _headers
└─ _redirects
```

## Menjalankan lokal

```powershell
cd tenzou-dev
node dev-server.mjs
# http://127.0.0.1:4173
```

Password admin default `admin` (bisa diganti):

```powershell
$env:ADMIN_PASSWORD="rahasia"; node dev-server.mjs
```

Konten yang disimpan lewat `/admin` di mode lokal masuk ke `.dev-content.json`
(sudah di-gitignore). Hapus file itu untuk kembali ke `content.json`.

## Deploy ke Cloudflare Pages

Panduan langkah demi langkah + troubleshooting ada di **[DEPLOY.md](DEPLOY.md)**.
Ringkasnya:

1. Push folder ini ke repo GitHub.
2. Dashboard Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build command: kosong. Output directory: `/` (atau `tenzou-dev` kalau di dalam monorepo).
4. **Buat KV namespace**: Workers & Pages → **KV** → Create instance, misal `tenzou-content`.
5. Di project Pages → **Settings → Bindings → Add → KV namespace**:
   - Variable name: `CONTENT`
   - KV namespace: `tenzou-content`
6. Di **Settings → Variables and Secrets → Add**:
   - `ADMIN_PASSWORD` = password panjang (minimal 20 karakter, ini satu-satunya proteksi)
   - pilih tipe **Secret**
7. Deploy ulang, lalu buka `https://tenzou.dev/admin`.
8. Custom domain `tenzou.dev` di tab **Custom domains**.

Selama KV masih kosong, situs memakai `content.json` apa adanya. Setelah kamu
menekan **simpan** di `/admin`, isi KV yang dipakai.

### Setelah deploy pertama

1. Buka `/admin`, masuk pakai `ADMIN_PASSWORD`.
2. Isi **username github** — ini yang dipakai halaman `/projects`. Tanpa ini halaman
   projects cuma menampilkan pesan kosong.
3. Rapikan intro, sosial, dan tulisan, lalu **simpan**.

## Cara kerja

- **Konten**: `GET /api/content` mengembalikan isi KV, atau `null` → situs fallback ke `content.json`.
  `PUT /api/content` butuh header `Authorization: Bearer <ADMIN_PASSWORD>`, memvalidasi lalu menulis ke KV.
- **Projects**: `projects.html` memanggil GitHub API (`/users/<username>/repos?type=owner`),
  jadi hanya repo **publik** yang muncul. Repo internal instansi tidak pernah ikut.
  Hasil di-cache 10 menit di sessionStorage supaya tidak kena rate limit.
- **Koordinat**: `GET /api/where` membaca `request.cf.latitude/longitude` (data geo Cloudflare).
  Tidak ada GPS prompt, tidak ada request ke pihak ketiga, dan tidak disimpan.
  Saat lokal, dev-server mengirim koordinat contoh.
- **Tema**: `localStorage` (`tenzou-theme`), tombol `light.` / `dark.`, shortcut `t`.

## Yang perlu diganti

| Hal | Di mana |
| --- | --- |
| Nama, intro, versi, username GitHub, sosial, tulisan | `/admin` (atau `content.json` untuk default) |
| Link sosial | `/admin` → bagian sosial |
| Username GitHub | `/admin` → "username github" |
| Password admin | Environment variable `ADMIN_PASSWORD` |
| Nama domain / meta OG | `<head>` tiap halaman |

Catatan keamanan: password dikirim sebagai Bearer token di setiap penyimpanan (HTTPS),
tidak disimpan di cookie, dan hanya disimpan di `sessionStorage` browser kamu.
Karena tidak ada rate limit, pakai password yang panjang dan acak.

## Struktur Functions

`functions/` otomatis jadi route di Cloudflare Pages:

- `/api/auth` → `functions/api/auth.js`
- `/api/content` → `functions/api/content.js`
- `/api/where` → `functions/api/where.js`

File di dalam `functions/_lib/` tidak menjadi route, hanya dipakai untuk import.
