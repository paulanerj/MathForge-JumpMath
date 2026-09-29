import path from 'path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default {
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': path.resolve(root, '.') },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
  },
};
