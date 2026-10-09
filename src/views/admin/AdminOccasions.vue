<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import NoticeBox from '@/components/NoticeBox.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { supabase } from '@/lib/supabase'
import { formatLong, formatMedium, formatTimestamp, isIsoDate } from '@/lib/dates'
import { friendlyError } from '@/lib/errors'
import { CALENDAR_LABELS, OCCASIONS, formatHijri, resolveOccasion, recordKey, type OccasionKey } from '@/lib/hijri'
import { useHijriCalendar, loadOccasionRecords } from '@/composables/useHijri'

const { provider, recordMap, todayHijri, settings, today } = useHijriCalendar()
onMounted(() => loadOccasionRecords(true))

const baseYear = computed(() => todayHijri.value?.hijri.year ?? 1448)
const years = computed(() => [baseYear.value, baseYear.value + 1])

const rows = computed(() => {
  const p = provider.value
  if (!p) return []
  return years.value.flatMap((y) =>
    OCCASIONS.map((def) => {
      const resolved = resolveOccasion(def, y, p, recordMap.value)
      return { def, year: y, resolved, record: recordMap.value.get(recordKey(def.key, y)) ?? null }
    }),
  )
})

interface EditForm {
  occasion_key: OccasionKey
  hijri_year: number
  status: 'expected' | 'confirmed' | 'cancelled'
  gregorian_date: string
  source: string
  confirmed_on: string
  announcement: string
  publish_announcement: boolean
  announcement_expires_on: string
}
const editing = ref<EditForm | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

function startEdit(row: (typeof rows.value)[number]) {
  const r = row.record
  editing.value = {
    occasion_key: row.def.key,
    hijri_year: row.year,
    status: r?.status ?? 'expected',
    gregorian_date: r?.gregorian_date ?? row.resolved.calculatedDate ?? '',
    source: r?.source ?? '',
    confirmed_on: r?.confirmed_on ?? today.value,
    announcement: r?.announcement ?? '',
    publish_announcement: r?.publish_announcement ?? false,
    announcement_expires_on: r?.announcement_expires_on ?? '',
  }
  error.value = notice.value = null
}

const formProblem = computed(() => {
  const f = editing.value
  if (!f) return null
  if (!isIsoDate(f.gregorian_date)) return 'Enter the Gregorian date.'
  if (f.status === 'confirmed' && (!f.source.trim() || !isIsoDate(f.confirmed_on))) {
    return 'A confirmed date needs the announcing authority/source and the date it was announced.'
  }
  if (f.publish_announcement && !f.announcement.trim()) return 'Write the announcement text or untick “publish”.'
  return null
})

async function save() {
  const f = editing.value
  if (!f || !supabase || formProblem.value) return
  busy.value = true
  const { error: err } = await supabase.rpc('upsert_islamic_occasion', {
    p_occasion_key: f.occasion_key,
    p_hijri_year: f.hijri_year,
    p_status: f.status,
    p_gregorian_date: f.gregorian_date,
    p_source: f.source || null,
    p_confirmed_on: f.status === 'confirmed' ? f.confirmed_on : f.confirmed_on || null,
    p_announcement: f.announcement || null,
    p_publish_announcement: f.publish_announcement,
    p_announcement_expires_on: f.announcement_expires_on || null,
  })
  busy.value = false
  if (err) return (error.value = friendlyError(err))
  editing.value = null
  notice.value = 'Saved. The public calendar now uses this record.'
  await loadOccasionRecords(true)
}

async function remove(id: string | undefined) {
  if (!supabase || !id || !confirm('Delete this record? The occasion will fall back to the calculated date.')) return
  const { error: err } = await supabase.rpc('delete_islamic_occasion', { p_id: id })
  if (err) error.value = friendlyError(err)
  await loadOccasionRecords(true)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="display text-4xl">Islamic occasions</h1>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
        Calculated with {{ CALENDAR_LABELS[settings.hijri_calendar] }} (adjustment {{ settings.hijri_adjustment_days }} days; change in Settings).
        Record the date announced by {{ settings.hijri_authority_label }}. A <strong>confirmed</strong> record overrides the calculation
        everywhere on the site. Never mark a date as confirmed only because it appears in a calendar or app.
      </p>
    </div>
    <NoticeBox v-if="error" tone="error">{{ error }}</NoticeBox>
    <NoticeBox v-if="notice" tone="success">{{ notice }}</NoticeBox>

    <div class="card overflow-x-auto">
      <table class="table-base min-w-[860px]">
        <thead>
          <tr>
            <th>Occasion</th>
            <th>Calculated</th>
            <th>Recorded</th>
            <th>Shown publicly</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.def.key + row.year">
            <td>
              <p class="font-semibold">{{ row.def.name }}</p>
              <p class="text-xs text-muted">{{ formatHijri(row.resolved.hijri) }}</p>
            </td>
            <td class="whitespace-nowrap">{{ row.resolved.calculatedDate ? formatMedium(row.resolved.calculatedDate) : '—' }}</td>
            <td>
              <template v-if="row.record">
                <StatusBadge :status="row.record.status" />
                <p class="mt-1 text-xs">{{ formatMedium(row.record.gregorian_date) }}<template v-if="row.record.corrected_from"> (corrected from {{ formatMedium(row.record.corrected_from) }})</template></p>
                <p v-if="row.record.source" class="text-xs text-muted">{{ row.record.source }}</p>
                <p class="text-xs text-muted">Updated {{ formatTimestamp(row.record.updated_at) }}</p>
              </template>
              <span v-else class="text-xs text-muted">No record</span>
            </td>
            <td>
              <p class="whitespace-nowrap">{{ row.resolved.date ? formatMedium(row.resolved.date) : '—' }}</p>
              <StatusBadge :status="row.resolved.basis" />
              <p v-if="row.record?.publish_announcement" class="mt-1 text-xs font-semibold text-moss">Announcement published</p>
            </td>
            <td class="whitespace-nowrap text-right">
              <button type="button" class="btn-outline btn-sm" @click="startEdit(row)">{{ row.record ? 'Edit' : 'Record date' }}</button>
              <button v-if="row.record" type="button" class="btn-sm ml-1 text-xs font-semibold text-brand" @click="remove(row.record.id)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form v-if="editing" class="card space-y-4 p-6" @submit.prevent="save">
      <h2 class="font-display text-2xl font-bold uppercase">
        {{ OCCASIONS.find((o) => o.key === editing!.occasion_key)?.name }} {{ editing.hijri_year }} AH
      </h2>
      <div class="grid gap-4 md:grid-cols-3">
        <div>
          <label for="st" class="field-label">Status</label>
          <select id="st" v-model="editing.status" class="input">
            <option value="expected">Expected (not yet officially announced)</option>
            <option value="confirmed">Confirmed (officially announced)</option>
            <option value="cancelled">Cancelled / withdrawn — use calculation</option>
          </select>
        </div>
        <div>
          <label for="gd" class="field-label">Gregorian date</label>
          <input id="gd" v-model="editing.gregorian_date" type="date" class="input" />
          <p v-if="isIsoDate(editing.gregorian_date)" class="field-hint">{{ formatLong(editing.gregorian_date) }}</p>
        </div>
        <div>
          <label for="co" class="field-label">Announcement date</label>
          <input id="co" v-model="editing.confirmed_on" type="date" class="input" />
        </div>
      </div>
      <div>
        <label for="src" class="field-label">Source / announcing authority</label>
        <input id="src" v-model="editing.source" class="input" maxlength="300" placeholder="e.g. Statement by the Sultan of Sokoto, reported …" />
      </div>
      <div>
        <label for="ann" class="field-label">Homepage announcement (optional)</label>
        <textarea id="ann" v-model="editing.announcement" rows="3" maxlength="600" class="input" />
      </div>
      <div class="flex flex-wrap items-end gap-6">
        <label class="flex items-center gap-2 text-sm font-semibold">
          <input v-model="editing.publish_announcement" type="checkbox" class="accent-brand" /> Publish announcement on homepage
        </label>
        <div>
          <label for="exp" class="field-label">Remove announcement after</label>
          <input id="exp" v-model="editing.announcement_expires_on" type="date" class="input" />
        </div>
      </div>
      <NoticeBox v-if="formProblem" tone="warning">{{ formProblem }}</NoticeBox>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary" :disabled="busy || !!formProblem">Save</button>
        <button type="button" class="btn-outline" @click="editing = null">Cancel</button>
      </div>
    </form>
  </div>
</template>
