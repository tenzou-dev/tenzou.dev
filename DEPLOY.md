# Deploy ke Cloudflare

Panduan ini khusus untuk folder `tenzou-dev/`. Tidak ada build step — yang di-upload
adalah file apa adanya, dan folder `functions/` otomatis menjadi API.

Repo produksi: <https://github.com/tenzou-dev/tenzou.dev> (branch `main`).
Push ke repo itu akan memicu deploy Cloudflare Pages.

> **Penting:** jangan pakai drag-and-drop di dashboard Cloudflare Pages.
> Upload manual hanya mengirim file statis dan **tidak** menjalankan folder `functions/`,
> jadi `/admin` tidak akan bisa menyimpan. Pakai **Git integration** (cara A) atau
> **Wrangler CLI** (cara B).
>
> **Jangan pilih Workers.** Kalau log build berisi
> `Executing user deploy command: npx wrangler deploy` lalu error
> *"This project has a `functions` directory ... Automatic configuration cannot migrate
> Pages Functions to Workers yet"*, itu project **Workers**, bukan Pages.
> Hapus project itu, lalu buat project **Pages** lewat
> **Create application → tab Pages → Connect to Git**. Folder `functions/` hanya
> dikenali oleh Pages; Workers membutuhkan restrukturisasi terpisah.

---

## Sebelum deploy

1. Push folder ini ke repo GitHub (cara A), atau siapkan terminal + Node.js (cara B).
2. Catat **username GitHub** kamu — akan dipakai sebagai `GITHUB_OWNER`.
3. Login admin memakai **GitHub OAuth**, jadi kamu akan membuat OAuth App setelah
   URL `*.pages.dev` diketahui.

Tidak ada password yang perlu dibuat. `ADMIN_PASSWORD` sekarang hanya fallback
opsional untuk lokal/CLI.

---

## Cara A — Git integration (disarankan)

### 1. Buat project Pages

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. **Create application** → pilih tab **Pages** (bukan Workers) → **Connect to Git**.
3. Pilih repo yang berisi folder ini.
4. Isi:
   - **Project name**: `tenzou-dev` (bebas)
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: kosongkan
   - **Build output directory**: `/` — atau `tenzou-dev` kalau folder ini ada di dalam monorepo
5. **Save and Deploy**. Tunggu sampai status **Success**.
6. Catat URL-nya, misal `https://tenzou-dev.pages.dev`.

### 2. Buat KV namespace

1. **Workers & Pages** → **KV** → **Create instance**.
2. Nama: `tenzou-content` → **Create**.

### 3. Binding KV ke project Pages

1. Buka project Pages → **Settings** → **Bindings** (di UI baru: **Functions → Bindings**).
2. **Add** → **KV namespace**.
3. **Variable name**: `CONTENT`  ← harus persis ini
4. **KV namespace**: `tenzou-content`
5. **Save**.

### 4. Login dengan GitHub

#### 4a. Buat OAuth App

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Isi:
   - **Application name**: `tenzou.dev`
   - **Homepage URL**: `https://tenzou-dev.pages.dev` (URL dari langkah 1)
   - **Authorization callback URL**: `https://tenzou-dev.pages.dev/api/auth/callback`
3. **Register application**.
4. Catat **Client ID**, lalu **Generate a new client secret** dan catat nilainya
   (secret hanya ditampilkan sekali).

> URL callback harus **persis** sama. Kalau situs dibuka lewat domain sendiri
> (mis. `https://tenzou.dev`), callback harus `https://tenzou.dev/api/auth/callback`
> — bukan `*.pages.dev` — atau login akan gagal `redirect_uri` mismatch.
> `*.pages.dev` tetap bisa dipakai sebagai cadangan.

#### 4b. Pasang variabel di Cloudflare

Project Pages → **Settings** → **Variables and Secrets** → **Add**:

| Name | Nilai | Type |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | Client ID dari OAuth App | Text |
| `GITHUB_CLIENT_SECRET` | Client secret dari OAuth App | **Secret** |
| `GITHUB_OWNER` | username GitHub kamu | Text |
| `SESSION_SECRET` | string acak 32+ karakter | **Secret** |

Generate `SESSION_SECRET`:

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
```

Opsional:

- `GITHUB_ALLOWED_USERS` — daftar username tambahan, dipisah koma.
- `ADMIN_PASSWORD` — fallback login password (muncul sebagai link “use password”).
  Kalau tidak butuh, jangan diset.
- `OAUTH_CALLBACK_URL` — kalau callback ingin dipatok manual, misal
  `https://tenzou.dev/api/auth/callback`.

### 5. Deploy ulang

Binding dan variabel baru dipakai setelah deploy berikutnya:

- Tab **Deployments** → deployment terakhir → menu `...` → **Retry deployment**,
  atau push commit kosong ke repo.

### 6. Pasang domain

1. Project Pages → **Custom domains** → **Set up a custom domain**.
2. Masukkan `tenzou.dev` → ikuti instruksi DNS.
3. Ulangi untuk `www` kalau mau (atau buat redirect `www` → apex).
4. Setelah domain aktif, ubah **Authorization callback URL** di OAuth App menjadi
   `https://tenzou.dev/api/auth/callback`.

> **Belum punya domain?** Tidak perlu beli sekarang. Situs tetap jalan gratis di
> `https://<project>.pages.dev`, dan custom domain bisa ditambahkan kapan saja tanpa
> deploy ulang. `tenzou.dev` adalah domain sungguhan yang harus dibeli lebih dulu
> (Cloudflare Registrar menjualnya at-cost); setelah dibeli, masukkan domain itu ke
> akun Cloudflare lalu ulangi langkah di atas.

---

## Cara B — Wrangler CLI (tanpa Git)

Butuh Node.js. Jalankan dari dalam folder `tenzou-dev`:

```powershell
npx wrangler login
npx wrangler pages project create tenzou-dev
npx wrangler pages deploy . --project-name tenzou-dev
```

Lalu buat KV namespace, binding, dan variabel:

```powershell
# buat namespace, catat id yang muncul
npx wrangler kv namespace create tenzou-content

# secret OAuth (akan diminta mengetik nilainya)
npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name tenzou-dev
npx wrangler pages secret put SESSION_SECRET --project-name tenzou-dev
```

Binding KV dan variabel non-secret (`GITHUB_CLIENT_ID`, `GITHUB_OWNER`) diatur lewat
dashboard (**Settings → Bindings / Variables and Secrets**), lalu deploy ulang:

```powershell
npx wrangler pages deploy . --project-name tenzou-dev
```

> Deploy ulang setiap kali ada perubahan file. Untuk cara A, cukup `git push`.

---

## Setelah deploy pertama

Buka `https://<project>.pages.dev/admin` (atau `https://tenzou.dev/admin`).

1. Klik **Sign in with GitHub**. Hanya akun `GITHUB_OWNER` yang diterima.
2. Admin punya empat tab: **profil**, **project**, **tulisan**, **sosial**. Daftar
   project/tulisan tampil sebagai judul saja — klik judul untuk membuka editor.
3. Isi **username github** — halaman `/projects` mengambil repo publik dari username ini.
4. Tambah **project manual** untuk karya yang tidak ada di repo GitHub. Tempel URL-nya;
   bahasa/stack dianalisa otomatis lewat `/api/project-meta` dan tampil sebagai badge
   di bawah judul project. Kalau hasilnya kosong, isi manual di kolom stack.
5. Periksa nama, intro, link sosial, dan **font tampilan**. Ganti yang masih contoh.
   Versi footer otomatis mengikuti commit terbaru, jadi tidak perlu diisi.
6. **Simpan**.

Setelah disimpan, isi KV yang dipakai. File `content.json` hanya fallback selama KV kosong.

---

## Checklist hasil deploy

| Cek | Harusnya |
| --- | --- |
| `/` | Nama vertikal, intro, koordinat pengunjung, uptime berjalan, ikon sosial |
| `/projects` | Project manual + repo publik GitHub (bukan repo internal) |
| `/blog` | Daftar artikel dari admin, lengkap dengan tanggal, tag, dan waktu baca |
| `/post.html?slug=hello-world` | Isi artikel tampil, tag muncul, tombol like dan form komentar bekerja |
| `/api/blog?slug=hello-world` | `{"ok":true,"likes":0,"comments":[]}` |
| `/admin` | Empat tab (profil/project/tulisan/sosial), tombol **Sign in with GitHub**, bisa simpan → status `tersimpan ✓` |
| `/admin` → project | Klik judul membuka editor; URL terisi → stack terdeteksi otomatis (badge muncul di bawah judul di `/projects`) |
| `/admin` → profil → font | Pilih font → otomatis tersimpan → seluruh situs memakai font baru setelah refresh |
| `/admin` → profil → background | Pilih gaya + geser opasitas → simpan → background tipis muncul di home |
| Scroll halaman panjang | Header dan footer tetap menempel di layar |
| Tab browser | Ikon **TZ** muncul (favicon) di semua halaman |
| `/admin` → sosial | Tempel link Instagram/Facebook → ikon brand muncul otomatis di `/`; link asing memakai ikon rantai |
| `/api/project-meta?url=...` | `{"ok":true,"stack":"..."}` saat login; `401` tanpa sesi |
| Ganti tema | Tombol `light.` / `dark.` bekerja, tersimpan setelah reload |
| `/api/content` | `{"ok":true,"content":...}` (bukan halaman HTML) |
| `/api/auth/config` | `{"ok":true,"github":true,...}` setelah OAuth diset |
| `/api/where` | `{"ok":true,"lat":...,"lon":...}` |
| `/api/status` | `{"ok":true,"version":"v1.8.0-...","commits":8,...}` |

---

## Kalau ada masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| `/admin` bilang **"API tidak tersedia di host ini"** | `functions/` tidak ter-deploy (upload manual) | Deploy lewat Git atau `wrangler pages deploy` |
| **"Admin belum dikonfigurasi"** | Belum ada OAuth vars dan `ADMIN_PASSWORD` | Pasang variabel langkah 4b, deploy ulang |
| **"Login GitHub belum dikonfigurasi"** | Variabel OAuth belum lengkap / belum deploy ulang | Cek 4 variabel, lalu retry deployment |
| **"Akun GitHub ini tidak punya akses"** | Login dengan akun selain `GITHUB_OWNER` | Login dengan akun yang benar atau tambah `GITHUB_ALLOWED_USERS` |
| **"GitHub menolak login"** / `redirect_uri` mismatch | Callback URL di OAuth App tidak persis sama | Samakan dengan `https://<domain>/api/auth/callback` |
| **"Sesi login kedaluwarsa"** | Cookie state habis (lebih dari 10 menit) | Ulangi klik **Sign in with GitHub** |
| Simpan gagal **"KV binding CONTENT belum diset"** | Binding salah nama atau belum ada | Tambah binding `CONTENT`, deploy ulang |
| Simpan gagal **"Sesi habis"** | Session kedaluwarsa / `SESSION_SECRET` berubah | Login ulang |
| Like/komentar tidak muncul | KV `CONTENT` belum ter-bind atau request `/api/blog` gagal | Cek binding `CONTENT`, buka `/api/blog?slug=<slug>` |
| Artikel lama masih tampil | KV masih berisi daftar `posts` versi lama | Buka `/admin`, perbarui tulisan, lalu **simpan** |
| `/projects` kosong | Username GitHub belum diisi dan belum ada project manual | Isi di `/admin` → simpan |
| `/projects` gagal memuat repo | Rate limit GitHub (60 req/jam per IP) | Tunggu beberapa menit; hasil sukses di-cache 10 menit |
| Stack project kosong / "tidak terdeteksi" | Situs tidak mengekspos penanda framework, atau fetch diblokir | Isi kolom stack manual; deteksi hanya bantuan |
| Tombol **deteksi** bilang "login ulang" | Sesi admin kedaluwarsa | Login ulang, lalu klik **deteksi** |
| Baris koordinat tidak muncul | Cloudflare tidak mengirim data geo (mis. VPN) | Normal — baris memang disembunyikan |
| Perubahan di `/admin` tidak terlihat | Browser masih memakai cache konten lama | Hard reload (Ctrl+Shift+R) |

---

## Catatan keamanan

- Hanya akun `GITHUB_OWNER` (dan `GITHUB_ALLOWED_USERS`) yang bisa login. Tidak ada
  pendaftaran, tidak ada user lain.
- Setelah login, server membuat cookie `tz_session` yang **HttpOnly**, **Secure**,
  **SameSite=Lax**, ditandatangani HMAC-SHA256 dengan `SESSION_SECRET`, berlaku 7 hari.
  Token GitHub tidak disimpan di mana pun.
- Mengganti `SESSION_SECRET` akan mengeluarkan semua sesi yang ada.
- `GITHUB_CLIENT_SECRET` dan `SESSION_SECRET` hanya disimpan di Cloudflare sebagai
  Secret. Jangan pernah commit ke repo.
- Tidak ada rate limit bawaan. Kalau mau ekstra, tambahkan Cloudflare
  **Rate limiting rule** untuk `/api/auth/*` dan `PUT /api/content`.
- `/admin` sudah `noindex` dan diblokir di `robots.txt`, tapi itu bukan proteksi —
  OAuth tetap yang utama.
- File development (`dev-server.mjs`, `README.md`, `DEPLOY.md`) ikut ter-upload tapi
  di-redirect ke `/` lewat `_redirects`, jadi tidak tampil sebagai halaman publik.
- `/api/project-meta` hanya melayani sesi admin (cookie OAuth atau `ADMIN_PASSWORD`),
  menolak skema selain http(s), host privat/lokal, dan membatasi jumlah redirect serta
  ukuran respons. Endpoint ini tidak menyimpan apa pun — hasilnya hanya dikirim kembali
  ke admin untuk diisi ke kolom stack.
- Repo internal instansi tidak pernah tampil di `/projects` karena halaman hanya
  membaca repo **publik** milik username yang kamu isi.
