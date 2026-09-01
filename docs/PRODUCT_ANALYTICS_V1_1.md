# Product Analytics V1.1

Status: implementation contract for Product Experience V1.1.

## Goal

Measure whether SiapTempur helps a learner move from discovery to meaningful learning actions without collecting unnecessary personal data.

Analytics must answer four questions:

1. Can a visitor understand the product and choose a learning path?
2. Can a learner reach and complete a useful learning session?
3. Does a result lead to a next learning action instead of a dead end?
4. Can a learner understand package value and complete payment without confusion?

## Privacy rule

Custom event payloads **must not contain**:

- email, name, phone, school name, or any other PII;
- Supabase user IDs;
- order/payment IDs or provider transaction IDs;
- question IDs, answer content, selected answers, or scores at question level;
- access tokens, session identifiers, secrets, or raw URLs containing sensitive query parameters.

Allowed properties are low-cardinality product context such as:

- `program`: `cpns` or `tka_smp`;
- `surface`: `landing`, `dashboard`, `exam`, `result`, `pass`;
- `cta`: stable semantic action name;
- `mode`: `latihan_fokus`, `mini_tryout`, `full_tryout`, `event`;
- `package_days`: `30` or `90`;
- `payment_state`: `opened`, `success`, `pending`, `error`, `closed`, `verifying`;
- `auth_method`: `email` or `google`.

## Event taxonomy

| Event | Trigger | Core properties |
| --- | --- | --- |
| `px_landing_cta` | Primary or learning-mode CTA clicked | `program`, `cta`, `surface` |
| `px_auth_intent` | Login/register submit or Google auth click | `auth_method`, `surface`, `cta` |
| `px_auth_success` | Auth action succeeds before redirect | `auth_method`, `surface` |
| `px_dashboard_action` | Coach/dashboard recommendation clicked | `program`, `cta`, `mode` when relevant |
| `px_exam_start` | User successfully starts/resumes a learning session | `program`, `mode` |
| `px_exam_complete` | Session completion succeeds | `program`, `mode` |
| `px_result_action` | Learner uses a result-page next action | `program`, `cta`, `mode` when relevant |
| `px_package_view` | Package section becomes an active purchase surface | `program`, `surface` |
| `px_package_select` | User presses a package CTA | `program`, `package_days` |
| `px_checkout_state` | Midtrans checkout lifecycle changes | `program`, `package_days`, `payment_state` |

## Primary funnels

### Acquisition → activation

`px_landing_cta` → `px_auth_intent` → `px_auth_success` → `px_dashboard_action`

Watch:

- landing CTA click-through rate;
- auth intent-to-success rate;
- authenticated users who perform a meaningful learning action.

### Learning loop

`px_dashboard_action` → `px_exam_start` → `px_exam_complete` → `px_result_action`

Watch:

- start-to-completion rate by learning mode;
- result pages that lead to another learning action;
- modes with unusually high abandonment.

### Monetization

`px_package_view` → `px_package_select` → `px_checkout_state(opened)` → `px_checkout_state(success)`

Watch:

- package-view-to-select rate;
- selection mix by 30/90-day package;
- opened-to-success checkout rate;
- pending/error/closed share.

## Growth metrics

Do not optimize only for clicks. The preferred north-star family is **meaningful completed learning sessions per active learner**, with supporting metrics:

- learning session completion rate;
- percentage of completed sessions followed by a result action;
- returning learners who perform another learning action;
- package checkout conversion and payment failure rate.

Ranking, streak, XP, or vanity engagement should not override learning-loop quality.

## Implementation

Provider: Vercel Web Analytics custom events through `@vercel/analytics`.

Implementation rules:

- use a small internal wrapper instead of importing analytics directly throughout the app;
- analytics failures must never block navigation, auth, exam, payment, or entitlement flows;
- keep event names and property values low-cardinality and stable;
- client-side tracking only for interaction lifecycle events in V1.1;
- use automatic Web Analytics pageviews for traffic/page-level measurement.

## Release verification

Before merge:

- typecheck/lint/build must pass with analytics enabled;
- event payloads must be reviewed for PII;
- checkout callbacks must preserve their existing payment sync behavior;
- analytics calls must not be awaited before critical navigation or transaction operations;
- E2E must not depend on analytics delivery succeeding.

After Production deployment, enable/confirm Web Analytics in the Vercel project and validate that custom events arrive before using them for business decisions.
