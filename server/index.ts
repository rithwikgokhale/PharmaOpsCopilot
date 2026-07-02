import "dotenv/config";
import { existsSync } from "fs";
import { join } from "path";
import express from "express";
import { createApp } from "./app";
import { isLlmEnabled, getModelName } from "./agent/llm";
import { DataLoadError, isDataReady } from "./data/localDataAccess";

const app = createApp();
const PORT = process.env.PORT ?? 3001;

// Production story: `npm run build && npm start` serves the built frontend
// from the same process as the API. In dev, Vite serves the frontend instead.
// Vite's root is app/, so the build output lands in app/dist.
const distDir = join(process.cwd(), "app", "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`PharmaOps API listening on http://localhost:${PORT}`);
  console.log(`  LLM: ${isLlmEnabled() ? `enabled (${getModelName()})` : "disabled — deterministic mode"}`);
  if (existsSync(distDir)) {
    console.log("  Frontend: serving built app from dist/");
  }
  try {
    if (isDataReady()) {
      console.log("  Data: loaded from data/generated");
    }
  } catch (err) {
    if (err instanceof DataLoadError) {
      console.warn(`  Data: NOT LOADED — ${err.message}`);
    } else {
      console.warn("  Data: NOT LOADED — run `npm run generate-data`");
    }
  }
});
