# 🌐 Zexin9 Gateway (Cloud & Serverless Edition)

> Next-Gen Multi-Provider AI Gateway & Multi-Tier Proxy dengan fitur Automatic Fallback, RTK Token Saver, Security Gate, dan kompatibilitas ganda (OpenAI & Anthropic API) yang siap dijalankan secara gratis di **Vercel** atau **Netlify**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzenn889%2FZexin9&project-name=zexin9-gateway&repository-name=Zexin9)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/zenn889/Zexin9)

---

## ⚡ Fitur Utama Zexin9

1. **Multi-Tier Auto Fallback (Anti Quota Exhausted)**
   - Jika provider utama Anda mengalami **Rate Limit (429)**, **Quota Habis (402/403)**, atau **Server Error (500/503)**, gateway secara otomatis mengalihkan request ke provider cadangan (misal: Anthropic Claude → OpenAI GPT-4o → Google Gemini → DeepSeek → Groq) tanpa memutus proses coding Anda!
2. **RTK Token Saver & Caveman Mode**
   - Kompresi whitespace, pembersihan redundansi git diff, dan opsi *Caveman Mode* (terse output) yang menghemat 20% - 40% token input/output.
3. **Kompatibilitas Penuh untuk Tool AI Terpopuler**
   - **Cursor IDE**: Tinggal masukkan Base URL `/v1`.
   - **Cline (VS Code)**: Provider OpenAI Compatible.
   - **Claude Code CLI (`claude`)**: Endpoint native `/v1/messages`.
   - **Continue.dev**, **Open WebUI**, **LibreChat**, dan **Python / Node.js OpenAI SDK**.
4. **Virtual Model Aliasing**
   - `auto-smart`: Mengalirkan ke model coding terbaik (Claude 3.5/3.7 Sonnet → GPT-4o → DeepSeek V3 → Gemini 2.0 Flash).
   - `auto-fast`: Latensi super cepat (Groq LLaMA 3.3 70B → Gemini 2.0 Flash → DeepSeek).
   - `auto-reason`: Penalaran mendalam (DeepSeek R1 → Gemini 2.0 Flash Thinking → OpenAI o3-mini).
   - `auto-code`: Spesialis coding (Claude Sonnet → Codestral → Qwen 2.5 Coder → DeepSeek).
5. **Dashboard Web Interaktif**
   - Manajemen API Key (disimpan aman di browser atau via Environment Variables).
   - Tes latency (Ping) real-time untuk setiap provider.
   - Interactive Playground / Web Chat dengan streaming SSE.
   - Gateway Master Key untuk melindungi URL publik Anda.
6. **100% Serverless — Database Cloud Opsional (Sangat Disarankan)**
   - Tidak memerlukan VPS; berjalan di atas Vercel Serverless Functions / Netlify Functions dengan streaming SSE.
   - Tanpa database, pengaturan (akun/API key) hanya bertahan selama server hidup — di Vercel penyimpanan server bersifat sementara dan **hilang saat redeploy/restart**. Hubungkan **MongoDB Atlas / Supabase / Upstash (Vercel KV)** agar akun, token, dan log tersimpan permanen (semua ada paket gratisnya). Panduan langkah demi langkah ada di bawah.

---

## 🚀 Cara Menjalankan Secara Lokal

```bash
# 1. Masuk ke direktori
cd 9router-web

# 2. Install dependensi (jika belum)
npm install

# 3. Jalankan server development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk membuka Web Dashboard.

---

## ☁️ Cara Deploy ke Vercel (1-Click & Gratis)

### Opsi A: Melalui Vercel Dashboard (Website)
1. Push folder proyek ini ke repositori **GitHub** Anda.
2. Buka [vercel.com/new](https://vercel.com/new) dan import repositori Anda.
3. Masukkan **Environment Variables** (cukup masukkan provider yang Anda miliki):
   - `ROUTER_API_KEY`: *(Opsional)* Password master untuk melindungi proxy Anda dari orang lain.
   - `GEMINI_API_KEY`: Key Google Gemini (Gratis & Kuota Besar untuk Gemini 2.0 Flash).
   - `GROQ_API_KEY`: Key Groq (Gratis & Super Cepat untuk LLaMA 3.3 70B).
   - `DEEPSEEK_API_KEY`: Key DeepSeek (Murah & Cerdas).
   - `ANTHROPIC_API_KEY`: Key Claude.
   - `OPENAI_API_KEY`: Key OpenAI GPT-4o.
   - `OPENROUTER_API_KEY`: Key OpenRouter (Cadangan serbaguna).
4. Klik **Deploy**!
5. Endpoint gateway Anda siap di: `https://<projek-anda>.vercel.app/v1`

### Opsi B: Melalui Vercel CLI
```bash
npx vercel --prod
```

---

## 🌐 Cara Deploy ke Netlify

1. Push folder proyek ini ke **GitHub** / **GitLab**.
2. Masuk ke [app.netlify.com](https://app.netlify.com/) dan pilih **Add new site** → **Import an existing project**.
3. Pilih repositori Anda. Netlify otomatis mendeteksi Next.js menggunakan file `netlify.toml` yang sudah disediakan.
4. Masukkan Environment Variables di menu **Site configuration** → **Environment variables**.
5. Klik **Deploy Site**!
6. Atau via CLI:
```bash
npx netlify deploy --build --prod
```

---

## 🛠️ Cara Integrasi dengan Tool Coding Anda

### 1. Cursor IDE
1. Buka **Cursor Settings** → **Models**.
2. Aktifkan **Override OpenAI Base URL**.
3. Isi Base URL: `https://<domain-anda>.vercel.app/v1`
4. Isi API Key: `ROUTER_API_KEY` Anda (atau ketik `zexin9` jika tidak memakai master key).
5. Tambahkan model: `auto-smart` atau `claude-3-5-sonnet`.

### 2. Cline (VS Code Extension)
1. Buka ekstensi Cline di VS Code, klik ikon ⚙️ (Settings).
2. Ubah **API Provider** menjadi: `OpenAI Compatible`.
3. Masukkan **Base URL**: `https://<domain-anda>.vercel.app/v1`
4. Masukkan **API Key**: API Key gateway Anda.
5. Masukkan **Model ID**: `auto-smart` atau `auto-code`.

### 3. Claude Code CLI (`claude`)
Karena Zexin9 Gateway menyediakan endpoint `/v1/messages`, Anda bisa langsung mengarahkan Claude Code CLI:
```bash
export ANTHROPIC_BASE_URL="https://<domain-anda>.vercel.app"
export ANTHROPIC_API_KEY="your-gateway-key"

# Jalankan claude code
claude
```

### 4. Continue.dev (`~/.continue/config.json`)
```json
{
  "models": [
    {
      "title": "9Router Auto-Smart",
      "provider": "openai",
      "model": "auto-smart",
      "apiBase": "https://<domain-anda>.vercel.app/v1",
      "apiKey": "your-gateway-key"
    }
  ]
}
```

---

## 🗄️ Menghubungkan Database (MongoDB / Supabase / Upstash)

Tanpa database, akun & API key tersimpan di penyimpanan sementara server (di Vercel: **hilang setiap restart/redeploy**). Pilih salah satu opsi di bawah — semuanya ada paket gratis.

### Aturan umum (berlaku untuk semua opsi)

1. Isi Environment Variables **di tempat kamu hosting** (Vercel: Project → Settings → Environment Variables). Pilih environment **Production** — atau centang Production + Preview + Development sekaligus.
2. Setelah menambah/mengubah env: **Redeploy**. Env baru hanya aktif di deployment baru.
3. Nilai jangan diberi tanda kutip dan jangan ada spasi di ujung (kalau pun ada, gateway otomatis membersihkannya — tapi lebih baik bersih).
4. Verifikasi di dashboard:
   - Tab **Database** → kartu **ACTIVE ENGINE** harus berubah dari "📁 Local JSON / Memory" menjadi **🍃 MongoDB Atlas** (atau Supabase/Upstash). Jika env terdeteksi tapi koneksi gagal, pesan error server tampil langsung di kartu itu.
   - Tab **Providers** → chip di bawah judul "9Router Multi-Account Connections Pool" harus hijau: `penyimpanan: mongodb (database — permanen)`.

### Opsi 1 — MongoDB Atlas (paling mudah, gratis M0)

1. Daftar gratis di [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register).
2. Buat **Cluster** → pilih **M0 (Free)** → Create Deployment.
3. **Database Access** → *Add New Database User* → isi username + password. Hindari karakter `@ # : /` di password (atau nanti harus di-encode, mis. `@` → `%40`).
4. **Network Access** → *Add IP Address* → pilih **Allow Access from Anywhere** (`0.0.0.0/0`). Wajib untuk Vercel/Netlify karena IP-nya berubah-ubah.
5. Klik **Connect** → **Drivers** → copy connection string-nya:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Ganti `<username>` / `<password>` dengan milikmu (boleh sekalian tulis nama database sebelum `?`: `.../zexin9?retryWrites=...`).
6. Di Vercel → Settings → **Environment Variables**, tambahkan:
   - `MONGODB_URI` = string lengkap dari langkah 5
   - `MONGODB_DB` = `zexin9` *(opsional — nama database di dalam cluster)*
7. **Redeploy**. Buka tab Database → ACTIVE ENGINE harus jadi 🍃 MongoDB Atlas.

### Opsi 2 — Supabase (PostgreSQL cloud, gratis)

1. Daftar di [supabase.com](https://supabase.com) → **New project** (gratis).
2. **Project Settings → API** → copy **Project URL** dan **service_role key**.
3. Buka **SQL Editor**, jalankan:

   ```sql
   create table if not exists zexin9_state (
     id text primary key,
     data jsonb,
     updated_at timestamptz default now()
   );
   ```

4. Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_TABLE=zexin9_state`.
5. **Redeploy** → cek tab Database.

### Opsi 3 — Upstash Redis / Vercel KV

1. Di Vercel: **Storage → Create Database → KV (Upstash)** → Connect ke project-mu. Vercel otomatis menambahkan `KV_REST_API_URL` dan `KV_REST_API_TOKEN`.
2. Atau daftar di [upstash.com](https://upstash.com) → buat Redis → copy **REST URL** + **REST TOKEN** ke env `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. **Redeploy** → cek tab Database.

### Menguji koneksi tanpa commit apa pun

Di tab **Database → MongoDB**, tempel connection string-mu di kolom *MongoDB Connection URI* lalu klik **Test Koneksi MongoDB**. Itu menguji dari sisi server (tidak menyimpan apa pun).

### Masih "Local JSON / Memory" padahal env sudah diisi?

Periksa berurutan — 90% kasus ada di 3 poin pertama:

1. **Belum redeploy** setelah menambah env (paling sering!). Env hanya berlaku di deployment baru.
2. Env dipasang di environment **Preview** saja, bukan **Production**.
3. Nama variabel salah ketik / huruf kecil — harus **PERSIS**: `MONGODB_URI`, `MONGODB_DB`.
4. **IP Atlas belum di-whitelist** → Network Access harus `0.0.0.0/0`.
5. Password di URI salah atau mengandung karakter khusus yang belum di-encode.
6. Nilai **ketuker** (mis. nama database `zexin9` tertulis di `MONGODB_URI`) — dashboard akan menampilkan peringatan kuning khusus untuk kasus ini.

Pesan error detail koneksinya sekarang tampil di kartu **ACTIVE ENGINE** (tab Database).

---

## 📋 Daftar Environment Variables

| Variabel | Keterangan | Wajib? |
| :--- | :--- | :--- |
| `ROUTER_API_KEY` | Master key proxy untuk proteksi autentikasi Bearer | Tidak (Disarankan) |
| `GEMINI_API_KEY` | Google Gemini API Key | Opsional |
| `GROQ_API_KEY` | Groq API Key | Opsional |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | Opsional |
| `ANTHROPIC_API_KEY`| Anthropic Claude API Key | Opsional |
| `OPENAI_API_KEY` | OpenAI API Key | Opsional |
| `OPENROUTER_API_KEY`| OpenRouter API Key | Opsional |
| `MISTRAL_API_KEY` | Mistral AI API Key | Opsional |
| `TOGETHER_API_KEY` | Together AI API Key | Opsional |
| `MONGODB_URI` | Connection string MongoDB Atlas — menyimpan akun/token/log **permanen** | Opsional (sangat disarankan) |
| `MONGODB_DB` | Nama database di dalam cluster Atlas (default `zexin9`) | Opsional |
| `SUPABASE_URL` | URL project Supabase (alternatif MongoDB) | Opsional |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase | Opsional |
| `SUPABASE_TABLE` | Nama tabel state Supabase (default `zexin9_state`) | Opsional |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Upstash Redis / Vercel KV (alternatif MongoDB) | Opsional |

---

## 📄 Lisensi
MIT License. Bebas digunakan dan dimodifikasi untuk kebutuhan pribadi maupun tim.
