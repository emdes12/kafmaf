import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute } from 'vue-router'
import { siteUrl } from '@/lib/supabase'
import { useSettings } from './useSettings'

interface PageMeta {
  title: MaybeRefOrGetter<string>
  description?: MaybeRefOrGetter<string>
  noindex?: boolean
}

/** Titles, descriptions, canonical URL and Open Graph tags — accurate content only. */
export function usePageMeta(meta: PageMeta) {
  const route = useRoute()
  const { settings } = useSettings()
  const brand = computed(() => settings.value.short_name)
  const fullTitle = computed(() => {
    const t = toValue(meta.title)
    return t ? `${t} · ${brand.value}` : `${brand.value} — ${settings.value.full_name}`
  })
  const description = computed(() => toValue(meta.description) ?? '')
  const canonical = computed(() => `${siteUrl()}${route.path === '/' ? '/' : route.path}`)

  useHead({
    title: fullTitle,
    meta: [
      { name: 'description', content: description },
      { name: 'robots', content: meta.noindex ? 'noindex, nofollow' : 'index, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: brand },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:locale', content: 'en_NG' },
      { name: 'twitter:card', content: 'summary' },
    ],
    link: meta.noindex ? [] : [{ rel: 'canonical', href: canonical }],
  })
}
