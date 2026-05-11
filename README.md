# KUKI — Workforce Management App

A mobile-first workforce management platform for employers and employees, built with React + TypeScript + Vite, backed by an Azure REST API.

## Features

- **Employer**: Manage employees, set wages, track attendance, grant loans, generate payslips
- **Employee**: View wages, contracts, loans, attendance records, and statements
- **Admin**: Manage users, subscriptions, plan change requests, job roles, and ads
- **Job Board**: Post and apply for jobs
- **Messaging**: In-app statements and job application notifications
- **Subscription Plans**: Free, Core, Pro, Pro Plus tiers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Auth | JWT (stored in localStorage) |
| Backend | Azure App Service REST API |
| Database | Azure SQL (SQL Server) |

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file in the project root:

```
VITE_API_URL=https://your-backend.azurewebsites.net
```

## Build & Deploy

```bash
npm run build   # outputs to /dist
```

Upload the `dist/` folder to Azure Static Web Apps or Azure Web App.

> **Important**: Set `VITE_API_URL` in Azure App Settings before deploying so the correct API URL is baked into the build.

## Project Structure

```
src/
├── components/
│   ├── admin/        # Admin-only sections
│   ├── common/       # Shared UI components
│   ├── employer/     # Employer modals and views
│   └── pages/        # Full page components
├── contexts/         # Auth and Toast context providers
└── lib/
    └── api.ts        # Central API client (all backend calls)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the Azure backend API |
