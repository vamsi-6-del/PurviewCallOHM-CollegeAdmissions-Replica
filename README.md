# EduGuide

An AI-powered outbound calling platform for college admissions — built as a multi-tenant SaaS where Purview (SuperAdmin) manages college tenants, each with their own admins and agents.

**Marketing site:** https://eduguide.callohm.com  
**Live App:** https://admission.callohm.com  
**GitHub:** https://github.com/ShashirekhaPurview/PurviewCallOHM-CollegeAdmissions.git

---

## Overview

EduGuide enables college admissions teams to run AI-driven outbound calling campaigns. The platform covers the full admissions funnel: contact management, AI voice calling (via ElevenLabs), post-call disposition capture, follow-up scheduling, and analytics.

### User Roles

| Role | Access |
|---|---|
| `super_admin` | Full platform access — manages all colleges, users, and agents |
| `org_admin` | College-level admin — manages users, contacts, and agents for their college |
| `org_user` | Agent — handles calls, contacts, and conversations |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 8 (Rolldown) |
| Routing | React Router DOM v7 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Voice AI | ElevenLabs React SDK |
| Data Export | SheetJS (xlsx) |
| Deployment | Firebase Hosting |

---

## Project Structure

```
src/
├── api/                        # All API service modules
│   ├── client.js               # Centralized fetch client (auth, token refresh, retries)
│   ├── auth/
│   │   └── authService.js      # Login, logout, session management, JWT decoding
│   ├── agents/
│   │   ├── agentService.js
│   │   ├── agentConsoleService.js
│   │   └── orgScopedAgentService.js
│   ├── analytics/
│   │   └── analyticsService.js
│   ├── bookDemo/
│   │   └── bookDemoService.js
│   ├── contacts/
│   │   └── contactService.js
│   ├── orgs/
│   │   ├── orgService.js
│   │   └── orgAgentAssignmentStore.js
│   └── users/
│       └── userService.js
├── assets/
│   └── brand/
│       ├── purview-logo.png
│       └── purview-logo.svg
├── components/
│   └── SiteNav.jsx             # Public site navigation
├── data/
│   └── orgAgentAssignments.json
├── hooks/
│   └── useTheme.js             # Light/dark theme toggle
├── layouts/
│   └── AppLayout.jsx           # Authenticated app shell (sidebar + topbar)
├── pages/
│   ├── auth/
│   │   └── Login.jsx
│   ├── landing/
│   │   ├── Landing.jsx
│   │   ├── Hero.jsx
│   │   ├── Sections.jsx
│   │   └── WorkflowSection.jsx
│   ├── agents/
│   │   ├── AgentPage.jsx
│   │   └── AgentPreviewModal.jsx
│   ├── analytics/
│   │   ├── AnalyticsOverviewPage.jsx
│   │   └── AnalyticsPage.jsx
│   ├── calls/
│   │   └── CallsPage.jsx
│   ├── contacts/
│   │   └── ContactsPage.jsx
│   ├── superadmin/
│   │   ├── OrganizationsPage.jsx
│   │   ├── OrganizationDetailsPage.jsx
│   │   └── UsersPage.jsx
│   ├── BookDemoPage.jsx
│   ├── CustomersPage.jsx
│   ├── PricingPage.jsx
│   └── WorkflowPage.jsx
├── utils/
│   ├── countryCodes.js
│   └── homeNavigation.js
├── App.jsx                     # Root routing config
├── main.jsx                    # React entry point
└── index.css                   # Tailwind v4 + custom design tokens
```

---

## Routes

### Public

| Path | Page |
|---|---|
| `/` | Landing page |
| `/login` | Login |
| `/workflow` | Workflow overview |
| `/customers` | Customers / case studies |
| `/pricing` | Pricing |
| `/book-demo` | Book a demo |

### Protected (requires authentication)

| Path | Page | Roles |
|---|---|---|
| `/app/analytics` | Analytics dashboard | All |
| `/app/contacts` | Contact management | All |
| `/app/agents` | Agent management | All |
| `/app/calls` | Calls log | All |
| `/app/conversations` | Conversations / analytics | All |
| `/app/organizations` | Manage colleges | super_admin |
| `/app/organizations/:orgId` | College details | super_admin |
| `/app/users` | Manage users | org_admin |

Unauthenticated users are redirected to `/login`. Role mismatches redirect to `/app/analytics`.

---

## Authentication

JWT-based authentication with refresh token rotation. Sessions are stored in `localStorage`.

- `accessToken` + `refreshToken` + `role` stored on login
- API client automatically retries on `401` after refreshing the access token
- Concurrent refresh requests are deduplicated (one refresh at a time)
- `getCurrentUser()` decodes the JWT payload client-side to extract `user_id`, `email`, `role`, and `org_id`

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Twilio Voice Bot API — routes are served at the root, with no /api/v1 prefix.
VITE_API_BASE_URL=http://192.168.0.191:7860
VITE_AGENT_ID=<agent_id>
VITE_TELEPHONY_ID=<outbound_telephony_id>
```

All variables must be prefixed with `VITE_` to be accessible in the browser.

The previous backend (`https://admission.callohm.com/api/v1`) is kept commented
out in `.env` for rollback. `VITE_STATIC_KEY_ADMISSIONS` was only used by the
old ElevenLabs passthrough and is no longer read.

---

## Design System

Defined in `src/index.css` using Tailwind CSS v4 custom properties.

**Fonts**
- Display — Playfair Display (headings, brand)
- UI — Plus Jakarta Sans (body, labels)
- Mono — IBM Plex Mono (code, data)

**Color Themes**
- Light (default): forest greens (`#0F2A1F` background, `#0F6E3F` accent)
- Dark: inverted teal/green palette

**UI Patterns**
- Collapsible sidebar with glass morphism effect
- Framer Motion transitions throughout
- Responsive mobile drawer navigation
- Role-based sidebar navigation items

**Logo:** The CallOHM brand mark is rendered as a styled `Ω` symbol (gradient div). There is no `callohm-logo.png` image file. Only `purview-logo.svg` and `purview-logo.png` exist under `src/assets/brand/`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the dev server at `http://localhost:5173` (also accessible on the local network via `0.0.0.0`).

### Build

```bash
npm run build
```

Output goes to `dist/`.

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Deployment (Firebase Hosting)

The project deploys to Firebase Hosting under the `callohm-admissions` project.

### One-time setup

If not already logged in to the correct Firebase account:

```bash
firebase logout
firebase login
# Log in with purview2026@gmail.com
```

### Deploy

```bash
npm run build
firebase deploy --only hosting
```

Firebase is configured to serve `dist/` and rewrite all routes to `index.html` for SPA routing.

---

## API Layer

All API calls go through `src/api/client.js`, a centralized fetch wrapper that handles:

- Auth headers (`Authorization: Bearer <token>`)
- Automatic token refresh on 401
- JSON and multipart form-data requests
- Blob downloads

Service modules in `src/api/` each encapsulate a domain:

| Service | Responsibility |
|---|---|
| `authService` | Login, logout, session, token refresh |
| `agentService` | Agent CRUD |
| `agentConsoleService` | Agent console / live session ops |
| `orgScopedAgentService` | Org-scoped agent data |
| `contactService` | Contact CRUD, import/export |
| `analyticsService` | Analytics queries |
| `orgService` | Organization (college) management |
| `userService` | User management |
| `bookDemoService` | Demo booking form submission |

---

## Path Aliases

The `@` alias maps to `src/`. Always use `@/` for imports instead of relative paths:

```js
// correct
import { getSession } from '@/api/auth/authService'

// avoid
import { getSession } from '../../api/auth/authService'
```

Configured in `vite.config.js`.

---

## Product Roadmap

Full architecture and feature plan is in [PROJECT_PLAN.md](./PROJECT_PLAN.md).

**Planned features:**
- Campaign builder with customizable disposition forms
- AI voice calling with multiple telephony providers (Plivo, Twilio, Exotel, Ozonetel)
- Retry engine and follow-up queue
- Visit scheduling and enrollment tracking
- Rich analytics: funnel, agent performance, conversion rates
- CSV/Excel data import and export
- Audit logs and compliance tracking
- Real-time campaign updates via WebSocket/SSE
