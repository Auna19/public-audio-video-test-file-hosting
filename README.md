# Multilingual Audio & Video Test File Hosting Platform

> A production-ready, publicly accessible media hosting application developed to store sample recordings in Nigerian languages (Hausa, Igbo, Yoruba, Nigerian Pidgin, English, etc.) and automatically generate permanent direct public URLs with RFC 7233 byte-range streaming, full CORS headers, and raw binary delivery for external speech-to-text / ASR transcription engines.

Built with **Next.js 14 (App Router, 100% Pure JavaScript/JSX)**, **Tailwind CSS**, **Lucide Icons**, and native **Node.js 24 SQLite** with optional **Supabase** cloud integration.

---

## 🌟 Key Features

### 1. Direct Public Media Delivery for External Transcription
- **Permanent Raw Media URLs:** Generates direct public URLs matching `/api/media/file/<language_code>/<file_slug>_<hash>.<ext>`.
- **Preserved Extensions:** Strictly preserves audio/video extensions (`.wav`, `.mp3`, `.mp4`, `.webm`, etc.) required by downstream speech engines.
- **RFC 7233 Byte-Range Requests:** Streams media with `HTTP 206 Partial Content` and `Accept-Ranges: bytes` for fast seeking and audio scrubbing.
- **Full CORS Support:** Emits `Access-Control-Allow-Origin: *` so external client and server applications can import media directly.
- **External Import Simulator:** Includes `/test-import` simulating how Whisper/Speechmatics validates URLs, inspects headers, tests byte streams, and queues ASR jobs.

### 2. Multi-Language Audio & Video Support
- **Native Nigerian Languages:**
  - **Hausa** (`ha`)
  - **Igbo** (`ig`)
  - **Yoruba** (`yo`)
  - **Nigerian Pidgin** (`pcm`)
  - **English** (`en`)
- **Dynamic Categories:** Admins can register any language (e.g. Kanuri, Tiv, Fulfulde, Ibibio) via `/admin/languages`.
- **18 Validated Formats:** `.wav`, `.mp3`, `.aac`, `.amr`, `.flac`, `.m4a`, `.oga`, `.ogg`, `.opus`, `.weba`, `.mp4`, `.webm`, `.mov`, `.mkv`, `.avi`, `.m4v`, `.mpeg`, `.mpg` with binary magic byte signature verification.

### 3. Public Media Library (`/`)
- Public visitors can browse, search, and preview sample recordings with zero authentication.
- Custom HTML5 audio and video players with scrubber, playback rate, and volume controls.
- One-click **Copy Link** with instant visual toast notification.
- Direct **Download** button preserving original filename and extension.

### 4. Administrator Studio (`/admin`)
- **Dashboard Overview (`/admin`):** Real-time metrics for Total Uploaded Files, Audio, Video, Languages Represented, and Total Downloads.
- **Bulk Media Uploader (`/admin/upload`):** Drag-and-drop zone, multi-file queue, per-file language/tagging controls, concurrent batch uploading, and a prominent **"Start Uploading All Documents"** action button.
- **All Media Manager (`/admin/media`):** Table/Grid view toggles, batch filters, metadata editor modal, instant **Public Access Toggle** (blocks or restores access immediately), and permanent deletion.
- **Languages Manager (`/admin/languages`):** View all language categories and register new languages dynamically.
- **Upload History (`/admin/history`):** Complete chronological audit log of administrator actions (`UPLOAD_MEDIA`, `UPDATE_MEDIA`, `DELETE_MEDIA`).
- **Platform Settings (`/admin/settings`):** Base URL configuration, storage drivers, and Supabase integration status.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ or v24+
- npm or pnpm

### Installation

1. Clone repository:
   ```bash
   git clone <repository_url>
   cd "Public Audio & Video Test File Hosting Platform"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Create a `.env.local` file with your configuration:
   ```ini
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ADMIN_USERNAME=your_chosen_username
   ADMIN_PASSWORD=your_chosen_secure_password
   ADMIN_SECRET=your_random_secret_hmac_key
   # Supabase credentials (optional for cloud database/storage)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Or build and run for production:
   ```bash
   npm run build
   npm start
   ```

Open [http://localhost:3000](http://localhost:3000) to view the public library.

---

## 🔐 Authentication & Access Control

Administrator authentication is secured via HMAC-SHA256 signed session cookies.

- **Configure your administrator credentials** inside `.env.local`:
  ```ini
  ADMIN_USERNAME=your_chosen_username
  ADMIN_PASSWORD=your_chosen_secure_password
  ADMIN_SECRET=your_random_secret_hmac_key
  ```
- **Login Portal:** Access the dashboard at `/login` or `/admin`.

---

## ⚡ Optional Supabase Setup

The application is pre-configured with `@supabase/supabase-js`:
1. Run `supabase/schema.sql` in your Supabase SQL Editor.
2. Add your Supabase project keys to `.env.local`:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

## 📜 Available Scripts

- `npm run dev`: Starts the Next.js development server
- `npm run build`: Compiles optimized Next.js production build
- `npm start`: Starts the Next.js production server
- `npm run clear-data`: Wipes all uploaded media and resets fresh 0 metrics
- `npm run seed`: Generates initial synthetic sample media for testing
