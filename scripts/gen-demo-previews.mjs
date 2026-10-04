#!/usr/bin/env node
/**
 * Generates the demo preview images in public/previews/*.svg.
 * Re-run after editing the TOOLS table below:  node scripts/gen-demo-previews.mjs
 *
 * Cards are plain SVG (no build step, no storage bill). Products whose
 * image_url points at your own subpage simply override these defaults.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'previews')

const TOOLS = [
  { file: 'fiverr-client-hunter', mono: 'FV', title: ['Fiverr Client', 'Hunter Pro'], c1: '#16a34a', c2: '#0ea5e9' },
  { file: 'instagram-lead-hunter', mono: 'IG', title: ['Instagram Lead', 'Hunter Pro'], c1: '#ec4899', c2: '#8b5cf6' },
  { file: 'map-lead-hunter', mono: 'MAP', title: ['Map Lead', 'Hunter Pro'], c1: '#0ea5e9', c2: '#14b8a6' },
  { file: 'yt-lead-hunter', mono: 'YT', title: ['YT Lead', 'Hunter Pro'], c1: '#ef4444', c2: '#f97316' },
  { file: 'upwork-client-hunter', mono: 'UP', title: ['Upwork Client', 'Hunter Pro'], c1: '#22c55e', c2: '#0f766e' },
  { file: 'facebook-lead-hunter', mono: 'FB', title: ['Facebook Lead', 'Hunter Pro'], c1: '#3b82f6', c2: '#6366f1' },
  { file: 'directory-lead-hunter', mono: 'DIR', title: ['Directory Lead', 'Hunter Pro'], c1: '#f59e0b', c2: '#ea580c' },
  { file: 'website-email-extractor', mono: 'WEB', title: ['Website Email', 'Extractor Pro'], c1: '#06b6d4', c2: '#2563eb' },
  { file: 'whatskodo', mono: 'WA', title: ['WhatsKodo', 'Pro Toolkit'], c1: '#84cc16', c2: '#16a34a' },
  { file: 'firefox-automation-manager', mono: 'FAM', title: ['Firefox Automation', 'Manager'], c1: '#f97316', c2: '#7c3aed' }
]

function svg(t) {
  const full = t.title.join(' ')
  const monoSize = t.mono.length > 2 ? 42 : 54
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${full}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.c1}"/>
      <stop offset="1" stop-color="${t.c2}"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <circle cx="715" cy="75" r="170" fill="#ffffff" opacity="0.12"/>
  <circle cx="70" cy="565" r="130" fill="#000000" opacity="0.12"/>
  <rect x="48" y="48" width="118" height="50" rx="25" fill="#ffffff"/>
  <text x="107" y="81" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="25" font-weight="800" fill="${t.c2}">PRO</text>
  <rect x="48" y="140" width="140" height="140" rx="34" fill="url(#chip)" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  <text x="118" y="${235}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${monoSize}" font-weight="800" fill="#ffffff">${t.mono}</text>
  <text x="48" y="386" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="800" fill="#ffffff">${t.title[0]}</text>
  <text x="48" y="448" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="800" fill="#ffffff">${t.title[1]}</text>
  <rect x="48" y="500" width="256" height="48" rx="24" fill="#ffffff"/>
  <text x="176" y="531" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="1.5" fill="${t.c2}">LIFETIME LICENSE</text>
</svg>
`
}

mkdirSync(OUT, { recursive: true })
for (const t of TOOLS) {
  writeFileSync(resolve(OUT, `${t.file}.svg`), svg(t), 'utf8')
}
console.log(`wrote ${TOOLS.length} previews to ${OUT}`)
