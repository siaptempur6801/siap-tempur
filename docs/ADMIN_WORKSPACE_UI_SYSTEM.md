# Admin Workspace UI System

> Current component and interaction contracts: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and [UI_INTERACTION_STANDARDS.md](UI_INTERACTION_STANDARDS.md). See their authority section for precedence; this document retains its domain and historical context.

## Purpose

Admin Workspace is one operational application. Canonical admin routes must use the same shell, spacing, hierarchy, feedback, form, list/table, status, empty-state, and responsive patterns.

## Canonical navigation

- Dashboard: `/admin`
- Question Bank: `/admin/content/questions`
- Review Queue: `/admin/content/review`
- Articles: `/admin/content/articles`
- Exams: `/admin/assessment/exams`
- Events: `/admin/assessment/events`
- Products: `/admin/commerce/products`
- Orders & Payments: `/admin/commerce`

The sidebar is the primary module navigation. Program/Track context belongs to the shared shell and must not be duplicated inside feature pages.

## Standard page hierarchy

1. Page header
2. Feedback / contextual notice
3. Primary operational content
4. List, table, or cards
5. Status and actions
6. Empty/error states

Pages should optimize for scanning existing data first. Creation forms must not consume permanent space on list pages.

## CRUD interaction contract

Default simple/medium CRUD flow:

`list → Tambah/Edit → modal → submit/close → list`

Rules:

- Primary create action lives in the page header.
- Create and edit use modal/dialog behavior for simple and medium forms.
- Modal supports close button, Escape, backdrop close, and viewport scrolling.
- Edit may be addressable through a canonical query such as `?edit=<id>`, but closing returns to the canonical list URL.
- Nested operations such as adding an exam section or event session use a modal rather than an inline expanding form.
- Long-form editors such as Article rich-text may use a dedicated page when the task genuinely needs a larger canvas.
- Server Actions, validation, authorization, and persistence remain server-side.

## Assessment domain contract

Exam type is not the same thing as curriculum depth. The Admin UI must represent the learning hierarchy rather than treating every exam type as a generic collection of sections.

### Drill

`Program → Track → Subject/Subtes → Knowledge Node/Submateri → DRILL`

For CPNS/SKD this means, for example:

`CPNS → SKD → TWK → Pilar Negara → Drill`

Drill rules:

- A Drill targets exactly one `subject` and one `knowledge_node`.
- The selected knowledge node must belong to the selected subject and active Program/Track context.
- Eligible questions are approved/published questions mapped as `primary` to the selected knowledge node or its descendants.
- Current frozen `question_versions` are required before questions can enter the exam.
- Requested question count cannot exceed the eligible pool.
- Admin does not manually add sections to Drill exams.
- Drill owns one auto-managed blueprint rule and one internal exam section.
- Editing a Drill preserves the existing blueprint and section identity when possible so attempt/history foreign keys remain stable.
- The materialized `exam_question_items` are rebuilt from the selected knowledge-node pool when Drill configuration changes.
- Existing in-progress attempts block Drill restructuring.

### Mini Tryout

Mini Tryout is scoped at subject/subtes level. Example: Mini TWK, Mini TIU, or Mini TKP. It is not a Drill per submateri.

### Full Tryout

Full Tryout is scoped to the Track and can contain multiple manually managed sections. Example SKD:

- Section TWK
- Section TIU
- Section TKP

### Other exam types

Diagnostic, Remedial, and Event retain their own business semantics and must not inherit Drill's knowledge-node contract automatically.

## Forms

- Use shared `AdminUi` inputs/buttons/cards/badges.
- Labels are concise and describe business meaning rather than raw database terminology where possible.
- Destructive actions are visually distinct from primary and secondary actions.
- Avoid duplicate context selectors inside forms; use hidden Program/Track values from the active shell context.
- Domain-specific forms may reveal conditional fields. Example: selecting `DRILL` reveals Subtes, Submateri/Knowledge Node, and question-pool count.

## Lists and tables

- Use tables when columns are materially comparative, such as commerce/order data.
- Use compact card rows for operational entities with nested status/actions.
- Do not display forms permanently between list rows.
- Empty states should tell the operator what action to take next.

## Feedback

- Success and error feedback appears directly below the page header.
- Server-side validation errors should be translated into useful operator-facing messages.
- Do not rely on browser-only checks for authorization or domain invariants.

## Responsive behavior

- Controls wrap cleanly on small screens.
- Tables may scroll horizontally when comparison columns cannot reasonably collapse.
- Modals scroll internally and remain usable on mobile viewport heights.
- Avoid page-level horizontal overflow.

## Articles exception

Article list follows the same Admin Workspace primitives. Create/Edit remains a dedicated long-form page because rich-text authoring needs a larger editing canvas. Article reads use authenticated session + RLS; privileged writes remain behind explicit permission checks.

## Routing compatibility

Legacy `/cpns/admin/**` destinations may redirect to canonical `/admin/**` routes for compatibility, but new UI/actions should prefer canonical routes directly.
