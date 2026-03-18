// In production (Render): frontend and backend are on the same server,
// so API calls use relative URLs (empty string = same origin).
// In development: VITE_API_URL=http://localhost:3001 (set in .env)
const base = import.meta.env.VITE_API_URL ?? "";
export const API_URL = base.replace(/\/$/, "");
