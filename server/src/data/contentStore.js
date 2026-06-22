import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyContent, exportContent } from './gameData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_FILE = process.env.CONTENT_FILE || path.join(__dirname, 'content.json');

/**
 * Loads content.json from disk if present and applies it to the live game data.
 * If the file does not exist yet, it is seeded from the built-in defaults so the
 * admin panel always has something to edit.
 */
export function loadContent() {
  try {
    if (fs.existsSync(CONTENT_FILE)) {
      const raw = fs.readFileSync(CONTENT_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return applyContent(parsed);
    }
  } catch (err) {
    console.error('Не удалось прочитать content.json, использую значения по умолчанию:', err.message);
  }
  // Seed file from defaults.
  const defaults = exportContent();
  saveContent(defaults);
  return defaults;
}

/**
 * Persists content to disk. Returns the saved snapshot.
 */
export function saveContent(content) {
  const dir = path.dirname(CONTENT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf8');
  return content;
}

export function getContentFilePath() {
  return CONTENT_FILE;
}
