<script setup lang="ts">
import NoticeBox from './NoticeBox.vue'
import { isBackendConfigured } from '@/lib/supabase'
</script>

<template>
  <NoticeBox v-if="!isBackendConfigured" tone="warning" title="Membership service not connected">
    This deployment has no Supabase connection configured, so sign-in, applications and card verification are unavailable.
    Set <code class="font-mono text-xs">VITE_SUPABASE_URL</code> and <code class="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>.
  </NoticeBox>
</template>
