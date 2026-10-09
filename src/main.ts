import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'
import { router } from './router'
import { initAuth } from './composables/useAuth'
import { loadSettings } from './composables/useSettings'
import { loadOccasionRecords } from './composables/useHijri'
import { vReveal } from './directives/reveal'
import './styles.css'

void initAuth()
void loadSettings()
void loadOccasionRecords()

createApp(App).use(createHead()).use(router).directive('reveal', vReveal).mount('#app')
