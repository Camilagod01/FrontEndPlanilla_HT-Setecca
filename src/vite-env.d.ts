/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  // agrega aquí otras VITE_... si las necesitas
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
