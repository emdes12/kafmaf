import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { initAuth, useAuth } from '@/composables/useAuth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    layout?: 'public' | 'admin'
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/about', name: 'about', component: () => import('@/views/AboutView.vue') },
  { path: '/martial-arts', name: 'martial-arts', component: () => import('@/views/MartialArtsView.vue') },
  { path: '/membership', name: 'membership', component: () => import('@/views/MembershipView.vue') },
  { path: '/hijri-calendar', name: 'hijri-calendar', component: () => import('@/views/HijriCalendarView.vue') },
  { path: '/contact', name: 'contact', component: () => import('@/views/ContactView.vue') },
  { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
  { path: '/verify/:token', name: 'verify', component: () => import('@/views/VerifyView.vue') },
  { path: '/id-card-design', name: 'card-design', component: () => import('@/views/CardDesignView.vue') },

  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue') },
  { path: '/signup', name: 'signup', component: () => import('@/views/auth/SignupView.vue') },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/auth/ForgotPasswordView.vue') },
  { path: '/reset-password', name: 'reset-password', component: () => import('@/views/auth/ResetPasswordView.vue') },

  { path: '/account', name: 'account', component: () => import('@/views/account/AccountView.vue'), meta: { requiresAuth: true } },
  { path: '/apply', name: 'apply', component: () => import('@/views/account/ApplyView.vue'), meta: { requiresAuth: true } },

  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, layout: 'admin' },
    children: [
      { path: '', name: 'admin', component: () => import('@/views/admin/AdminOverview.vue') },
      { path: 'applications', name: 'admin-applications', component: () => import('@/views/admin/AdminApplications.vue') },
      { path: 'applications/:id', name: 'admin-application', component: () => import('@/views/admin/AdminApplicationDetail.vue') },
      { path: 'members', name: 'admin-members', component: () => import('@/views/admin/AdminMembers.vue') },
      { path: 'members/:id', name: 'admin-member', component: () => import('@/views/admin/AdminMemberDetail.vue') },
      { path: 'requests', name: 'admin-requests', component: () => import('@/views/admin/AdminRequests.vue') },
      { path: 'occasions', name: 'admin-occasions', component: () => import('@/views/admin/AdminOccasions.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('@/views/admin/AdminSettings.vue') },
      { path: 'administrators', name: 'admin-admins', component: () => import('@/views/admin/AdminAdmins.vue') },
      { path: 'audit', name: 'admin-audit', component: () => import('@/views/admin/AdminAudit.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 88 }
    return { top: 0 }
  },
})

// Navigation guards improve UX only. Authorisation is enforced by Supabase RLS
// and SECURITY DEFINER functions, so bypassing these guards exposes nothing.
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  await initAuth()
  const { user, isAdmin } = useAuth()
  if (!user.value) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.requiresAdmin && !isAdmin.value) return { name: 'account' }
  return true
})
