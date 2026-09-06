const S = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const Icon = {
  gauge: (p) => (
    <svg {...S} {...p}><path d="M12 14l3.5-3.5" /><path d="M20.2 15.6A8.5 8.5 0 1 0 3.8 15.6" /><circle cx="12" cy="14" r="1" /></svg>
  ),
  user: (p) => (
    <svg {...S} {...p}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  users: (p) => (
    <svg {...S} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  car: (p) => (
    <svg {...S} {...p}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
  ),
  mapPin: (p) => (
    <svg {...S} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  wrench: (p) => (
    <svg {...S} {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
  ),
  bell: (p) => (
    <svg {...S} {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
  ),
  search: (p) => (
    <svg {...S} {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  logout: (p) => (
    <svg {...S} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
  ),
  plus: (p) => (
    <svg {...S} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
  ),
  edit: (p) => (
    <svg {...S} {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
  ),
  x: (p) => (
    <svg {...S} {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  ),
  check: (p) => (
    <svg {...S} {...p}><path d="M20 6 9 17l-5-5" /></svg>
  ),
  clipboard: (p) => (
    <svg {...S} {...p}><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /></svg>
  ),
  dashboard: (p) => (
    <svg {...S} {...p}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
  ),
  eye: (p) => (
    <svg {...S} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  shield: (p) => (
    <svg {...S} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
  ),
  tag: (p) => (
    <svg {...S} {...p}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>
  ),
  key: (p) => (
    <svg {...S} {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
  ),
  arrowRight: (p) => (
    <svg {...S} {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  ),
  chevronsLeft: (p) => (
    <svg {...S} {...p}><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
  ),
  chevronsRight: (p) => (
    <svg {...S} {...p}><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></svg>
  ),
  lock: (p) => (
    <svg {...S} {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  ),
  unlock: (p) => (
    <svg {...S} {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
  ),
  trash: (p) => (
    <svg {...S} {...p}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  menu: (p) => (
    <svg {...S} {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
  )
}