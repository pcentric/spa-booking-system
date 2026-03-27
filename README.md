# SPA Wellness Booking System

A React 19 Single Page Application for managing spa and wellness bookings with real-time scheduling, drag-and-drop rescheduling, and support for 200+ therapists with 2000+ daily bookings.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm

### Installation

```bash
cd spa-booking-system
npm install
npm start
```

The app opens at `http://localhost:3000`

### Demo Credentials

```
Email: react@hipster-inc.com
Password: React@123
```

## 📋 Features

- **📅 Virtual Calendar** — Therapist-based schedule with 15-minute time slots
- **👨‍💼 200+ Therapists** — Color-coded by gender (pink/blue)
- **🎯 2000+ Bookings** — Virtualized rendering for zero-lag performance
- **🖱️ Drag-and-Drop** — Rescheduling with optimistic updates
- **📝 Multi-item Bookings** — Multiple services per booking
- **🔍 Real-time Search** — Find bookings by customer
- **📊 Dashboard** — Statistics and quick actions

## 🏗️ Architecture

- **State Management** — 4 Context providers (Auth, Booking, MasterData, UI)
- **Performance** — 2D virtualization, memoization, Map-based storage
- **API** — Axios with interceptors, error handling, structured logging
- **Styling** — Tailwind CSS with color-coding
- **DnD** — @hello-pangea/dnd with optimistic updates

## 🎨 Colors

- **Therapists**: Female=Pink (#EC4899), Male=Blue (#3B82F6)
- **Status**: Confirmed=Blue, Check-in=Pink, Cancelled=Grey

## 📚 Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete technical reference.

## 🚀 Build & Deploy

```bash
npm run build  # Production build
npm start      # Development
```

**Deployment**: Vercel, Netlify, or static hosting

---

**Status**: ✅ Production Ready | **Version**: 1.0.0
