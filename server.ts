import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/trending/tiktok", async (req, res) => {
    try {
      const response = await axios.get('https://tiktok-all-in-one-working-api.p.rapidapi.com/trending', {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'tiktok-all-in-one-working-api.p.rapidapi.com'
        }
      });
      console.log("TikTok API Response:", JSON.stringify(response.data, null, 2));
      res.json(response.data);
    } catch (error: any) {
      console.error("TikTok API Error:", error.response?.status, error.message);
      if (error.response?.status === 429) {
        res.status(429).json({ error: "Rate limit exceeded" });
      } else {
        res.status(error.response?.status || 500).json({ error: "Failed to fetch TikTok videos" });
      }
    }
  });

  app.get("/api/trending/youtube", async (req, res) => {
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
        params: {
          part: 'snippet,statistics',
          chart: 'mostPopular',
          regionCode: 'US',
          key: process.env.YOUTUBE_API_KEY
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch YouTube videos" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
