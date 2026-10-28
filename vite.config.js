import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (name) => resolve(import.meta.dirname, `${name}.html`);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: page('index'),
        browse: page('browse'),
        seat: page('seat'),
        list: page('list'),
        offers: page('offers'),
        profile: page('profile'),
      },
    },
  },
});
