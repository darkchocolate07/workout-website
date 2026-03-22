/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set (e.g. on Netlify), API requests go to this origin instead of same-origin `/api`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
