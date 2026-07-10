# 📸 InstaDown — Premium Instagram Photo & Reel Downloader

InstaDown is a sleek, single-page web application built with **Next.js** and **TypeScript** that allows anyone to easily fetch and download high-quality Photos and Reels from Instagram. 

By utilizing reverse-engineered internal APIs and custom fallback handlers, it extracts direct, high-definition media URLs from Instagram CDN servers and streams them directly to bypass hotlinking and CORS restrictions.

---

## 🎨 Preview & Features

- ⚡ **High Quality Downloads**: Automatically extracts the highest resolution source files for both images and video Reels.
- 🔐 **Authentication Cookie Support**: Handles Instagram's strict public login walls by reading local browser session cookies (`cookies.txt`).
- 🔄 **Double-Sided CDN Proxy**: Streams files locally to bypass hotlinking protection (`scontent.cdninstagram.com` `403 Forbidden` blocks) for both image preview rendering and direct browser downloads.
- 🌌 **Premium UI**: Styled using an advanced dark glassmorphism system with custom CSS variables, shimmer loadings, and smooth animations.
- 📱 **Fully Responsive**: Optimized for desktop, tablet, and mobile browsers.

---

## 🏗️ Architecture

```
[User Browser]
      │   Pastes URL & requests download/preview
      ▼
[Next.js Frontend]
      │   Calls API routes internally
      ▼
[Next.js API Server]
      ├── /api/fetch    ---> Reads session cookies -> Queries Instagram endpoints -> Extracts HD CDN URLs
      └── /api/download ---> Fetches from IG CDN -> Alters headers (attachment/inline) -> Streams back to client
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/ankitbhartii/insta-downloader.git
cd insta-downloader
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add Instagram Cookies (Required)
Due to Instagram's aggressive login walls, you must provide active session cookies for the backend scraper to run authenticated requests:
1. Install a browser extension like **Cookie-Editor**.
2. Go to [instagram.com](https://www.instagram.com) and log in.
3. Export your cookies in **Netscape** format.
4. Create a file named `cookies.txt` in the root of this project and paste the cookies inside.
*(Note: `cookies.txt` is already added to `.gitignore` to prevent committing session tokens).*

### 4. Run the Dev Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to start downloading.

---

## 🛠️ Built With

- **Next.js 14** (App Router)
- **TypeScript**
- **Vanilla CSS** (Custom Design Tokens)
- **React**

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE). For educational and personal use only. Respect creators' rights when saving media.
