/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPIKE_VAR: string;
  readonly VITE_SOURCEMAP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
