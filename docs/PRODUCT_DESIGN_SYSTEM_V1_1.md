# SiapTempur Product Design System V1.1

Status: **DRAFT — active foundation for Product Experience V1.1**  
Parent: GitHub Issue #21  
Audit: GitHub Issue #22  
Branch: `feat/product-experience-v1-1`

## 1. Purpose

The design system creates one coherent SiapTempur experience across marketing, learning, examination, results, and payment flows.

The goal is not to remove the current personality. The goal is to make that personality intentional, scalable, readable, and appropriate to the user's context.

The existing neo-brutalist identity remains a recognizable brand ingredient, but its intensity must vary by experience mode.

---

## 2. Experience modes

### 2.1 Marketing mode

Used for:

- `/`
- `/cpns`
- `/tka`
- campaign pages
- public event pages
- pricing/value sections

Character:

- expressive
- energetic
- high brand presence
- larger display type
- stronger color blocks
- hard shadows allowed on priority elements
- playful rotation/decorative paper devices allowed sparingly

Primary objective:

> Help the visitor understand the value and take the next step.

### 2.2 Learning mode

Used for:

- CPNS dashboard
- TKA dashboard
- practice selection
- history
- results
- progress
- recommendations
- package/access management

Character:

- calmer
- information-first
- predictable layout
- fewer decorative rotations
- reduced hard-shadow density
- stronger hierarchy between status, recommendation, and secondary data

Primary objective:

> Help the learner understand where they are and what to do next.

### 2.3 Exam mode

Used while answering timed or assessment questions.

Character:

- minimal distraction
- stable layout
- high readability
- no unnecessary animation
- no playful urgency language
- neutral surfaces
- critical warnings only when truly necessary

Primary objective:

> Help the learner focus, answer confidently, and understand time/status without anxiety-inducing noise.

---

## 3. Typography

### 3.1 Font roles

**Display / handwriting**

Use for:

- brand wordmark
- marketing hero headings
- selected section headings
- occasional branded accents

Do not use as the primary font for:

- long paragraphs
- form labels
- payment instructions
- exam questions/options
- data-heavy tables
- detailed results

**Body / sans**

Use for:

- ordinary UI copy
- navigation
- forms
- question content
- answer options
- payment
- result metrics
- tables
- help/error text

### 3.2 Type hierarchy

Recommended semantic scale:

| Role | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Display hero | 56–72px | 40–52px | 800–900 |
| H1 app | 36–48px | 30–36px | 800 |
| H2 | 28–36px | 24–30px | 800 |
| H3 | 20–24px | 18–22px | 700–800 |
| Body large | 18–20px | 17–18px | 500–600 |
| Body | 16px | 16px | 400–600 |
| Small | 14px | 14px | 500–600 |
| Caption | 12px | 12px | 600 |

Exam question content should normally be at least 18px on mobile and 18–20px on desktop, with comfortable line height.

### 3.3 Line length

- marketing paragraphs: target 55–75 characters per line
- learning body copy: target 60–80 characters
- exam question content: avoid excessively wide columns; prioritize scanning/readability

---

## 4. Spacing and layout

Use an 8px-derived spacing system.

Core spacing values:

```text
4  — micro
8  — compact
12 — compact+
16 — standard
24 — section component gap
32 — major component gap
48 — section separation
64 — large section separation
96 — marketing hero/major desktop section
```

### Containers

**Marketing**
- max content width: ~1280px
- generous section padding

**Learning**
- max content width: ~1200px
- content grouped into clear task/data regions

**Exam**
- question content column should stay readable rather than filling ultra-wide screens
- navigator may occupy a fixed secondary region on desktop
- mobile prioritizes question + answer controls

### Responsive rules

- mobile is first-class, not a collapsed desktop layout
- important actions should remain reachable with one hand where reasonable
- avoid horizontal scrolling for core tasks
- tables must collapse or become card/list representations when needed

---

## 5. Interaction targets

Minimum practical touch target:

- 44 × 44px for interactive controls

Primary actions:

- recommended 48px+ height

Exam answer options:

- entire row/card is tappable
- clear selected state
- do not rely on color alone

Icon-only controls:

- require accessible label/title
- minimum target size maintained even if visual icon is smaller

---

## 6. Color roles

### 6.0 Brand tokens (implementasi — sumber: brand sheet resmi)

Nilai primitif brand:

| Token | Hex | Peran |
|---|---|---|
| `--brand-ink` | `#0D2B45` | teks utama, border neo-brutalist, hard shadow |
| `--brand-blue` | `#1976D2` | aksi primer, state aktif, link, fokus |
| `--brand-amber` | `#F9A825` | aksen brand, sorotan non-kritis, peringatan |
| `--brand-peach` | `#FDDCCA` | permukaan hangat / aksen lembut |
| `--brand-white` | `#FFFFFF` | permukaan utama |
| `--brand-paper` | `#FBFAF7` | kanvas hangat produk |

Skala turunan (`--brand-ink-50…950`, `--brand-blue-50…950`, `--brand-amber-50…950`,
`--brand-peach-50…950`) memakai **tangga lightness yang sama dengan palet Tailwind bawaan**, hanya
hue/chroma-nya dipindah ke brand. Karena itu kontras teks tetap terjaga saat palet dipetakan ulang.

**Pemetaan palet Tailwind → brand** (dilakukan sekali di `app/globals.css` `@theme`, sehingga seluruh
utility lama otomatis on-brand):

| Palette lama | Dipetakan ke |
|---|---|
| `gray-*`, `slate-*` | `--brand-ink-*` (netral navy) |
| `blue-*`, `indigo-*`, `violet-*`, `purple-*`, `sky-*`, `cyan-*`, `teal-*`, `fuchsia-*` | `--brand-blue-*` |
| `amber-*`, `yellow-*`, `orange-*` | `--brand-amber-*` |
| `pink-*` | `--brand-peach-*` |
| `green-*` | `--color-emerald-*` (hue kembar disatukan) |
| `rose-*` | `--color-red-*` (hue kembar disatukan) |

Utility brand eksplisit untuk kode baru: `bg-brand-ink`, `text-brand-blue`, `bg-brand-amber`,
`bg-brand-peach`, `bg-brand-paper`.

**Tipografi:** Poppins (400/500/600/700/800) adalah font brand untuk **display dan body**
(`--font-display`, `--font-sans`, `--font-body`). Patrick Hand hanya untuk aksen tulisan tangan yang
disengaja (`--font-script`); Geist Mono tetap untuk kode/angka. Kelas lama `font-handwriting`
dipertahankan sebagai alias Poppins agar tidak ada kelas yatim.


Do not treat colors merely as decoration. Define semantic roles.

### Brand

**Blue**
- primary action
- active state
- links/focus
- core brand emphasis

**Yellow**
- brand accent
- selected promotional highlight
- non-critical attention

**Cyan**
- TKA/product accent where useful

### Semantic

**Success / green**
- completed
- verified
- passed when factually appropriate
- access active

**Warning / amber**
- attention required
- time approaching limit
- pending payment
- incomplete state

**Danger / red**
- destructive action
- payment failure
- critical exam time only near true threshold
- irreversible confirmation

**Neutral / gray**
- secondary information
- disabled
- inactive
- ordinary borders/surfaces

### Rules

- color must never be the only signal
- status includes text/icon where needed
- avoid using red merely for motivational urgency
- exam mode uses warning/danger conservatively

---

## 7. Borders, radius, and shadows

The brand may keep dark outlines and hard shadows, but use them by hierarchy.

### Level 0 — quiet

Use for:

- ordinary list items
- internal data groups
- exam answer cards
- secondary panels

Suggested treatment:
- 1px–2px neutral border
- no hard shadow or very subtle shadow

### Level 1 — standard branded card

Use for:

- dashboard recommendation
- result summary
- ordinary marketing card

Suggested treatment:
- 2px dark border
- small 3–4px hard shadow

### Level 2 — priority/action

Use for:

- primary marketing CTA block
- selected pricing plan
- primary next-best-action

Suggested treatment:
- 2px dark border
- 5–8px hard shadow

### Rule

Do not give every surface Level 2 treatment. When everything is loud, nothing is prioritized.

Decorative rotation should generally be disabled in learning and exam modes unless it has no effect on readability or alignment.

---

## 8. Buttons

### Primary

Use for exactly one dominant action in a local decision area.

Examples:

- `Mulai latihan`
- `Lanjutkan tryout`
- `Kumpulkan jawaban`
- `Lanjut ke pembayaran`

### Secondary

Use for alternative actions.

Examples:

- `Lihat pembahasan`
- `Kembali`
- `Pilih metode lain`

### Tertiary/text

Use for low-priority navigation/actions.

### Destructive

Use only for genuinely destructive/irreversible actions.

Button copy follows `PRODUCT_LANGUAGE_GUIDE_V1_1.md`.

Disabled buttons must communicate why if the reason is not obvious.

---

## 9. Forms

Requirements:

- visible labels should be preferred for forms beyond very simple auth fields
- placeholders complement labels; they do not replace meaning
- errors sit near the affected field
- validation messages explain how to fix the issue
- focus ring must remain visible
- password visibility control requires accessible labeling
- loading state must not cause layout shift

Payment forms/states must not expose raw provider errors.

---

## 10. Cards

A card needs a clear purpose. Avoid cards created only for visual decoration.

Common card types:

### Action card

Contains:
- context
- action/value
- one primary CTA

### Metric card

Contains:
- metric label
- value
- interpretation/trend when meaningful

### Recommendation card

Contains:
- what needs attention
- why
- suggested next action

### Package card

Contains:
- who/what it is for
- price
- included value
- duration/usage rule
- fee transparency
- CTA

---

## 11. Alerts and toasts

Use toast for short-lived acknowledgement, not for information the user must remember.

### Success

Calm confirmation + next step if needed.

### Error

State:

1. what could not be completed
2. what the user can do

### Warning

Use inline alert when the state affects an ongoing task.

### Payment

Pending verification should remain visible in the page/account state if persistence matters; do not rely solely on toast.

---

## 12. Modal/dialog

A modal must contain a decision that needs focused confirmation.

Structure:

1. clear title
2. consequence
3. relevant summary
4. safe secondary action
5. explicit primary/destructive action

Avoid playful copy for irreversible exam/payment actions.

### Exam submission

> **Kumpulkan jawaban?**
>
> Pastikan jawabanmu sudah sesuai. Setelah dikumpulkan, jawaban tidak bisa diubah.

Show:
- total questions
- answered
- unanswered
- marked for review

Primary: `Kumpulkan jawaban`
Secondary: `Kembali ke soal`

---

## 13. Navigation

Navigation should represent user tasks, not database/product architecture.

### CPNS target desktop IA

```text
Beranda
Belajar
  Latihan fokus
  Mini tryout
  Full tryout
Hasil & perkembangan
Event
Paket
Profil
```

Peringkat may be shown as a secondary destination or within results/community context rather than competing with the core learning action.

### Mobile

Bottom navigation should contain at most 4–5 high-frequency destinations. Secondary destinations move into `Lainnya`/profile/menu where needed.

Candidate mobile model:

```text
Beranda
Belajar
Tryout
Hasil
Profil
```

Do not abbreviate labels to ambiguous terms like `Mini`, `Drill`, or `Beli` solely to fit six tabs.

---

## 14. Dashboard pattern

Dashboard hierarchy must support the product promise.

Priority order:

1. resume active session
2. recommended next learning action
3. weakest area / improvement opportunity
4. latest score and trend
5. upcoming event/tryout
6. access/token status
7. ranking as secondary motivation

The default dominant CTA should not always be `Mulai tryout`.

---

## 15. Exam mode specification

### Remove/reduce

- decorative rotations on core question surfaces
- excessive hard shadows
- bouncing CTA animations
- motivational slang during timed sessions
- unnecessary modal animation
- attention-grabbing icons unrelated to task

### Keep

- timer
- current question number
- answer state
- mark-for-review
- navigator
- previous/next
- submit
- reliable saved-state feedback where needed

### Timer behavior

Normal:
- neutral

≤ 5 minutes:
- warning styling
- calm message at most once

≤ 1 minute:
- critical styling
- no bouncing full-screen panic language

Time expired:
- explain that answers are being collected automatically

### Warning copy

5 minutes:

> Sisa waktu kurang dari 5 menit. Periksa soal yang belum dijawab atau masih kamu tandai.

CTA: `Lanjut mengerjakan`

1 minute:

> Sisa waktu kurang dari 1 menit. Jawaban akan dikumpulkan otomatis saat waktu habis.

CTA: `Kembali ke soal`

---

## 16. Results pattern

Results are not the end of the journey.

Target information order:

1. total result
2. clear interpretation
3. breakdown
4. strongest/weakest area
5. recommended next action
6. detailed review/pembahasan

Example recommendation:

> **Fokus berikutnya: TIU**  
> Skor TIU masih menjadi bagian terlemah pada tryout ini. Mulai dengan latihan Analogi dan Silogisme sebelum full tryout berikutnya.

CTA:

> `Latihan TIU sekarang`

Recommendation must be derived from real result data; do not fabricate weakness analysis.

---

## 17. Commerce/payment pattern

### CPNS commercial mental model

User-facing currency is standardized to:

> **token**

Do not alternate between `token` and `tiket` for the same balance/access concept.

Internal legacy field names may remain unchanged; this is a presentation-language rule, not a schema migration.

### Package card hierarchy

1. number of full tryouts/access provided
2. price
3. effective value/saving if factual
4. included benefits
5. transparent fees
6. CTA

### Payment states

**Preparing**
> Menyiapkan pembayaran…

**Pending**
> Menunggu pembayaran

**Verifying**
> Pembayaran sedang diverifikasi

**Success**
> Pembayaran berhasil. Akses kamu sudah diperbarui.

**Failed**
> Pembayaran belum berhasil. Coba lagi atau pilih metode pembayaran lain.

**Expired**
> Waktu pembayaran habis. Buat pembayaran baru untuk melanjutkan.

Never expose provider/database terminology to ordinary users.

---

## 18. Empty, loading, locked, and error states

### Empty

Must explain:
- why the area is empty
- what useful action comes next

### Loading

Use skeletons when the layout is predictable. Avoid generic full-screen spinner where it removes context.

### Locked

Explain what is unavailable and how to gain access.

### Error

Do not show raw error objects/provider responses. Give recovery action.

---

## 19. Accessibility baseline

Minimum baseline:

- keyboard navigation for interactive components
- visible focus states
- semantic headings
- descriptive button/link labels
- color-independent state indicators
- form labels
- accessible modal focus behavior
- sufficient contrast
- 44px touch targets
- meaningful alt text for instructional images
- decorative images/icons hidden from assistive tech where appropriate
- respect reduced-motion preference

Exam mode should receive an explicit accessibility pass because it is time-sensitive.

---

## 20. Motion

### Marketing

Moderate motion is allowed when it supports hierarchy/brand.

### Learning

Subtle motion only.

### Exam

Motion should be functional. Avoid looping animation except a restrained critical timer/status indicator where necessary.

Respect `prefers-reduced-motion`.

---

## 21. Implementation rules

- Do not redesign backend contracts to satisfy presentation needs unless separately approved.
- Reuse shared primitives before creating duplicate components.
- New primitives must support mobile and accessibility.
- Visual changes to exam/payment/auth flows require regression checks.
- Marketing copy claims require factual verification.
- Production remains on `main`; Product Experience work stays isolated until reviewed and tested.

---

## 22. Foundation acceptance checklist

- [ ] typography roles implemented
- [ ] semantic colors/tokens implemented
- [ ] spacing/container rules implemented
- [ ] button variants standardized
- [ ] form states standardized
- [ ] alert/toast rules implemented
- [ ] modal pattern standardized
- [ ] card hierarchy standardized
- [ ] navigation model implemented
- [ ] exam mode simplified
- [ ] results pattern supports recommendation
- [ ] payment states standardized
- [ ] accessibility baseline checked
- [ ] responsive QA completed
