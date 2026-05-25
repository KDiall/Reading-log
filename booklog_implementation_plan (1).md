# BookLog — Implementation Plan

**Version:** 1.0  
**Team:** 2–3 developers  
**Total Timeline:** 18 weeks  
**Stack:** Next.js 14+ (App Router) · shadcn/ui · Tailwind CSS · Neon DB · Prisma · Pusher · Resend · Vercel

---

## How to Read This Document

Each phase has:
- **Goal** — what "done" looks like for the phase
- **Duration** — estimated weeks for a 2–3 person team
- **Owner suggestions** — which dev should lead which track (adjust to your team)
- **Tasks** — broken into setup, backend, frontend, and testing
- **Definition of Done** — hard criteria before moving to the next phase

Phases are sequential but tasks within a phase can be parallelised across devs.

---

## Team Role Suggestions

| Dev | Primary Focus |
|-----|--------------|
| Dev A | Backend — Prisma schema, Route Handlers, API integrations, Pusher server |
| Dev B | Frontend — Next.js pages, shadcn/ui components, Tailwind, forms |
| Dev C (if present) | Full-stack — Auth, real-time UI, data features, testing |

---

## Phase 0 — Project Foundation
**Weeks 1–2 · All devs**

### Goal
A running Next.js app connected to Neon DB, with auth working end-to-end, CI/CD live, and the full Prisma schema migrated.

---

### 0.1 Repository & Tooling Setup

**Tasks**
- [ ] Create GitHub repo with `main` (production) and `dev` (integration) branches
- [ ] Branch naming convention: `feat/`, `fix/`, `chore/`
- [ ] Set up ESLint + Prettier with shared config
- [ ] Set up Husky pre-commit hooks (lint + typecheck)
- [ ] Configure absolute imports (`@/` alias) in `tsconfig.json`
- [ ] Set up GitHub Actions CI — runs `tsc --noEmit`, `eslint`, and `prisma validate` on every PR

---

### 0.2 Next.js Project Bootstrap

```bash
npx create-next-app@latest booklog \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Install core dependencies:**

```bash
# UI
npx shadcn@latest init
npx shadcn@latest add button input label card badge avatar dialog sheet tabs \
  dropdown-menu form toast skeleton separator progress popover

# Auth
npm install jose bcryptjs
npm install -D @types/bcryptjs

# Database
npm install prisma @prisma/client
npx prisma init

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# Real-time
npm install pusher pusher-js

# Email
npm install resend

# Utilities
npm install date-fns clsx tailwind-merge lucide-react
npm install @tanstack/react-query
```

---

### 0.3 Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."           # Neon DB connection string (pooled)
DIRECT_URL="postgresql://..."            # Neon DB direct (for Prisma migrations)

# Auth
JWT_SECRET="your-256-bit-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Pusher
PUSHER_APP_ID=""
PUSHER_KEY=""
PUSHER_SECRET=""
PUSHER_CLUSTER=""
NEXT_PUBLIC_PUSHER_KEY=""
NEXT_PUBLIC_PUSHER_CLUSTER=""

# Resend
RESEND_API_KEY=""
EMAIL_FROM="BookLog <noreply@yourdomain.com>"

# Book APIs
GOOGLE_BOOKS_API_KEY=""

# File Uploads
BLOB_READ_WRITE_TOKEN=""                 # Vercel Blob
```

---

### 0.4 Neon DB Setup

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string → `DATABASE_URL`
3. Copy the **direct** connection string → `DIRECT_URL`

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

### 0.5 Full Prisma Schema

Paste the complete schema into `prisma/schema.prisma`:

```prisma
model User {
  id             String    @id @default(cuid())
  email          String    @unique
  passwordHash   String
  username       String    @unique
  displayName    String
  bio            String?
  avatarUrl      String?
  bannerUrl      String?
  accentColor    String?
  fontPreference String?
  pronouns       String?
  location       String?
  socialLinks    Json?     // [{ label, url }]
  favoriteGenres String[]
  isPrivate      Boolean   @default(false)
  emailVerified  Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  library          UserBook[]
  reviews          Review[]
  challenges       UserChallenge[]
  wrappedYears     ReadingWrapped[]
  hostedRooms      ReadingRoom[]     @relation("HostedRooms")
  roomSessions     RoomParticipant[]
  sentMessages     Message[]         @relation("SentMessages")
  blockedUsers     Block[]           @relation("Blocker")
  blockedBy        Block[]           @relation("Blocked")
  verifyTokens     VerifyToken[]
}

model VerifyToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  type      TokenType
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Book {
  id            String    @id @default(cuid())
  googleBooksId String?   @unique
  openLibraryId String?
  title         String
  authors       String[]
  coverUrl      String?
  isbn          String?
  description   String?
  genres        String[]
  publishedDate String?
  pageCount     Int?
  language      String?
  createdAt     DateTime  @default(now())

  userBooks  UserBook[]
  reviews    Review[]
  rooms      ReadingRoom[]
}

model UserBook {
  id          String        @id @default(cuid())
  userId      String
  bookId      String
  status      ReadingStatus
  format      BookFormat
  currentPage Int?
  progressPct Float?
  startDate   DateTime?
  finishDate  DateTime?
  notes       String?
  dateAdded   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  book         Book          @relation(fields: [bookId], references: [id])
  progressLogs ProgressLog[]

  @@unique([userId, bookId])
}

model ProgressLog {
  id         String   @id @default(cuid())
  userBookId String
  page       Int?
  pct        Float?
  loggedAt   DateTime @default(now())

  userBook UserBook @relation(fields: [userBookId], references: [id], onDelete: Cascade)
}

model Review {
  id         String     @id @default(cuid())
  userId     String
  bookId     String
  rating     Int
  title      String?
  body       String?
  hasSpoiler Boolean    @default(false)
  format     BookFormat
  dateRead   DateTime?
  likesCount Int        @default(0)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id])

  @@unique([userId, bookId])
}

model Challenge {
  id          String        @id @default(cuid())
  creatorId   String
  title       String
  description String?
  type        ChallengeType
  isPublic    Boolean       @default(true)
  startDate   DateTime
  endDate     DateTime
  targetValue Int
  createdAt   DateTime      @default(now())

  participants UserChallenge[]
}

model UserChallenge {
  id          String    @id @default(cuid())
  userId      String
  challengeId String
  progress    Int       @default(0)
  completedAt DateTime?
  joinedAt    DateTime  @default(now())

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  challenge Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)

  @@unique([userId, challengeId])
}

model ReadingWrapped {
  id            String   @id @default(cuid())
  userId        String
  year          Int
  totalBooks    Int
  totalPages    Int
  topGenre      String?
  topAuthor     String?
  longestBook   String?
  fastestRead   String?
  longestStreak Int?
  personality   String?
  monthlyData   Json
  ratingDist    Json
  generatedAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, year])
}

model ReadingRoom {
  id              String     @id @default(cuid())
  hostId          String
  bookId          String
  title           String
  status          RoomStatus @default(SCHEDULED)
  isPublic        Boolean    @default(true)
  scheduledAt     DateTime
  durationMins    Int
  breakMins       Int?
  maxParticipants Int        @default(20)
  chatLocked      Boolean    @default(true)
  startedAt       DateTime?
  endedAt         DateTime?
  createdAt       DateTime   @default(now())

  host         User              @relation("HostedRooms", fields: [hostId], references: [id])
  book         Book              @relation(fields: [bookId], references: [id])
  participants RoomParticipant[]
  messages     Message[]
}

model RoomParticipant {
  id            String   @id @default(cuid())
  roomId        String
  userId        String
  joinedAt      DateTime @default(now())
  leftAt        DateTime?
  pagesLogged   Int      @default(0)
  shareProgress Boolean  @default(true)

  room ReadingRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
}

model Message {
  id          String         @id @default(cuid())
  senderId    String
  context     MessageContext
  roomId      String?
  recipientId String?
  body        String
  isDeleted   Boolean        @default(false)
  readAt      DateTime?
  createdAt   DateTime       @default(now())

  sender User         @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  room   ReadingRoom? @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

model Block {
  id        String   @id @default(cuid())
  blockerId String
  blockedId String
  createdAt DateTime @default(now())

  blocker User @relation("Blocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked User @relation("Blocked", fields: [blockedId], references: [id], onDelete: Cascade)

  @@unique([blockerId, blockedId])
}

enum ReadingStatus {
  WANT_TO_READ
  CURRENTLY_READING
  FINISHED
  DNF
  RE_READING
}

enum BookFormat {
  EBOOK
  AUDIOBOOK
}

enum ChallengeType {
  BOOK_COUNT
  PAGE_COUNT
  GENRE_BINGO
  THEME_BASED
}

enum RoomStatus {
  SCHEDULED
  ACTIVE
  ON_BREAK
  ENDED
  CANCELLED
}

enum MessageContext {
  ROOM
  DIRECT
}

enum TokenType {
  EMAIL_VERIFY
  PASSWORD_RESET
}
```

Run the initial migration:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### 0.6 Project Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (main)/
│   │   ├── dashboard/
│   │   ├── search/
│   │   ├── books/[id]/
│   │   ├── library/
│   │   ├── challenges/
│   │   ├── rooms/
│   │   ├── messages/
│   │   ├── profile/[username]/
│   │   ├── settings/
│   │   └── wrapped/[year]/
│   ├── api/
│   │   ├── auth/
│   │   ├── books/
│   │   ├── library/
│   │   ├── reviews/
│   │   ├── challenges/
│   │   ├── rooms/
│   │   ├── messages/
│   │   └── pusher/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/              # shadcn components (auto-generated)
│   ├── layout/          # Navbar, Sidebar, Footer
│   ├── books/           # BookCard, BookSearch, BookDetail
│   ├── library/         # LibraryGrid, StatusBadge, ProgressBar
│   ├── reviews/         # ReviewCard, ReviewForm, StarRating
│   ├── challenges/      # ChallengeCard, ChallengeProgress
│   ├── rooms/           # RoomCard, RoomTimer, ParticipantList
│   ├── chat/            # MessageBubble, ChatInput, DMThread
│   └── profile/         # ProfileHeader, ProfileStats
├── lib/
│   ├── prisma.ts        # Prisma client singleton
│   ├── auth.ts          # JWT helpers
│   ├── pusher.ts        # Pusher server + client instances
│   ├── books/
│   │   ├── google.ts    # Google Books API
│   │   └── openlibrary.ts
│   └── utils.ts
├── hooks/               # useSession, usePusher, useDebounce, etc.
├── types/               # Shared TypeScript types
└── middleware.ts         # Auth route protection
```

---

### 0.7 Prisma Client Singleton

`src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

### 0.8 Auth Implementation

**Strategy:** JWT stored in an HTTP-only cookie. No third-party auth library — keeps the dependency tree lean.

`src/lib/auth.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const key = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "booklog_session";

export async function signToken(payload: { userId: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, key);
  return payload as { userId: string };
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}
```

**Route protection** — `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PROTECTED = ["/dashboard", "/library", "/settings", "/rooms", "/messages"];
const AUTH_ONLY = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("booklog_session")?.value;
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY.some((p) => pathname.startsWith(p));

  if (isProtected) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    try {
      await verifyToken(token);
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (isAuthOnly && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
```

---

### 0.9 Vercel Deployment

```bash
npm install -g vercel
vercel link
vercel env pull .env.local
```

Set all environment variables in the Vercel dashboard. Enable **Vercel Blob** for file uploads.

---

### Phase 0 — Definition of Done

- [ ] Next.js app running locally and deployed to Vercel preview
- [ ] All Prisma models migrated to Neon DB
- [ ] Register → verify email → login → protected route flow works end-to-end
- [ ] Password reset via Resend email works
- [ ] CI passes on every PR (typecheck + lint + prisma validate)
- [ ] `.env.example` committed with all keys (no values)

---

## Phase 1 — Core Library
**Weeks 3–5 · Dev A (backend) + Dev B (frontend)**

### Goal
Users can search for books, add them to their library with a status, track progress, and view their library with filtering and sorting.

---

### 1.1 Book Search — Dual API Layer (Dev A)

`src/lib/books/google.ts` — fetch from Google Books:

```typescript
export async function searchGoogleBooks(query: string) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&maxResults=10`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  const data = await res.json();
  return data.items?.map(normalizeGoogleBook) ?? [];
}

function normalizeGoogleBook(item: any) {
  const v = item.volumeInfo;
  return {
    googleBooksId: item.id,
    title: v.title,
    authors: v.authors ?? [],
    coverUrl: v.imageLinks?.thumbnail?.replace("http://", "https://"),
    isbn: v.industryIdentifiers?.find((i: any) => i.type === "ISBN_13")?.identifier,
    description: v.description,
    genres: v.categories ?? [],
    publishedDate: v.publishedDate,
    pageCount: v.pageCount,
    language: v.language,
  };
}
```

`src/lib/books/openlibrary.ts` — fallback:

```typescript
export async function searchOpenLibrary(query: string) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  const data = await res.json();
  return data.docs?.map(normalizeOpenLibraryBook) ?? [];
}
```

**Route Handler** — `src/app/api/books/search/route.ts`:

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return Response.json({ results: [] });

  // Check Neon cache first
  const cached = await prisma.book.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    take: 10,
  });
  if (cached.length >= 3) return Response.json({ results: cached });

  // Fetch from Google Books, fallback to Open Library
  let results = await searchGoogleBooks(q);
  if (results.length === 0) results = await searchOpenLibrary(q);

  // Upsert into Neon cache
  await Promise.all(
    results.map((book) =>
      prisma.book.upsert({
        where: { googleBooksId: book.googleBooksId ?? "__none__" },
        update: {},
        create: book,
      })
    )
  );

  return Response.json({ results });
}
```

---

### 1.2 Library CRUD Routes (Dev A)

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/library` | Fetch user's library (filterable by status) |
| POST | `/api/library` | Add a book to the library |
| PATCH | `/api/library/[id]` | Update status, progress, notes, dates |
| DELETE | `/api/library/[id]` | Remove from library |
| POST | `/api/library/[id]/progress` | Log a progress update |

All routes validate the session via `getSession()` and return 401 if unauthenticated.

---

### 1.3 Library Frontend (Dev B)

**Pages to build:**

- `/search` — search input with debounced API calls, results grid of `BookCard` components, "Add to Library" button with status picker popover
- `/library` — grid/list toggle, filter bar (status tabs + format + genre), sort dropdown (date added, title, author, progress), `LibraryGrid` of `UserBookCard` components
- `/books/[id]` — book detail page: cover, metadata, user's current status widget, average rating, community reviews feed

**Key components:**

```
BookCard          — cover, title, author, avg rating, add button
UserBookCard      — cover + status badge + progress bar + quick-edit
StatusPicker      — popover with 5 status options
ProgressUpdater   — input for page/pct with auto-conversion
BookDetail        — full book page layout
```

**Progress bar logic:**

```typescript
// Convert page → pct or pct → page
function syncProgress(input: "page" | "pct", value: number, pageCount?: number) {
  if (input === "page" && pageCount) {
    return { page: value, pct: Math.min(100, (value / pageCount) * 100) };
  }
  if (input === "pct" && pageCount) {
    return { page: Math.round((value / 100) * pageCount), pct: value };
  }
  return input === "page" ? { page: value, pct: null } : { page: null, pct: value };
}
```

---

### 1.4 Dashboard (Dev B)

`/dashboard` — authenticated home page:

- "Currently Reading" cards (up to 3, with live progress bar)
- Quick stats strip: books read this year, pages read, active challenges
- "Want to Read" shelf preview (next 5)
- Recent activity feed (status changes, progress milestones)

---

### Phase 1 — Definition of Done

- [ ] Book search returns results in < 1.5s with Google Books + Open Library fallback
- [ ] Books are cached in Neon DB after first fetch
- [ ] User can add, update status, log progress, and remove books
- [ ] Library page filters and sorts without page reload
- [ ] Progress syncs between page and percentage fields
- [ ] Dashboard shows currently reading with accurate progress bars

---

## Phase 2 — Reviews & Public Profiles
**Weeks 6–8 · Dev A (backend) + Dev B (frontend) + Dev C (profile customization)**

### Goal
Users can write and read reviews. Public profiles are live with full customization.

---

### 2.1 Reviews (Dev A — backend, Dev B — frontend)

**Routes:**

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/books/[id]/reviews` | Paginated reviews for a book |
| POST | `/api/books/[id]/reviews` | Create a review |
| PATCH | `/api/reviews/[id]` | Edit own review |
| DELETE | `/api/reviews/[id]` | Delete own review |
| POST | `/api/reviews/[id]/like` | Toggle like on a review |

**ReviewForm component** — fields: rating (star picker), title, body (textarea with bold/italic toolbar), spoiler toggle, format select, date read.

**BookDetail reviews section:**
- Sort controls: Most Recent / Most Liked / Highest / Lowest rating
- Each `ReviewCard`: avatar, username, star rating, date, spoiler-gated body, like button
- "Write a Review" CTA (opens dialog if authenticated)

---

### 2.2 Public Profiles (Dev B + Dev C)

**Route:** `/profile/[username]` — server-rendered for SEO.

**Profile sections:**

1. **Header** — banner image, avatar, display name, username, bio, pronouns, location, social links, stats bar (books read · reviews · challenges)
2. **Currently Reading** — live cards
3. **Recently Finished** — last 5 with ratings
4. **Reading Stats** — recharts bar chart (books per month), genre donut chart
5. **Reviews** — paginated
6. **Challenges** — active + completed

**Profile Customization** — `/settings` (profile tab):

- Avatar upload → Vercel Blob → save URL to `User.avatarUrl`
- Banner upload → same pattern
- Color picker for `accentColor` (apply as CSS custom property on profile page)
- Font picker: 5 options (e.g. Inter, Lora, Playfair Display, DM Sans, JetBrains Mono)
- Bio, pronouns, location, social links (up to 3)
- Favourite genres multi-select

**File upload Route Handler** — `src/app/api/upload/route.ts`:

```typescript
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  const blob = await put(`avatars/${session.userId}-${Date.now()}`, file, {
    access: "public",
  });

  return Response.json({ url: blob.url });
}
```

---

### Phase 2 — Definition of Done

- [ ] Users can write, edit, delete reviews; one per book enforced
- [ ] Spoiler content hidden behind toggle for guests
- [ ] Book average rating recalculates on new review
- [ ] Public profile renders correctly for guests (SSR)
- [ ] Avatar and banner upload to Vercel Blob and display correctly
- [ ] Accent color and font preference apply on the profile page
- [ ] Profile sections can be individually toggled in settings

---

## Phase 3 — Challenges
**Weeks 9–10 · Dev A (backend) + Dev B (frontend)**

### Goal
Users can create, join, and track reading challenges. Progress auto-updates when a book is marked finished.

---

### 3.1 Challenge Routes (Dev A)

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/challenges` | Public challenge directory (paginated, filterable) |
| POST | `/api/challenges` | Create a challenge |
| GET | `/api/challenges/[id]` | Challenge detail + participant list |
| POST | `/api/challenges/[id]/join` | Join a challenge |
| PATCH | `/api/challenges/[id]/progress` | Manually update progress (theme/bingo types) |
| DELETE | `/api/challenges/[id]/leave` | Leave a challenge |

**Auto-progress hook** — when `UserBook.status` is set to `FINISHED`, trigger a server-side function to increment `UserChallenge.progress` for all active `BOOK_COUNT` or `PAGE_COUNT` challenges the user is enrolled in:

```typescript
// Called inside PATCH /api/library/[id] when status changes to FINISHED
async function onBookFinished(userId: string, bookId: string) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });

  const active = await prisma.userChallenge.findMany({
    where: {
      userId,
      challenge: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        type: { in: ["BOOK_COUNT", "PAGE_COUNT"] },
      },
      completedAt: null,
    },
    include: { challenge: true },
  });

  for (const uc of active) {
    const increment =
      uc.challenge.type === "BOOK_COUNT" ? 1 : book?.pageCount ?? 0;

    const updated = await prisma.userChallenge.update({
      where: { id: uc.id },
      data: { progress: { increment } },
    });

    if (updated.progress >= uc.challenge.targetValue && !uc.completedAt) {
      await prisma.userChallenge.update({
        where: { id: uc.id },
        data: { completedAt: new Date() },
      });
      // TODO: trigger in-app milestone notification
    }
  }
}
```

---

### 3.2 Challenge Frontend (Dev B)

**Pages:**

- `/challenges` — public directory: filter by type, year, active/completed. Cards show title, type badge, participant count, progress ring.
- `/challenges/[id]` — detail: description, progress bar, participant leaderboard, join/leave button
- `/challenges/new` — form: title, description, type selector, target value, date range, public toggle

**Dashboard integration:** add "Active Challenges" widget to `/dashboard` showing progress rings for each joined challenge.

---

### Phase 3 — Definition of Done

- [ ] All 4 challenge types can be created
- [ ] BOOK_COUNT and PAGE_COUNT progress auto-increments when a book is marked finished
- [ ] Milestone completion (25/50/75/100%) is detected and stored
- [ ] Public challenge directory is paginated and filterable
- [ ] Challenges appear on the user's public profile

---

## Phase 4 — Live Reading Rooms & Chat
**Weeks 11–13 · All devs**

### Goal
Timed group reading sessions work end-to-end with real-time presence, countdown, room chat, and DMs.

---

### 4.1 Pusher Setup

`src/lib/pusher.ts`:

```typescript
import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Client (singleton)
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: "/api/pusher/auth",
  }
);
```

**Pusher auth endpoint** — `src/app/api/pusher/auth/route.ts`:

```typescript
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id")!;
  const channel = params.get("channel_name")!;

  const authResponse = pusherServer.authorizeChannel(socketId, channel, {
    user_id: session.userId,
  });

  return Response.json(authResponse);
}
```

---

### 4.2 Pusher Channel Architecture

| Channel | Type | Used For |
|---------|------|----------|
| `presence-room-{roomId}` | Presence | Participant list, join/leave events |
| `private-room-{roomId}` | Private | Timer ticks, state changes (start/break/end) |
| `private-dm-{userId}` | Private | Incoming DM notifications |

**Events emitted by server:**

| Event | Channel | Payload |
|-------|---------|---------|
| `room:state-changed` | `private-room-{id}` | `{ status, startedAt, breakEndsAt }` |
| `room:progress-updated` | `presence-room-{id}` | `{ userId, page, pct }` |
| `room:message` | `private-room-{id}` | `{ id, senderId, body, createdAt }` |
| `dm:new-message` | `private-dm-{userId}` | `{ messageId, senderId, preview }` |

---

### 4.3 Reading Room Routes (Dev A)

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/rooms` | Upcoming public rooms |
| POST | `/api/rooms` | Create a room |
| GET | `/api/rooms/[id]` | Room detail + participants |
| POST | `/api/rooms/[id]/join` | Join a room |
| POST | `/api/rooms/[id]/start` | Host starts session (triggers Pusher event) |
| POST | `/api/rooms/[id]/break` | Host triggers break |
| POST | `/api/rooms/[id]/end` | Host ends session |
| POST | `/api/rooms/[id]/progress` | Participant logs progress |
| GET | `/api/rooms/[id]/messages` | Paginated room chat history |
| POST | `/api/rooms/[id]/messages` | Send a room chat message |

**Start session handler example:**

```typescript
// POST /api/rooms/[id]/start
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const room = await prisma.readingRoom.findUnique({ where: { id: params.id } });

  if (room?.hostId !== session?.userId) return Response.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.readingRoom.update({
    where: { id: params.id },
    data: { status: "ACTIVE", startedAt: new Date() },
  });

  await pusherServer.trigger(`private-room-${params.id}`, "room:state-changed", {
    status: "ACTIVE",
    startedAt: updated.startedAt,
  });

  return Response.json({ room: updated });
}
```

---

### 4.4 Reading Room Frontend (Dev B + Dev C)

**`/rooms`** — upcoming sessions grid. Cards show book cover, title, host avatar, scheduled time, participant count / max.

**`/rooms/new`** — creation form: book search picker, title, duration select, break toggle, max participants, public toggle, scheduled datetime.

**`/rooms/[id]`** — the live session UI. This is the most complex page:

```
┌─────────────────────────────────────────────┐
│  📖 [Book Cover]  Room Title                │
│  Host: @username  · 12/20 readers           │
├──────────────────────┬──────────────────────┤
│                      │ PARTICIPANTS          │
│   ⏱  42:18          │ @alice  ▓▓▓░░  68%   │
│   remaining          │ @bob    ▓░░░░  22%   │
│                      │ @you    ▓▓░░░  45%   │
│  [Log Progress]      │                      │
│                      │ CHAT (locked 🔒)     │
│  [Break] [End]       │ Unlocks on break     │
│  (host only)         │                      │
└──────────────────────┴──────────────────────┘
```

**Key components:**

```
RoomTimer            — countdown, subscribes to private-room channel
ParticipantList      — presence channel subscriber, live join/leave
RoomProgressLogger   — page/pct input, POSTs to /api/rooms/[id]/progress
RoomChat             — message list + input, locked/unlocked state
RoomStateControls    — host-only start/break/end buttons
SessionRecap         — shown when status = ENDED
```

**Countdown timer hook:**

```typescript
function useRoomTimer(startedAt: Date | null, durationMins: number) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    const end = new Date(startedAt).getTime() + durationMins * 60 * 1000;

    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMins]);

  return remaining;
}
```

---

### 4.5 Direct Messages (Dev C)

**Routes:**

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/messages` | DM inbox (conversations list) |
| GET | `/api/messages/[username]` | Message thread with a user |
| POST | `/api/messages/[username]` | Send a DM |
| PATCH | `/api/messages/[id]/read` | Mark as read |
| DELETE | `/api/messages/[id]` | Soft delete |
| POST | `/api/users/[username]/block` | Block a user |

**DM send handler** (triggers Pusher to recipient):

```typescript
// After saving message to DB:
await pusherServer.trigger(`private-dm-${recipientId}`, "dm:new-message", {
  messageId: message.id,
  senderId: session.userId,
  preview: message.body.slice(0, 60),
});
```

**`/messages`** — inbox: list of conversations sorted by most recent, unread badge count, search input.

**`/messages/[username]`** — thread view: infinite scroll (load older messages upward), `MessageBubble` components (sent/received), `ChatInput`, read receipts.

**Block flow:** "Block user" option in the profile dropdown. Blocking soft-deletes future messages and prevents new DMs. Existing thread is hidden on both sides.

---

### Phase 4 — Definition of Done

- [ ] Rooms can be created, joined, and discovered in the public directory
- [ ] Host can start, break, and end a session
- [ ] Countdown timer is server-authoritative and syncs to all participants via Pusher
- [ ] Participant list updates in real time (< 500ms) on join/leave
- [ ] Progress logged during a session saves to `ProgressLog` and library
- [ ] Room chat is locked during reading, unlocked on break or end
- [ ] DMs send and receive in real time
- [ ] Unread DM badge appears in nav
- [ ] Block prevents future messages
- [ ] All Pusher channels use private/presence (no public channels for sensitive data)

---

## Phase 5 — Data Features (Wrapped + Export)
**Weeks 14–15 · Dev A (backend) + Dev C (frontend)**

### Goal
Reading Wrapped is generated and shareable. Users can export their library as CSV or JSON.

---

### 5.1 Reading Wrapped Generation (Dev A)

**Cron job** (Vercel Cron, runs Jan 1st at 00:01 UTC):

`src/app/api/cron/wrapped/route.ts`:

```typescript
export async function GET(req: Request) {
  // Verify Vercel cron secret
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const year = new Date().getFullYear() - 1;
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    await generateWrapped(user.id, year);
  }

  return Response.json({ ok: true });
}
```

`vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/wrapped", "schedule": "1 0 1 1 *" }]
}
```

**generateWrapped function:**

```typescript
async function generateWrapped(userId: string, year: number) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31T23:59:59`);

  const finished = await prisma.userBook.findMany({
    where: { userId, status: "FINISHED", finishDate: { gte: start, lte: end } },
    include: { book: true },
  });

  if (finished.length === 0) return;

  // Compute stats
  const totalBooks = finished.length;
  const totalPages = finished.reduce((s, ub) => s + (ub.book.pageCount ?? 0), 0);
  // ... compute topGenre, topAuthor, longestBook, etc.

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: finished.filter((ub) => ub.finishDate?.getMonth() === i).length,
  }));

  await prisma.readingWrapped.upsert({
    where: { userId_year: { userId, year } },
    update: { totalBooks, totalPages, monthlyData /* ... */ },
    create: { userId, year, totalBooks, totalPages, monthlyData /* ... */ },
  });
}
```

**Personality labels** (computed from reading behaviour):

| Label | Trigger |
|-------|---------|
| The Night Owl | Most progress logged between 10pm–2am |
| The Genre Hopper | ≥ 4 different genres in the year |
| The Speed Reader | Average finish time < 3 days |
| The Completionist | 0 DNF books |
| The Devoted | Reading streak ≥ 30 days |
| The Explorer | ≥ 3 different languages |

---

### 5.2 Wrapped Frontend (Dev C)

`/wrapped/[year]` — animated card-by-card reveal (CSS transitions, no heavy animation library needed).

**Shareable card generation:** use `html-to-image` or a canvas-based approach to render a 1080×1920 PNG for download.

```bash
npm install html-to-image
```

**Share link:** `/wrapped/[year]` is publicly accessible if the user's profile is public.

---

### 5.3 Data Export (Dev A)

`src/app/api/export/route.ts`:

```typescript
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv"; // "csv" | "json"
  const includeNotes = searchParams.get("notes") === "true";

  const library = await prisma.userBook.findMany({
    where: { userId: session.userId },
    include: { book: true, progressLogs: false },
  });

  if (format === "json") {
    return new Response(JSON.stringify(library, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="booklog-export-${Date.now()}.json"`,
      },
    });
  }

  // CSV
  const header = ["Title","Author","ISBN","Status","Format","Start Date","Finish Date","Rating","Current Page","Total Pages","Progress %","Date Added", ...(includeNotes ? ["Notes"] : [])];
  const rows = library.map((ub) => [
    ub.book.title, ub.book.authors.join("; "), ub.book.isbn ?? "",
    ub.status, ub.format, ub.startDate?.toISOString().split("T")[0] ?? "",
    ub.finishDate?.toISOString().split("T")[0] ?? "",
    "", ub.currentPage ?? "", ub.book.pageCount ?? "",
    ub.progressPct?.toFixed(1) ?? "", ub.dateAdded.toISOString().split("T")[0],
    ...(includeNotes ? [ub.notes ?? ""] : []),
  ]);

  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="booklog-export-${Date.now()}.csv"`,
    },
  });
}
```

---

### Phase 5 — Definition of Done

- [ ] Wrapped generates correctly on Jan 1st via Vercel Cron
- [ ] Users with 0 books in the year are skipped gracefully
- [ ] Wrapped page shows all stats with smooth transitions
- [ ] Shareable Wrapped card downloads as 1080×1920 PNG
- [ ] CSV export includes all columns and respects notes toggle
- [ ] JSON export is valid and complete
- [ ] Export of large libraries (> 200 books) works asynchronously without timeout

---

## Phase 6 — Polish, Performance & Launch Prep
**Weeks 16–17 · All devs**

### Goal
The app is fast, accessible, SEO-ready, and production-hardened.

---

### 6.1 Performance

- [ ] Add `loading.tsx` skeleton screens to all major routes
- [ ] Implement `Suspense` boundaries around slow data fetches
- [ ] Paginate all list views (library, reviews, challenges, DMs)
- [ ] Add `react-query` or SWR for client-side data caching where applicable
- [ ] Run Lighthouse audit — target ≥ 90 on Performance, Accessibility, SEO
- [ ] Optimize all images with `next/image` + WebP
- [ ] Add `robots.txt` and `sitemap.xml` (public book pages + public profiles)

### 6.2 Accessibility

- [ ] Keyboard navigation through all interactive elements
- [ ] Proper ARIA labels on icon buttons, progress bars, star ratings
- [ ] Focus management in dialogs and popovers (shadcn handles most of this)
- [ ] Colour contrast ≥ 4.5:1 for all text (especially with custom accent colors)
- [ ] Skip-to-content link in layout

### 6.3 SEO

- [ ] Dynamic `metadata` export on `/books/[id]` and `/profile/[username]`
- [ ] Open Graph tags for Wrapped share cards
- [ ] Structured data (JSON-LD) on book pages

### 6.4 Security Hardening

- [ ] Rate-limit all auth endpoints (register, login, forgot-password) — use `@upstash/ratelimit` + Upstash Redis or simple in-memory map
- [ ] Sanitize all user text inputs (bio, review body, chat messages) with `DOMPurify` or strip HTML server-side
- [ ] Validate all file uploads (type + size) before sending to Vercel Blob
- [ ] Ensure all Prisma queries filter by `userId` to prevent cross-user data access

### 6.5 Error Handling

- [ ] Global `error.tsx` boundary per route segment
- [ ] `not-found.tsx` for missing books, profiles, rooms
- [ ] Toast notifications for all async operations (success + error)

### 6.6 Bug Bash (2 days)

- [ ] Full end-to-end walkthrough of every user flow
- [ ] Cross-browser test: Chrome, Firefox, Safari
- [ ] Mobile test: iOS Safari, Android Chrome
- [ ] Edge cases: empty states, single-book library, 0-review books, expired room links

---

### Phase 6 — Definition of Done

- [ ] Lighthouse ≥ 90 on all four categories for the homepage, book page, and profile page
- [ ] All known bugs from bug bash resolved or triaged
- [ ] `sitemap.xml` live and indexed in Google Search Console
- [ ] All environment variables set in Vercel production
- [ ] Database indexed on high-traffic query columns (userId, bookId, status, scheduledAt)

---

## Launch Week — Week 18

- [ ] Final Neon DB backup
- [ ] Promote Vercel preview → production domain
- [ ] Set up Vercel Analytics + Speed Insights
- [ ] Monitor Pusher dashboard for connection metrics
- [ ] Announce on relevant communities (Reddit r/books, Bookstagram, etc.)

---

## Appendix A — Recommended Database Indexes

```prisma
// Add to schema.prisma models

model UserBook {
  @@index([userId, status])
  @@index([bookId])
}

model Review {
  @@index([bookId])
  @@index([userId])
}

model ReadingRoom {
  @@index([status, scheduledAt])
  @@index([hostId])
}

model Message {
  @@index([senderId, recipientId])
  @@index([roomId])
  @@index([createdAt])
}

model UserChallenge {
  @@index([userId])
  @@index([challengeId])
}
```

---

## Appendix B — Third-Party Service Summary

| Service | Purpose | Pricing (as of 2026) |
|---------|---------|----------------------|
| Neon DB | PostgreSQL database | Free tier: 0.5 GB, then usage-based |
| Vercel | Hosting + Cron + Blob | Free tier covers MVP scale |
| Pusher | Real-time WebSockets | Free: 200k messages/day, 100 concurrent |
| Resend | Transactional email | Free: 3k emails/month |
| Google Books API | Book metadata | Free: 1k req/day without key, 1M with |
| Open Library | Book metadata fallback | Free, no key required |

---

## Appendix C — Key Technical Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth library | Custom JWT (`jose`) | No OAuth needed; avoids NextAuth overhead for credentials-only |
| Real-time | Pusher | Managed, Vercel-compatible, generous free tier; Socket.io needs persistent server |
| File uploads | Vercel Blob | Zero-config with Vercel deployment; Cloudinary if more transform features needed later |
| ORM | Prisma | Type-safe, excellent Next.js integration, Neon DB compatible |
| Email | Resend | Modern API, great DX, React Email templates supported |
| State management | React Query + RSC | Server Components for data fetching; React Query for client-side caching only where needed |
| Animation | CSS transitions only | Keeps bundle small; no Framer Motion unless Wrapped reveal needs it |

---

*Implementation Plan v1.0 — BookLog. Written to accompany PRD v1.1.*
