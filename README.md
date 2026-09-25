# 🌐 9Router Cloud (Web & Serverless Edition)

> AI Gateway & Multi-Tier Proxy dengan fitur Automatic Fallback, RTK Token Saver, dan kompatibilitas ganda (OpenAI & Anthropic API) yang siap dijalankan secara gratis di **Vercel** atau **Netlify**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzenn889%2FZexin9&project-name=zexin9-router&repository-name=Zexin9)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/zenn889/Zexin9)

---

## ⚡ Fitur Utama (Seperti 9Router)

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
6. **100% Serverless & Zero Database**
   - Tidak memerlukan VPS, database eksternal, atau biaya bulanan. Berjalan di atas Vercel Serverless Functions / Netlify Functions dengan streaming SSE.

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
4. Isi API Key: `ROUTER_API_KEY` Anda (atau ketik `9router` jika tidak memakai master key).
5. Tambahkan model: `auto-smart` atau `claude-3-5-sonnet`.

### 2. Cline (VS Code Extension)
1. Buka ekstensi Cline di VS Code, klik ikon ⚙️ (Settings).
2. Ubah **API Provider** menjadi: `OpenAI Compatible`.
3. Masukkan **Base URL**: `https://<domain-anda>.vercel.app/v1`
4. Masukkan **API Key**: API Key gateway Anda.
5. Masukkan **Model ID**: `auto-smart` atau `auto-code`.

### 3. Claude Code CLI (`claude`)
Karena 9Router Web menyediakan endpoint `/v1/messages`, Anda bisa langsung mengarahkan Claude Code CLI:
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

---

## 📄 Lisensi
MIT License. Bebas digunakan dan dimodifikasi untuk kebutuhan pribadi maupun tim.
