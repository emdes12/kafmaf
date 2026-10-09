import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/** Public, indexable routes. Private areas (/account, /admin, /verify) are excluded. */
const SITEMAP_ROUTES = ['/', '/about', '/martial-arts', '/membership', '/hijri-calendar', '/contact', '/privacy']

function seoFiles(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  return {
    name: 'kafmaf-seo-files',
    apply: 'build',
    generateBundle() {
      const robots = [
        'User-agent: *',
        'Disallow: /admin',
        'Disallow: /account',
        'Disallow: /apply',
        'Disallow: /verify/',
        'Disallow: /login',
        'Disallow: /signup',
        base ? `Sitemap: ${base}/sitemap.xml` : '',
      ]
        .filter(Boolean)
        .join('\n')
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots + '\n' })
      if (base) {
        const urls = SITEMAP_ROUTES.map((r) => `  <url><loc>${base}${r === '/' ? '/' : r}</loc></url>`).join('\n')
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [vue(), tailwindcss(), seoFiles(env.VITE_PUBLIC_SITE_URL ?? '')],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: {
            supabase: ['@supabase/supabase-js'],
            card: ['jspdf', 'html-to-image', 'qrcode'],
          },
        },
      },
    },
  }
})
