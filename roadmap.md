# Internly — build roadmap

## Phase 0 — foundation
- [x] Database: all tables, roles, RLS, grants, demo seed data
- [x] Email + Google sign-in enabled
- [x] Design system (teal/coral, Poppins/Inter) in src/styles.css
- [x] App shell with role-based sidebar

## Phase 1 — public & auth
- [x] Landing page at /
- [x] /auth sign up + log in with role selector
- [x] /onboarding (student + mentor + employer variants)

## Phase 2 — student discovery
- [x] /app/preferences
- [x] /app dashboard listing feed with match %
- [x] /app/listings/$id detail
- [x] /app/apply/$listingId
- [x] /app/applications/$id mentor selection

## Phase 3 — student execution
- [x] /app/applications list
- [x] /app/applications/$id follow-ups
- [x] /app/applications/$id certificate (print view)

## Phase 4 — mentor
- [x] /mentor dashboard
- [x] /mentor/applications table with overdue flags
- [x] /mentor/applications/$id review + rating

## Phase 5 — employer
- [x] /employer dashboard (verification gate)
- [x] /employer/listings/new
- [x] /employer/listings/$id applicants + approve/reject
- [x] /employer/applications/$id project brief + completion sign-off

## Phase 6 — admin
- [x] /admin dashboard (stats, institution verification, escalations)
- [x] /admin/listings + categories
- [x] /admin/mentors pool
- [x] /admin/escalations (scan for stalled placements)
- [x] /admin/reports funnel, categories, mentor performance

## Phase 7 — add-ons
- [x] /app/aptitude test
- [ ] AI follow-up summary card (cached on applications.ai_summary)
- [ ] Notifications bell in the app shell
