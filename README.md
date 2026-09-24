# Internly

Internly connects students to internships and exchange placements, with mentors and partner institutions in one place.

## Features

- **Students**: Discover placements, submit applications, track review statuses, and select mentors.
- **Mentors**: Monitor student progress, review assignments, and provide feedback.
- **Employers / Institutions**: Post listings, review applicants, and manage placement pipelines.
- **Admin**: Oversee platform activity, manage users, review reports and escalations.

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm

### Installation

```sh
npm install
```

### Environment Variables

Ensure your `.env` contains:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

### Development

```sh
npm run dev
```

### Production Build

```sh
npm run build
npm run preview
```

## Tech Stack

- **Framework**: TanStack Start + TanStack Router
- **Frontend**: React 19, Lucide React, Radix UI, Tailwind CSS v4
- **Database & Auth**: Supabase
- **Build Tool**: Vite

