import { apiFetch } from './api.js'

export async function authenticate(username, password) {
  return apiFetch('login.php', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
}

export async function fetchMe() {
  return apiFetch('me.php')
}

export async function logout() {
  try {
    await apiFetch('logout.php', { method: 'POST' })
  } catch {
    /* session may already be gone */
  }
}

// RBAC: role-based module access (mirrors the users.role enum in the DB).
// Fine-grained permissions can be layered on top once a user_permissions
// table exists (see CenSys UserPermission pattern).
const ROLE_MODULES = {
  superadmin: ['admin', 'dmh', 'driver'],
  admin: ['admin', 'dmh'],
  driver_management_head: ['dmh'],
  reservation_officer: ['ro'],
  billing_officer: ['billing'],
  driver: ['driver']
}

export function canAccessModule(role, module) {
  return (ROLE_MODULES[role] || []).includes(module)
}
