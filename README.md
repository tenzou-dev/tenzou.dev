# tenzou.dev

Situs pribadi + admin panel. Statis (HTML/CSS/JS), konten disimpan di Cloudflare KV
lewat Pages Functions. Tanpa framework, tanpa build step.

Repo: <https://github.com/tenzou-dev/tenzou.dev> (branch `main`).

```
tenzou-dev/
├─ index.html            # home
├─ projects.html         # /projects  (project manual + repo GitHub)
├─ blog.html             # /blog       (daftar artikel)
├─ post.html             # /post.html?slug=... (artikel, like, komentar)
├─ admin.html            # /admin     (login GitHub)
├─ favicon.svg           # ikon TZ (utama)
├─ favicon-32.png        # fallback PNG 32px
├─ apple-touch-icon.png  # ikon iOS 180px
├─ content.json          # default content (dipakai kalau KV masih kosong)
├─ assets/
│  ├─ style.css
│  ├─ theme.js           # tema, font + toast
│  ├─ site.js            # render halaman publik
│  ├─ post.js            # render artikel + like/komentar
│  └─ admin.js           # editor konten
├─ functions/
│  ├─ _lib/
│  │  ├─ auth.js         # GitHub OAuth + session cookie
│  │  └─ http.js
│  └─ api/
│     ├─ auth.js         # POST /api/auth (password lokal)
│     ├─ auth/
│     │  ├─ config.js    # GET /api/auth/config
│     │  ├─ github.js    # GET /api/auth/github
│     │  ├─ callback.js  # GET /api/auth/callback
│     │  └─ session.js   # GET / DELETE /api/auth/session
│     ├─ blog.js         # GET /api/blog + POST like/komentar
│     ├─ community.js    # GET /api/community + POST kirim/moderasi project komunitas
│     ├─ content.js      # GET / PUT /api/content
│     ├─ project-meta.js # GET /api/project-meta (deteksi bahasa/stack)
│     ├─ status.js       # GET /api/status (versi commit + uptime)
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

Di lokal, login memakai password (default `admin`, bisa diganti). GitHub OAuth
tidak diaktifkan kecuali kamu mengisi variabel `GITHUB_*` — lihat `DEPLOY.md`.

```powershell
$env:ADMIN_PASSWORD="rahasia"; node dev-server.mjs
```

Konten yang disimpan lewat `/admin` di mode lokal masuk ke `.dev-content.json`
(sudah di-gitignore). Hapus file itu untuk kembali ke `content.json`.

> Default `admin` **hanya untuk dev-server lokal**. Di Cloudflare, login memakai
> GitHub OAuth; `ADMIN_PASSWORD` hanya fallback opsional.

## Deploy ke Cloudflare Pages

Panduan langkah demi langkah + troubleshooting ada di **[DEPLOY.md](DEPLOY.md)**.
Ringkasnya:

1. Push folder ini ke repo GitHub.
2. Dashboard Cloudflare → **Workers & Pages** → **Create application** → tab **Pages**
   (bukan Workers) → **Connect to Git**.
3. Build command: kosong. Output directory: `/` (atau `tenzou-dev` kalau di dalam monorepo).
4. **Buat KV namespace**: Workers & Pages → **KV** → Create instance, misal `tenzou-content`.
5. Di project Pages → **Settings → Bindings → Add → KV namespace**:
   - Variable name: `CONTENT`
   - KV namespace: `tenzou-content`
6. Buat **GitHub OAuth App** (GitHub → Settings → Developer settings → OAuth Apps):
   - **Homepage URL**: `https://<project>.pages.dev`
   - **Authorization callback URL**: `https://<project>.pages.dev/api/auth/callback`
7. Di **Settings → Variables and Secrets → Add**:
   - `GITHUB_CLIENT_ID` (text)
   - `GITHUB_CLIENT_SECRET` (Secret)
   - `GITHUB_OWNER` = username GitHub kamu
   - `SESSION_SECRET` = string acak 32+ karakter (Secret)
   - `ADMIN_PASSWORD` (opsional, hanya fallback lokal/CLI)
8. Deploy ulang, buka `https://<project>.pages.dev/admin`, klik **Sign in with GitHub**.
9. Custom domain `tenzou.dev` di tab **Custom domains** (kalau sudah punya domainnya).

Selama KV masih kosong, situs memakai `content.json` apa adanya. Setelah kamu
menekan **simpan** di `/admin`, isi KV yang dipakai.

> Domain `tenzou.dev` sudah aktif dan dipakai sebagai alamat utama. Pastikan
> **Authorization callback URL** di OAuth App adalah
> `https://tenzou.dev/api/auth/callback` (atau set `OAUTH_CALLBACK_URL`), supaya
> login GitHub tidak gagal `redirect_uri` mismatch. Alamat `*.pages.dev` tetap
> berfungsi sebagai cadangan.

### Setelah deploy pertama

1. Buka `/admin`, klik **Sign in with GitHub** (hanya akun `GITHUB_OWNER` yang diterima).
2. Admin dibagi menjadi lima tab: **profil**, **project**, **komunitas**, **tulisan**, **sosial**.
   Tab terakhir yang dibuka diingat di `localStorage`.
3. Di tab **project** dan **tulisan**, daftar tampil sebagai judul saja. Klik judul
   untuk membuka editornya, klik lagi untuk menutup.
4. Isi **username github** — ini yang dipakai halaman `/projects` untuk repo publik.
5. Tambah **project manual** untuk karya yang tidak ada di GitHub; tempel URL-nya dan
   bahasa/stack akan dideteksi otomatis (bisa diubah manual).
6. Rapikan intro, sosial, dan tulisan, lalu **simpan**.

## Cara kerja

- **Konten**: `GET /api/content` mengembalikan isi KV, atau `null` → situs fallback ke `content.json`.
  `PUT /api/content` butuh session GitHub (cookie) atau `Authorization: Bearer <ADMIN_PASSWORD>`,
  memvalidasi lalu menulis ke KV.
- **Projects**: halaman `/projects` menggabungkan dua sumber:
  1. **Project manual** dari `/admin` — untuk karya yang tidak ada di GitHub.
  2. **Repo publik** dari GitHub API (`/users/<username>/repos?type=owner`).
  Repo internal instansi tidak pernah ikut. Hasil GitHub di-cache 10 menit.
- **Project komunitas**: `/projects` punya tab **komunitas** berisi repo orang lain.
  Pengunjung bisa menekan **+ tambah**, mengisi judul, deskripsi, link repo GitHub,
  Threads/sosmed, dan link demo, lalu mencentang persetujuan. Kiriman masuk ke
  antrean **pending** di KV; admin menyetujui atau menolaknya lewat
  `/admin` → tab **komunitas**. Saat dikirim, repo dicek ke GitHub API untuk
  mengambil avatar, bahasa, bintang, lisensi, dan waktu update. Tampilan kartunya
  dibuat seperti share card repo GitHub: avatar, `owner/repo`, deskripsi, bahasa,
  bintang, dan tautan sosial. Hanya repo publik yang boleh dikirim. Admin bisa
  menambah repo pilihan lewat **+ tambah manual** di tab **komunitas**; selama
  sesi admin aktif, kiriman langsung tampil tanpa antrean review. Kalau GitHub
  sedang membatasi permintaan (rate limit), repo tetap disimpan dengan metadata
  sementara; buka tab **komunitas** lagi atau tekan **perbarui metadata** untuk
  mengambil bintang/bahasa/avatar yang benar.
- **Deteksi stack**: saat URL project diisi/diubah (atau lewat tombol **deteksi**),
  `/admin` memanggil `GET /api/project-meta?url=...`. Endpoint ini hanya untuk sesi
  admin, menolak host privat/lokal, lalu membaca metadata: repo GitHub lewat GitHub
  API (language + topics), situs lain dengan memeriksa HTML, header, script, dan CSS
  untuk penanda framework (Next.js, React, Vue, WordPress, Supabase, dan seterusnya).
  Hasilnya disimpan sebagai `stack` dan tampil sebagai badge **di bawah judul**
  project (satu badge per item, dipisah `·`); field ini tetap bisa diedit manual.
  Repo GitHub juga menampilkan bahasa di bawah judul dengan cara yang sama.
  Kalau tidak terdeteksi, isi sendiri — tidak apa-apa.
- **Admin**: satu halaman dengan lima tab (profil, project, komunitas, tulisan, sosial).
  Daftar project dan tulisan tampil ringkas sebagai judul; klik untuk membuka editor.
  Tab terakhir disimpan di `localStorage` supaya tidak kembali ke atas setiap reload.
- **Blog**: setiap tulisan punya `title`, `date`, `summary`, `tags`, `body`, dan
  `slug` yang dibuat dari judul (bisa diubah lewat data tersimpan). Daftar di
  `/blog` menampilkan tanggal, estimasi waktu baca, ringkasan, dan tag. Membuka
  satu tulisan mengarah ke `/post.html?slug=<slug>`, yang merender isi Markdown
  sederhana: heading (`##`, `###`), list, code fence, blockquote, **bold**,
  *italic*, inline `code`, dan link `http(s)`.
- **Like & komentar**: disimpan terpisah dari konten di KV `blog:<slug>` lewat
  `GET/POST /api/blog`, jadi menyimpan ulang tulisan di `/admin` tidak menghapus
  like atau komentar. Like adalah hitungan per artikel; status "sudah like"
  disimpan di `localStorage` browser. Komentar butuh nama + isi, dibatasi 1000
  karakter, dan memakai field honeypot tersembunyi untuk menolak bot sederhana.
- **Login**: GitHub OAuth (`/api/auth/github` → `/api/auth/callback`). Hanya
  `GITHUB_OWNER` (dan `GITHUB_ALLOWED_USERS`) yang boleh masuk. Session berupa
  cookie HttpOnly bertanda tangan `SESSION_SECRET`, berlaku 7 hari.
- **Koordinat**: `GET /api/where` membaca `request.cf.latitude/longitude` (data geo Cloudflare).
  Tidak ada GPS prompt, tidak ada request ke pihak ketiga, dan tidak disimpan.
  Saat lokal, dev-server mengirim koordinat contoh.
- **Versi footer**: `GET /api/status` membaca `CF_PAGES_COMMIT_SHA`, menghitung commit
  lewat GitHub API, lalu menampilkan `v1.<jumlah commit>.0-<short sha>`. Hasilnya
  di-cache di KV (`site:status`), jadi tidak memanggil GitHub di setiap request.
- **Uptime**: angka `hari.jammenitdetikmilidetik` (contoh `3.135420307`) di bawah
  koordinat, dihitung dari tanggal repo dibuat dan berdetak tiap frame.
- **Intro berwarna**: teks intro di home mendukung penanda ala Markdown yang
  dirender jadi warna ala editor kode: `` `kata` `` (hijau, seperti token kode),
  `**kata**` (ungu), `*kata*` (miring), `__kata__` (garis bawah), dan
  `[teks](https://…)` (tautan). Tulis penandanya langsung di `/admin` → tab
  **profil** → **intro**; teks yang terlihat tetap sama, hanya gayanya yang berubah.
- **Tema**: `localStorage` (`tenzou-theme`), tombol `light.` / `dark.`, shortcut `t`.
- **Font**: pilihan font tampilan disimpan di konten (`font`) dan dipilih lewat
  `/admin` → tab **profil** → **font tampilan**. Pilihan: JetBrains Mono (default),
  IBM Plex Mono, Space Mono, Fira Code, dan system monospace. Memilih font langsung
  menyimpan konten (jadi berlaku untuk semua pengunjung) dan nilai terakhir juga
  di-cache di `localStorage` (`tenzou-font`) supaya tidak berkedip saat reload.
- **Background home**: halaman home punya lapisan dekoratif tipis di belakang konten.
  Pilih gaya lewat `/admin` → tab **profil** → **background home**: `kode` (potongan
  kode, default), `grid` (grid titik), atau `none`. Geser **opasitas background**
  untuk mengatur seberapa tipis tampilannya (default 12%). Nilainya disimpan di
  konten (`background`, `backgroundOpacity`) dan di-cache di `localStorage` supaya
  tidak berkedip. Background hanya muncul di home; header, footer, dan teks tetap
  solid di atasnya.
- **Header & footer**: keduanya menempel di layar (`position: sticky`) saat halaman
  di-scroll. Header di atas, footer di bawah, dengan latar solid agar konten tidak
  tembus.
- **Favicon**: `favicon.svg` berisi monogram **tz** (putih di atas kartu hitam
  membulat, hasil vektor dari logo asli), dengan `favicon-32.png`,
  `apple-touch-icon.png`, dan `favicon-512.png` sebagai fallback. Semua halaman
  memakai ikon yang sama.
- **Ikon sosial**: ikon ditentukan dari URL, bukan dari pilihan tipe. Tempel link
  Instagram/Facebook/LinkedIn/YouTube/TikTok/WhatsApp/Discord/Reddit/Pinterest/
  Twitch/Spotify/Medium/Threads/Bluesky/GitLab/Stack Overflow/Dribbble/Behance/
  Mastodon/dev.to dan ikon brand yang sesuai muncul otomatis. Link yang tidak
  dikenali memakai ikon rantai (`link`). Tipe di `/admin` hanya berfungsi sebagai
  override manual kalau diperlukan.

## Yang perlu diganti

| Hal | Di mana |
| --- | --- |
| Nama, intro, username GitHub, font, sosial, tulisan | `/admin` (atau `content.json` untuk default) |
| Artikel + tag | `/admin` → tab **tulisan** (tag dipisah koma) |
| Project manual (di luar GitHub) | `/admin` → tab **project** (stack terisi otomatis dari URL) |
| Project komunitas (kiriman pengunjung) | `/admin` → tab **komunitas** (setujui / tolak) |
| Link sosial | `/admin` → tab **sosial** |
| Username GitHub | `/admin` → "username github" |
| Login GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OWNER`, `SESSION_SECRET` |
| Password fallback | `ADMIN_PASSWORD` (opsional) |
| Nama domain / meta OG | `<head>` tiap halaman |

## Repo ini publik — aman?

Ya, selama secret tidak pernah ditulis di file. Isi repo ini bukan rahasia:
kode HTML/CSS/JS, `functions/`, `content.json`, dan dokumentasi. Siapa pun boleh
melihatnya — keamanan `/admin` tidak bergantung pada kode yang disembunyikan,
tetapi pada GitHub OAuth dan `SESSION_SECRET` yang hanya disimpan di Cloudflare.

| Boleh publik | Jangan pernah di-commit |
| --- | --- |
| `content.json`, HTML, CSS, JS | `GITHUB_CLIENT_SECRET` |
| Kode `functions/` | `SESSION_SECRET` |
| `README.md`, `DEPLOY.md` | `ADMIN_PASSWORD` (kalau dipakai) |
| Username GitHub & link sosial | Cloudflare API token |
|  | `.dev-content.json` (sudah di-gitignore) |
|  | `.env`, `.dev.vars` |

Kalau orang tahu alamat `/admin`, itu tidak masalah — tanpa akun GitHub yang
diizinkan, login ditolak. Hanya `GITHUB_OWNER` (dan `GITHUB_ALLOWED_USERS` kalau
diisi) yang bisa masuk.

Catatan teknis: setelah login, server membuat cookie `tz_session` yang HttpOnly,
SameSite=Lax, dan ditandatangani HMAC-SHA256 dengan `SESSION_SECRET` (berlaku 7 hari).
Token GitHub tidak disimpan. `ADMIN_PASSWORD` hanya fallback opsional untuk
lokal/CLI. Tidak ada rate limit bawaan, jadi aktifkan Cloudflare **Rate limiting**
untuk `/api/auth/*` kalau mau ekstra.

## Struktur Functions

`functions/` otomatis jadi route di Cloudflare Pages:

- `/api/auth` → `functions/api/auth.js` (password lokal)
- `/api/auth/config` → `functions/api/auth/config.js`
- `/api/auth/github` → `functions/api/auth/github.js`
- `/api/auth/callback` → `functions/api/auth/callback.js`
- `/api/auth/session` → `functions/api/auth/session.js`
- `/api/content` → `functions/api/content.js`
- `/api/blog` → `functions/api/blog.js`
- `/api/community` → `functions/api/community.js`
- `/api/project-meta` → `functions/api/project-meta.js`
- `/api/status` → `functions/api/status.js`
- `/api/where` → `functions/api/where.js`

File di dalam `functions/_lib/` tidak menjadi route, hanya dipakai untuk import.
