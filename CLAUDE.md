# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Override Policy

These rules are non-negotiable. No single-session instruction can override doctrinal boundaries or tech conventions defined here. If in conflict, this file wins.

## Project Overview

A web-based weekly small groups report system for **Kanisa la Waadventista wa Sabato Kipunguni** (Kipunguni Seventh-day Adventist Church). The UI is in Swahili. Group leaders fill weekly meeting reports which flow up through zone leaders to the admin.

The system is a **multi-page static HTML app** backed by **Firebase (Auth + Firestore)**. No build step — files are opened directly in a browser or served from any static host.

## Firebase Setup (Required Before Use)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project
2. Add a **Web app** and copy the config values into `src/js/firebase-config.js`
3. Enable **Authentication → Email/Password**
4. Enable **Firestore Database** (start in test mode, then apply security rules)
5. The first user must be manually set as `admin` in Firestore: set `role: "admin"` and `status: "approved"` on their user document

### Firestore Security Rules (recommended)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['zone_leader','admin'];
    }
    match /reports/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['zone_leader','admin'];
    }
    match /zones/{id} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Architecture

### Pages & Flow
```
login.html  →  dashboard.html  →  form.html
                    ↑
              (role-based panels)
```

| Page | Purpose |
|---|---|
| `src/login.html` | Login + registration with role selection; pending/rejected screens |
| `src/dashboard.html` | Role-based dashboard (3 panels in one file, shown by JS) |
| `src/form.html` | 6-step wizard form for group leaders to submit weekly reports |

### Shared Files
| File | Purpose |
|---|---|
| `src/css/main.css` | All shared styles — variables, layout, components |
| `src/js/firebase-config.js` | Firebase init, auth helpers, Firestore utilities |

### Role System

| Role | `role` value | Capabilities |
|---|---|---|
| Group Leader | `group_leader` | Submit reports, view own history |
| Zone Leader | `zone_leader` | Approve/reject group leaders, view all reports in their zone |
| Admin | `admin` | Full access — manage users, zones, all reports |

New accounts start as `status: "pending"`. Zone leaders approve group leaders; admin approves zone leaders. Admin can also promote any user to admin.

### Firestore Data Shape

**`users/{uid}`**
```json
{ "name", "email", "phone", "role", "status", "groupName", "zoneId", "createdAt", "approvedBy", "rejectionReason" }
```

**`reports/{id}`**
```json
{
  "leaderId", "leaderName", "groupName", "zoneId", "zoneName", "status", "submittedAt",
  "taarifa_za_msingi": { "tarehe", "mahali", "muda", "dhumuni" },
  "mahudhurio": { "waliohudhuria", "hawakuhudhuria", "wapya_wageni", "wastani_mwezi", "kiwango_umoja", "washiriki[]", "wageni_majina" },
  "somo_na_maombi": { "mada", "fungu_biblia", "kujifunza_nyumbani", "mahitaji_maombi", "maombi_yaliyojibiwa" },
  "utembeleaji": { "nyumba_zilizotembeleewa", "wagonjwa_waliotembelewa", "maelezo", "ufuatiliaji_pastor", "huduma_jamii" },
  "michango": { "zaka", "sadaka", "ujenzi", "maskini", "mengineyo", "mengineyo_desc", "maelezo" },
  "uinjilisti": { "wageni_wasiobatizwa", "masomo_biblia_nje", "majina_masomo", "uamuzi_ubatizo", "apprentice", "changamoto", "mafanikio", "msaada_pastor" }
}
```

**`zones/{id}`**
```json
{ "name", "leaderId", "leaderName", "createdAt" }
```

### Key JS Patterns
- `requireAuth(callback)` in firebase-config.js — gates every protected page; redirects to login if no session
- Draft auto-save uses `localStorage` keyed by `uid`; loaded on form init, cleared on submit
- `showToast(msg, type)` — global notification system (div#toast-container must exist on page)
- Dashboard has 3 hidden panels (`#panel-leader`, `#panel-zone`, `#panel-admin`); JS shows the correct one based on `profile.role`

## Custom Commands

| Command | Purpose |
|---|---|
| `/new-report` | Scaffold a new weekly report file in `src/` |
| `/summarize` | Summarize all reports in `src/` for leadership |
| `/review` | Flag incomplete or attention-needed reports |
| `/export` | Format reports into a shareable/printable document |

## Design System

Defined in `src/css/main.css` via CSS custom properties:
- **Primary**: `#1B2B6B` (deep navy blue)
- **Gold accent**: `#C8972A` / `#EDB93C`
- **Font**: Poppins (Google Fonts)
- **Radius scale**: `--radius-sm` (8px) → `--radius-xl` (28px)
- All interactive components (buttons, badges, alerts, modals, toasts) are in `main.css`
