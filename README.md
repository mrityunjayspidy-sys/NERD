# Nerd ✦ Spatial Task Companion & Real-Time Chat

> **Nerd** is a tactile, spatial productivity companion built with React Native (Expo), Supabase, and Expo Notifications. It replaces static checklists with a 2D **Moving Space** canvas with drag-and-drop gravitational orbit, flexible catenary wire linking, real-time multi-user & direct chat, and calendar sync.

---

## ✨ Core Highlights & Features

1. **The "Moving Space" Spatial Task Canvas**
   - **Multi-Axis 2D Free Pan & Drag-and-Drop:** Move task nodes around freely in 2D space with coordinates saved directly to Supabase.
   - **Flexible Cable Wiring:** Connect related tasks with physical hanging wire cables featuring catenary sag, metallic pins, and pulsing signals.
   - **Head Node (Master Mission) System:** Golden aura and master cable linking for high-priority milestone nodes.
   - **Dynamic Level-of-Detail (LOD):** Smooth spring-based zooming with compact chips at distance and rich cards up close.

2. **Real-Time Chat & Unique Nerd Codes**
   - **Community Hub:** Multi-user public channel for broadcasting messages and photo attachments in real-time.
   - **Direct 1-on-1 Chat:** Connect with friends by entering their unique `NERD-XXXX` code.
   - **Instant Notifications & Haptics:** Audio/haptic alerts and unread badges on incoming messages.

3. **Supabase Postgres + Realtime RLS**
   - Complete data isolation with Row Level Security for tasks and chat messages.
   - Real-time WebSocket streaming subscriptions.

4. **Calendar Sync & Push Reminders**
   - Native device calendar integration with `expo-calendar`.
   - Agenda timeline scrubber view.
   - Local exact-time notifications with `expo-notifications`.

5. **Two-Grey Geometric Design**
   - Dominant Grey `#E3E3E3` / Dark Graphite `#141416` with Mid-Grey `#808080` accents.
   - Enhanced geometric emblem branding.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the App
- **Start Web Dev Server:**
  ```bash
  npm run web
  ```
- **Run on Mobile (Android / iOS):**
  ```bash
  npx expo start
  ```

---

## 🗄️ Supabase Backend Setup

Execute the migration scripts in your [Supabase SQL Editor](https://supabase.com/dashboard):
- [`supabase/migrations/20260815_init.sql`](./supabase/migrations/20260815_init.sql) (Tasks schema)
- [`supabase/migrations/20260815_chat.sql`](./supabase/migrations/20260815_chat.sql) (Real-time messages)

Configure your `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📄 License
MIT License. Built with ❤️ for Nerd.
