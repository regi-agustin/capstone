export async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  })

  let data = null
  let parsed = false
  try {
    data = await res.json()
    parsed = true
  } catch {
    /* non-JSON response — handled below */
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }

  // A 2xx response whose body is not JSON (an HTML error page, an empty body)
  // is a server failure, not a usable payload: surface it as an error instead
  // of returning null and letting every caller guess what went wrong.
  if (!parsed) {
    const err = new Error('The server returned an unreadable response. Please try again.')
    err.status = res.status
    err.unreadable = true
    throw err
  }

  return data
}
