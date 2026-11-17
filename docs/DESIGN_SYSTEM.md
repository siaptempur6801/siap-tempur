# Siap Tempur design system

Status: canonical implementation contract, 2026-10-09. Baseline: `acaa5c6` on `uiux/shared-foundations-2026-10-09`, descended from optimized `705375b`. Changes must preserve the optimization and security contracts in [OPTIMIZATION_REPORT.md](OPTIMIZATION_REPORT.md).

## Authority and references

This document and [UI_INTERACTION_STANDARDS.md](UI_INTERACTION_STANDARDS.md) govern new and remediated UI. The newer [ADMIN_UI_UX_STANDARD.md](ADMIN_UI_UX_STANDARD.md) remains authoritative for admin information architecture, route/context preservation, domain workflows, table density, permissions and forms. [PRODUCT_LANGUAGE_GUIDE_V1_1.md](PRODUCT_LANGUAGE_GUIDE_V1_1.md) governs Indonesian language. [PRODUCT_DESIGN_SYSTEM_V1_1.md](PRODUCT_DESIGN_SYSTEM_V1_1.md) supplies brand identity and mode rules; its specific §2.6 compact learning scale supersedes its general large app-heading examples. [ADMIN_WORKSPACE_UI_SYSTEM.md](ADMIN_WORKSPACE_UI_SYSTEM.md) is historical: its modal-first CRUD and old URL examples do not override the newer dedicated-page and canonical-route standard. Historical audit checkboxes are not evidence that an issue still exists.

References consulted, not copied as a new brand:

- [shadcn components](https://ui.shadcn.com/docs/components): composition, explicit variants, field/control relationships and accessible overlays.
- [shadcn Blocks](https://ui.shadcn.com/blocks): sidebar → header → toolbar → work surface application hierarchy.
- [Geist introduction](https://vercel.com/geist/introduction), [colors](https://vercel.com/geist/colors) and [typography](https://vercel.com/geist/typography): restrained surfaces, semantic roles and consistent hierarchy.
- [Radix Primitives](https://www.radix-ui.com/primitives): composition and predictable interaction contracts. Existing Radix Slot and native controls remain; no second component library is required.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/): accessible names, keyboard operation, visible/unobscured focus, reflow, contrast, error identification and status announcements.

## Experience modes

| Mode | Purpose | Surface and emphasis | Typography |
|---|---|---|---|
| Marketing | Explain value and next action | Warm paper, ink outlines, deliberate hard shadows; sparse sticker/mascot accents | Large Poppins display; Patrick Hand wordmark/accent |
| Learning | Progress, recommendation and next practice | Paper canvas, white/subtle surfaces, 1 px borders, soft elevation; one optional mascot accent | H1 20/24 px, section 18/20 px, readable 14/16 px body |
| Exam | Answer with confidence | Neutral surfaces, no paper decoration/rotation; persistent time/save/navigation feedback | Body font, readable questions, stable numeric timer; quiet decision dialogs |
| Admin | Operate efficiently | Scoped cool neutral canvas, white cards, restrained borders, dense named tables | H1 24 px, 14 px body, 12 px secondary labels |

Existing program/track accents, mascot identity and marketing layouts remain. Category accents communicate grouping, not success/failure. Exam and payment behavior is never inferred from colors.

## Tokens

`app/globals.css` is the implementation source. Extend existing roles rather than adding a palette to individual components.

| Role | Existing token / contract |
|---|---|
| Brand identity | `--brand-ink` #0D2B45, `--brand-blue` #1976D2, `--brand-amber` #F9A825, `--brand-peach` #FDDCCA, paper #FBFAF7, white |
| Text | `foreground`, `muted-foreground`; explicit white text only on verified dark action surfaces |
| Actions/focus | `primary`, `primary-foreground`, `ring`; admin uses its existing scoped primary |
| Surfaces | `background`, `card`, `muted`; `--px-canvas`, `--px-surface`, `--px-surface-subtle` |
| Lines | `border`, `input`; ink outlines reserved for marketing emphasis |
| Status | `success`, `warning`, `danger`, `info` with corresponding muted/border tokens in admin; always include a label/icon |
| Elevation | Existing `--px-shadow-sm/md`; no elevated decoration in exam. Marketing `st-shadow-*` remains intentionally hard |
| Radius | Existing `--radius-st-sm/md/lg/xl/2xl` (12/16/20/24/32 px); learning maximum 16 px, admin existing 6/8 px controls/cards |
| Space | 4, 8, 12, 16, 24, 32, 48, 64, 96 px; 20 px allowed as existing compact card padding |
| Font | Poppins body/display, Patrick Hand wordmark/accent, existing mono for codes/tabular numeric values |

Tailwind brand aliases and existing font loading/preloads remain. A semantic token is contextual: admin's scoped tokens need not equal marketing's surface. Do not indiscriminately replace status colors with program colors.

## Layout and type

- Marketing content maximum 1280 px; learning maximum 1200 px; exam readable question column with separate navigation; admin tables fill the available workspace, forms maximum 960 px.
- Mobile page inset 16 px; desktop 24–32 px. Section gap 24 px; related card/control gap 8–16 px. Avoid nested cards for ordinary form groups.
- One H1 per work surface, followed by a short description and one principal action. Related actions use outline/ghost/link emphasis. Preserve CTA wording and route contracts.
- Poppins weights: body 400, secondary labels 500, actions/headings 600–700. Weight 800/900 and oversized display titles belong to marketing emphasis, not every learner field or action.
- Body line height 1.5–1.75; truncate identifiers only with a way to access the full value. Do not truncate consequences, validation or answer content.
- Tailwind breakpoints remain 640/768/1024/1280/1536 px. Mobile stacks work surfaces; dense tables scroll in their own named, keyboard-focusable region. The page itself must not overflow horizontally at 390 px.

## Component contracts and existing owners

| Foundation | Canonical implementation | Contract |
|---|---|---|
| Learner/marketing action | `components/ui/Button.tsx` (Radix Slot for links) | Explicit primary/secondary/outline/ghost/danger/success/warning/white variants; caller's form type and domain handler preserved |
| Admin action | `components/admin/AdminUi.tsx` class adapters | Server-safe classes; dedicated dense row variants; no blanket 44 px override |
| Icon action | Named native button with shared action/focus classes | Accessible label, square target, decorative icon hidden from AT; no icon-only unnamed action |
| Forms | Native input/textarea/select + `AdminField` / existing labelled learner controls | Visible label, linked hint/error, required semantics, pending/disabled state; native select preferred to a new custom picker |
| Dialog | `components/ui/DialogSurface.tsx` | Native modal/top layer, focus containment/return, scroll lock, viewport-bounded scrolling, safe dismissal |
| Domain dialog adapters | `Modal`, `AdminModal`, `AdminConfirmDialog`, TKA/token confirmations | Keep domain copy, callbacks and pending/dirty protection; share modal mechanics |
| Feedback | Existing Sonner; inline form alerts; `AdminErrorState` | One error channel per failure; success only after confirmed success; retry preserves input |
| Navigation | Existing dashboard/TKA shells and `AdminShell`, `AdminLink` | Route/context contracts unchanged; active state plus accessible names; preserve disabled prefetch optimization |
| Tables/filters/pages | `AdminDataTable`, `AdminTableToolbar`, `AdminPagination`, `AdminPageHeader`, `AdminFormSection` | URL filtering/pagination, named scroll regions, explicit empty/error states; no alternate table system |
| Surfaces/status | `Card` marketing variants, `AdminCard`, existing learner surfaces; `Badge`/`AdminStatusBadge`, `ProgressBar`, `LoadingState` | Context-specific surface density; status label; progress reports bounded actual values; skeleton not fake progress |

### Sizes

| Context | Target |
|---|---|
| Learner action `sm` / `md` | Minimum 44 px, 14 px text; padding distinguishes density |
| Learner primary `lg` | Minimum 48 px, 16 px text |
| Marketing `xl` | Minimum 56 px, 18 px text |
| Standalone close/icon/touch action | 44 × 44 px preferred |
| Admin desktop field/action | Existing 36/32 px compact controls; mobile 44 px standalone controls |
| Admin table row action/icon | Existing 28 px desktop / 36 px small-screen contract; 18 px icon. Maintain spacing and named actions |

WCAG 2.2 AA target-size minimum is 24 px with specified exceptions, not a requirement to make all dense desktop controls 44 px. Our preferred touch size is 44 px outside dense tables. Verify actual bounding boxes; an icon size does not establish the control's target size.

## State and motion

- Focus visible: existing two-pixel ring plus offset, never hidden behind overlays or sticky bars. Hover cannot be the sole way to reveal essential actions.
- Pending: disable the committing action and unsafe dismissal, retain a meaningful verb (`Menyimpan…`, `Mengumpulkan…`), keep the layout stable. Disabled styling must not remove an action's explanation.
- Learning transitions 100–200 ms for state changes; no repeated bounce/rotation. Exam controls and dialogs do not animate decoratively. Respect `prefers-reduced-motion` for CSS and Framer Motion.
- Avoid broad `!important` selectors that erase a component's variants. Legacy compatibility styles must be scoped to their intended mode.

## Adoption and verification

No global replacement of forms, pickers or tables solely to match an external library. Audit rendered evidence → shared contract → representative admin, CPNS, TKA and exam checks → related consumers. Preserve existing tests. Each meaningful behavioral change requires browser keyboard/mobile/pending regression coverage and reviewed screenshots. Track coverage and remaining issues in [UI_UX_AUDIT.md](UI_UX_AUDIT.md) and [UI_UX_REMEDIATION_REPORT.md](UI_UX_REMEDIATION_REPORT.md); passing code checks alone is not visual approval or WCAG certification.
