# Deploy ke Cloudflare

Panduan ini khusus untuk folder `tenzou-dev/`. Tidak ada build step — yang di-upload
adalah file apa adanya, dan folder `functions/` otomatis menjadi API.

> **Penting:** jangan pakai drag-and-drop di dashboard Cloudflare Pages.
> Upload manual hanya mengirim file statis dan **tidak** menjalankan folder `functions/`,
> jadi `/admin` tidak akan bisa menyimpan. Pakai **Git integration** (cara A) atau
> **Wrangler CLI** (cara B).

---

## Sebelum deploy (2 menit)

1. Pastikan folder ini sudah di-push ke repo GitHub (cara A), atau punya akses terminal (cara B).
2. Siapkan password admin yang panjang dan acak, contoh:

   ```powershell
   # generate 32 karakter acak
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
   ```

3. Catat password itu — akan dipasang sebagai secret `ADMIN_PASSWORD`, bukan ditulis di file.

---

## Cara A — Git integration (disarankan)

### 1. Buat project Pages

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. **Create** → tab **Pages** → **Connect to Git**.
3. Pilih repo yang berisi folder ini.
4. Isi:
   - **Project name**: `tenzou-dev` (bebas)
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: kosongkan
   - **Build output directory**: `/` — atau `tenzou-dev` kalau folder ini ada di dalam monorepo
5. **Save and Deploy**. Tunggu sampai status **Success**.

### 2. Buat KV namespace

1. **Workers & Pages** → **KV** → **Create instance**.
2. Nama: `tenzou-content` → **Create**.

### 3. Binding KV ke project Pages

1. Buka project Pages → **Settings** → **Bindings** (di UI baru: **Functions → Bindings**).
2. **Add** → **KV namespace**.
3. **Variable name**: `CONTENT`  ← harus persis ini
4. **KV namespace**: `tenzou-content`
5. **Save**.

### 4. Pasang password admin

1. Masih di **Settings** → **Variables and Secrets**.
2. **Add**:
   - **Name**: `ADMIN_PASSWORD`
   - **Value**: password acak dari langkah sebelumnya
   - **Type**: **Secret**
3. **Save**.

### 5. Deploy ulang

Binding dan secret baru dipakai setelah deploy berikutnya:

- Tab **Deployments** → deployment terakhir → menu `...` → **Retry deployment**,
  atau push commit kosong ke repo.

### 6. Pasang domain

1. Project Pages → **Custom domains** → **Set up a custom domain**.
2. Masukkan `tenzou.dev` → ikuti instruksi DNS.
3. Ulangi untuk `www` kalau mau (atau buat redirect `www` → apex).

---

## Cara B — Wrangler CLI (tanpa Git)

Butuh Node.js. Jalankan dari dalam folder `tenzou-dev`:

```powershell
npx wrangler login
npx wrangler pages project create tenzou-dev
npx wrangler pages deploy . --project-name tenzou-dev
```

Lalu buat KV namespace dan pasang binding + secret:

```powershell
# buat namespace, catat id yang muncul
npx wrangler kv namespace create tenzou-content

# pasang secret (akan diminta mengetik nilainya)
npx wrangler pages secret put ADMIN_PASSWORD --project-name tenzou-dev
```

Binding KV untuk Pages dilakukan lewat dashboard
(**Settings → Bindings → KV namespace**, variable name `CONTENT`), lalu deploy ulang:

```powershell
npx wrangler pages deploy . --project-name tenzou-dev
```

> Deploy ulang setiap kali ada perubahan file. Untuk cara A, cukup `git push`.

---

## Setelah deploy pertama

Buka `https://<project>.pages.dev/admin` (atau `https://tenzou.dev/admin`).

1. Masuk dengan `ADMIN_PASSWORD`.
2. Isi **username github** — halaman `/projects` mengambil repo publik dari username ini.
   Tanpa ini, halaman projects hanya menampilkan pesan kosong.
3. Periksa nama, intro, versi footer, dan link sosial. Ganti yang masih contoh.
4. **Simpan**.

Setelah disimpan, isi KV yang dipakai. File `content.json` hanya fallback selama KV kosong.

---

## Checklist hasil deploy

| Cek | Harusnya |
| --- | --- |
| `/` | Nama vertikal, intro, koordinat pengunjung, ikon sosial |
| `/projects` | Daftar repo publik GitHub (bukan repo internal) |
| `/blog` | Daftar tulisan dari admin |
| `/admin` | Form login muncul, bisa simpan → status `tersimpan ✓` |
| Ganti tema | Tombol `light.` / `dark.` bekerja, tersimpan setelah reload |
| `/api/content` | `{"ok":true,"content":...}` (bukan halaman HTML) |
| `/api/where` | `{"ok":true,"lat":...,"lon":...}` |

---

## Kalau ada masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| `/admin` bilang **"API tidak tersedia di host ini"** | `functions/` tidak ter-deploy (upload manual) | Deploy lewat Git atau `wrangler pages deploy` |
| Login gagal dengan pesan **"ADMIN_PASSWORD belum diset"** | Secret belum dibuat / belum deploy ulang | Buat secret, lalu retry deployment |
| Simpan gagal **"KV binding CONTENT belum diset"** | Binding salah nama atau belum ada | Tambah binding `CONTENT`, deploy ulang |
| Login selalu **"password salah"** | Secret berubah tapi browser masih menyimpan token lama | Klik **keluar**, lalu login lagi |
| `/projects` kosong | Username GitHub belum diisi | Isi di `/admin` → simpan |
| `/projects` gagal memuat | Rate limit GitHub (60 req/jam per IP) | Tunggu beberapa menit; hasil sukses di-cache 10 menit |
| Baris koordinat tidak muncul | Cloudflare tidak mengirim data geo (mis. VPN) | Normal — baris memang disembunyikan |
| Perubahan di `/admin` tidak terlihat | Browser masih memakai cache konten lama | Hard reload (Ctrl+Shift+R) |

---

## Catatan keamanan

- `ADMIN_PASSWORD` adalah satu-satunya proteksi. Pakai minimal 20 karakter acak,
  jangan pakai kata yang mudah ditebak.
- Password dikirim sebagai header `Authorization: Bearer ...` lewat HTTPS dan hanya
  disimpan di `sessionStorage` browser (hilang saat tab ditutup). Tidak ada cookie.
- Tidak ada rate limit di endpoint auth. Kalau mau lebih aman, tambahkan
  Cloudflare **Rate limiting rule** untuk `/api/auth` dan `/api/content` (POST/PUT).
- `/admin` sudah `noindex` dan diblokir di `robots.txt`, tapi itu bukan proteksi —
  password tetap yang utama.
- File development (`dev-server.mjs`, `README.md`, `DEPLOY.md`) ikut ter-upload tapi
  di-redirect ke `/` lewat `_redirects`, jadi tidak tampil sebagai halaman publik.
- Repo internal instansi tidak pernah tampil di `/projects` karena halaman hanya
  membaca repo **publik** milik username yang kamu isi.
