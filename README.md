# Invoicier Frontend

A modern, full-featured invoice management application built with React, TypeScript, and TanStack ecosystem.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **TanStack Router** - Type-safe file-based routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first styling
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Chart.js** - Data visualization
- **Vitest** - Unit testing
- **Vite** - Build tool and dev server

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:3000/api
```

## Project Structure

```
src/
├── api/          # API client and endpoints
├── components/   # React components
│   ├── auth/     # Authentication components
│   ├── dashboard/# Dashboard widgets
│   ├── invoice/  # Invoice management
│   ├── layout/   # Layout components
│   └── ui/       # Reusable UI components
├── hooks/        # Custom React hooks
├── pages/        # Page components
├── routes/       # TanStack Router routes
├── stores/       # Zustand stores
├── test/         # Test utilities
├── types/        # TypeScript types
└── utils/        # Utility functions
```

## Features

- User authentication (login/signup)
- Dashboard with analytics and charts
- Invoice creation and management
- Client management
- PDF generation and download
- Email invoices to clients
- Multiple currency support
- Dark mode ready

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint code

## License

MIT
