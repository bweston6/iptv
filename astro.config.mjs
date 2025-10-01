// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: {
          chrome: 108 << 16
        }
      }
    },
  },
})
