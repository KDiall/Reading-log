# Product Requirements Document — BookLog

**Version:** 1.1  
**Status:** Draft  
**Last Updated:** May 23, 2026  
**Stack:** Next.js · shadcn/ui · Neon DB · Prisma ORM · Pusher

---

## 1. Product Overview

### 1.1 Vision

BookLog is a free, social reading tracker for eBook and audiobook readers. It combines a personal reading library with community-driven reviews, public profiles, structured reading challenges, live timed reading sessions, and real-time direct messaging — giving readers a beautiful, data-rich, and connected home for their reading life.

### 1.2 Mission Statement

Make reading more intentional, social, and rewarding — from logging your first page to sharing your year-end reading recap.

### 1.3 Target Audience

Readers who consume eBooks and audiobooks and want to track their progress, discover new books through community reviews, participate in reading challenges, and maintain a public reading identity.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target (6 months) |
|------|--------|-------------------|
| User adoption | Registered accounts | 5,000 |
| Engagement | Books logged per active user | ≥ 8 |
| Retention | 30-day active return rate | ≥ 40% |
| Social | Reviews submitted per month | ≥ 1,500 |
| Challenges | Challenges created or joined | ≥ 2,000 |
| Live Rooms | Reading sessions hosted per month | ≥ 500 |
| Chat | DMs sent per month | ≥ 3,000 |

---

## 3. Scope — MVP vs. Post-Launch

### In Scope (MVP)

- Authentication (email + password)
- Personal library with reading status management
- Progress tracking (page + percentage)
- Book search via Google Books + Open Library APIs
- Community reviews and star ratings
- Public user profiles (fully customizable)
- Reading challenges & goals
- Yearly Reading Wrapped
- Data export (CSV / JSON)
- Live Reading Rooms (timed group sessions)
- Real-time chat (room chat + direct messages)

### Out of Scope (Post-Launch)

- Mobile apps (iOS / Android)
- OAuth / social login
- Physical book tracking
- E-reader integrations (Kindle sync, etc.)
- Monetization / premium tier

---

## 4. User Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| Guest | Unauthenticated visitor | Browse public profiles, view book pages & reviews, search |
| Member | Registered user | Everything above + manage library, write reviews, join challenges, customize profile, export data, host/join reading rooms, send direct messages |

---

## 5. Feature Specifications

---

### 5.1 Authentication

**User Stories**
- As a new user, I can register with my email and a password.
- As a returning user, I can log in and be taken to my dashboard.
- As a user, I can reset my password via email.
- As a user, I can update my email or password in account settings.

**Acceptance Criteria**
- Passwords must be ≥ 8 characters with at least one number and one special character.
- Email must be verified before access is granted.
- Invalid login attempts are rate-limited (5 attempts → 15-minute lockout).
- Sessions expire after 30 days of inactivity.
- JWT-based sessions stored in HTTP-only cookies.

---

### 5.2 Book Search & Discovery

BookLog uses a combined data layer from **Google Books API** and **Open Library API** to populate book metadata. Results are deduplicated and merged before display.

**User Stories**
- As a user, I can search for books by title, author, or ISBN.
- As a user, I can view a book's detail page showing cover, description, genres, ratings, and community reviews.
- As a user, I can see whether I've already added a book to my library from the search results.

**Data Fields Fetched (per book)**

| Field | Source Priority |
|-------|----------------|
| Title, Author(s) | Google Books → Open Library |
| Cover Image | Google Books → Open Library |
| ISBN | Google Books → Open Library |
| Description / Synopsis | Google Books → Open Library |
| Genre / Categories | Google Books → Open Library |
| Published Date | Google Books → Open Library |
| Page Count | Google Books → Open Library |
| Language | Google Books |

**Acceptance Criteria**
- Search returns results within 1.5 seconds (p95).
- If Google Books returns no result, fallback to Open Library is automatic and invisible.
- Book metadata is cached in Neon DB after first fetch to reduce repeated API calls.
- A user can manually correct or override metadata on books they've added (title, cover, page count).

---

### 5.3 Personal Library

This is the core feature — a user's private, organized collection of every book they've interacted with.

**Reading Statuses**

| Status | Description |
|--------|-------------|
| Want to Read | Saved for later |
| Currently Reading | In progress |
| Finished | Completed |
| Did Not Finish (DNF) | Abandoned |
| Re-Reading | Reading again |

**User Stories**
- As a user, I can add a book to my library with a chosen status.
- As a user, I can change a book's status at any time.
- As a user, I can update my reading progress by entering a page number or percentage.
- As a user, I can add personal notes/annotations to any book in my library (private by default).
- As a user, I can set a start date and end date for books I'm reading.
- As a user, I can filter and sort my library by status, genre, format (eBook / audiobook), and date added.
- As a user, I can view reading stats on my library page (total books, total pages read, favourite genres).

**Progress Tracking Logic**
- Users enter either current page number or a percentage (0–100).
- If page count is known, the other value is calculated automatically.
- Progress history is stored so users can see a reading pace graph.
- A "currently reading" book shows a visual progress bar.

**Acceptance Criteria**
- Progress updates are saved on blur or form submission, not on every keystroke.
- Library loads within 1 second for up to 500 books.
- All filter/sort combinations are supported without page reload.
- Notes are plaintext with a 2,000-character limit.

---

### 5.4 Reviews & Ratings

Community reviews are visible on every book's public page and on the reviewer's public profile.

**Review Structure**

| Field | Type | Required |
|-------|------|----------|
| Star Rating | 1–5 stars (half-star not supported in MVP) | Yes |
| Review Title | Short string, ≤ 100 chars | No |
| Review Body | Rich-ish text (bold, italic, spoiler tag) | No |
| Spoiler Flag | Boolean toggle | No |
| Date Read | Date | No |
| Format | eBook or Audiobook | Yes |

**User Stories**
- As a user, I can write one review per book.
- As a user, I can edit or delete my review at any time.
- As a user, I can mark my review as containing spoilers.
- As a guest, I can read reviews but spoiler content is hidden behind a "Show Spoiler" toggle.
- As a user, I can like/upvote other users' reviews.
- As a user, I can sort book reviews by Most Recent, Most Liked, or Highest / Lowest Rating.

**Acceptance Criteria**
- Review body has a 5,000-character limit.
- A book's average rating is recalculated in real-time on submission.
- Reviews without a body but with a star rating ("silent ratings") are counted in averages but not shown in the review feed.
- Report / flag functionality for reviews is available (reviewed by admin manually in MVP).

---

### 5.5 Public User Profiles

Every user has a fully customizable public profile that acts as their reading identity page.

**Profile Customization Options**

| Element | Options |
|---------|---------|
| Display Name | Custom string |
| Username / Handle | URL-safe, unique (e.g. booklog.io/@username) |
| Bio | Up to 300 characters |
| Avatar | Image upload (JPG/PNG, max 2MB) |
| Banner / Header Image | Image upload (JPG/PNG, max 5MB) |
| Accent Color | Color picker (used for profile highlights) |
| Font Preference | 3–5 curated font options |
| Pronouns | Free text field |
| Location | Optional free text |
| Favorite Genres | Multi-select, shown as tags |
| Social Links | Up to 3 links (Goodreads, Storygraph, personal site, etc.) |

**Profile Sections (Public View)**

1. **Header** — avatar, banner, name, bio, stats bar (books read, reviews written)
2. **Currently Reading** — live progress card(s)
3. **Recently Finished** — last 5 books with ratings
4. **Reading Stats** — pages read, books per year chart, top genres
5. **Reviews** — paginated review feed
6. **Challenges** — active and completed challenges

**User Stories**
- As a user, I can control which sections are visible on my public profile.
- As a guest, I can view any public profile without an account.
- As a user, I can set my library to private (hides library from public; reviews still show).

---

### 5.6 Reading Challenges & Goals

Challenges are the primary community hook — structured goals readers can create and share.

**Challenge Types**

| Type | Description | Example |
|------|-------------|---------|
| Book Count | Read N books in a period | "Read 24 books in 2026" |
| Page Count | Read N pages in a period | "Read 10,000 pages this year" |
| Genre Bingo | Fill a grid of genre/prompt slots | "2026 Genre Bingo Card" |
| Theme-Based | Read books matching a list of prompts | "Read a book with a one-word title" |

**User Stories**
- As a user, I can create a personal reading challenge (private or public).
- As a user, I can join a public challenge created by another user.
- As a user, I can see my progress towards a challenge on my dashboard and profile.
- As a user, I can share a completed challenge with a shareable link and card image.
- As a user, I'm notified (in-app) when I hit a challenge milestone (25%, 50%, 75%, 100%).
- As a user, I can browse a public challenge directory and filter by type, year, and popularity.

**Acceptance Criteria**
- Challenge progress auto-updates when a user marks a relevant book as finished.
- Challenges have a defined time period (start date + end date).
- A user can participate in multiple challenges simultaneously.
- Completed challenges are archived on the user's profile permanently.

---

### 5.7 Reading Wrapped (Yearly Recap)

Inspired by Spotify Wrapped — a shareable, visual summary of a user's reading year.

**Stats Included**

| Stat | Description |
|------|-------------|
| Total Books Read | Count for the year |
| Total Pages Read | Sum across all finished books |
| Total Listening Hours | For audiobooks (if duration data available) |
| Favourite Genre | Most-read genre by book count |
| Top Author | Most-read author by book count |
| Longest Book | By page count |
| Shortest Book | By page count |
| Fastest Read | Fewest days to finish |
| Reading Streak | Longest streak of days with progress updates |
| Reading Personality | A fun, computed label (e.g. "The Night Owl", "The Genre Hopper") |
| Monthly Breakdown | Books completed per month — bar chart |
| Star Distribution | How the user rated books — histogram |

**User Stories**
- As a user, my Wrapped is automatically generated on January 1st for the previous year.
- As a user, I can view and re-view my Wrapped from my profile at any time.
- As a user, I can share my Wrapped via a public link or download a recap card image.

**Acceptance Criteria**
- Wrapped is generated for any user who finished ≥ 1 book in the year.
- Wrapped data is computed from the Neon DB and cached as a snapshot (not re-computed on every view).
- Downloadable card is a PNG, 1080×1920px.

---

### 5.8 Data Export

**User Stories**
- As a user, I can export my entire library as a CSV or JSON file.
- As a user, I can choose to include or exclude personal notes in my export.

**CSV Columns:** Title, Author, ISBN, Status, Format, Start Date, Finish Date, Rating, Current Page, Total Pages, Progress %, Date Added, Personal Notes (optional)

**JSON:** Full structured export including review text, challenge data, and profile metadata.

**Acceptance Criteria**
- Export is generated asynchronously for libraries > 200 books; user is notified when ready.
- Files are available for download for 24 hours after generation.
- Export does not include other users' data under any circumstances.

---

### 5.9 Live Reading Rooms

A Live Reading Room is a **timed, synchronised group reading session** built around a shared book. Readers join at a scheduled time, read together in silence (or near-silence), log progress live, and chat in a shared room channel during breaks or after the session ends.

**Real-time layer:** Pusher Channels (managed WebSockets, serverless-compatible with Next.js on Vercel).

**Room Lifecycle**

| State | Description |
|-------|-------------|
| Scheduled | Room created, not yet started; joinable by participants |
| Active | Timer running; live participant list and progress visible |
| On Break | Optional mid-session break; chat unlocked for group discussion |
| Ended | Session over; recap shown; room archived |

**Room Structure**

| Field | Details |
|-------|---------|
| Book | Linked BookLog book (required) |
| Host | The user who created the room |
| Session Duration | 25 min / 45 min / 60 min / custom (host picks) |
| Break Duration | Optional 5–15 min break between reading blocks |
| Max Participants | 2–50 (host sets, default 20) |
| Visibility | Public (discoverable) or Private (invite-link only) |
| Scheduled Start | Date + time (UTC stored, local shown) |

**User Stories**
- As a user, I can create a Live Reading Room for any book in the BookLog library, set a duration, and invite others via a shareable link.
- As a user, I can browse upcoming public reading rooms and join one that interests me.
- As a user, when a room I've joined is about to start, I receive an in-app notification (5 min warning).
- As a host, I can start, pause (break), and end a session; all participants see the state change in real time.
- As a participant, I can see the live countdown timer, the participant list, and how many pages each person has logged this session (opt-in).
- As a participant, I can log a progress update mid-session (page or %) and it syncs to my library automatically.
- As a user, at the end of a session I see a session recap: time read, pages logged, participants.
- As a user, past rooms I hosted or joined appear in a "Reading Sessions" section on my profile.

**Acceptance Criteria**
- Pusher presence channels are used so the participant list updates within 500ms of join/leave.
- Timer state is authoritative on the server (not client-side) to prevent drift.
- Progress updates during a session are written to `ProgressLog` in Neon DB in real time.
- A room with 0 participants that hasn't started is auto-cancelled after 15 minutes past scheduled start.
- Room chat history is persisted in DB and viewable after the session ends.
- Rooms support up to 50 concurrent participants without degradation.

---

### 5.10 Chat

BookLog has two chat surfaces: **Room Chat** (tied to a Live Reading Room) and **Direct Messages** (between any two members).

**Real-time layer:** Pusher Channels for room chat; Pusher private channels for DMs.

#### 5.10.1 Room Chat

Room chat is scoped to a reading room. It is available during breaks and after a session ends. During an active reading block, chat is locked (collapsed, no new messages) to preserve focus — the host can override this.

**User Stories**
- As a participant, I can send messages in the room chat during a break or after the session ends.
- As a host, I can optionally unlock chat during an active reading block.
- As a user, I can react to a message with an emoji (👍 📖 🔥 😭 — fixed set of 6 reactions).
- As a user, I can see who is typing in real time.

#### 5.10.2 Direct Messages (DMs)

Persistent 1:1 conversations between any two members.

**User Stories**
- As a user, I can start a DM with any other user from their public profile.
- As a user, I receive an in-app notification (badge + toast) when a new DM arrives.
- As a user, I can see a read receipt (✓✓) when the other person has read my message.
- As a user, I can delete a message I sent (soft delete — replaced with "Message deleted").
- As a user, I can block another user, which ends the DM thread and prevents future messages.
- As a user, I can search through my DM history by keyword.

**Chat Message Structure**

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| senderId | String | FK → User |
| recipientId / roomId | String | FK → User or ReadingRoom |
| body | String | Max 1,000 chars |
| isDeleted | Boolean | Soft delete flag |
| readAt | DateTime? | Null until read |
| createdAt | DateTime | |

**Acceptance Criteria**
- Messages delivered within 300ms on a standard connection via Pusher.
- Message history is paginated (50 messages per page, infinite scroll upward).
- DM inbox is sorted by most recent message.
- Blocked users cannot see message history from after the block was applied.
- Chat does not support file/image attachments in MVP (text only).
- Messages are stored in Neon DB; Pusher is transport only (not the source of truth).

---

## 6. Navigation & Page Map

```
/                          → Landing page (marketing)
/login                     → Login
/register                  → Sign up
/dashboard                 → Authenticated home (currently reading, stats, challenge progress)
/search                    → Book search
/books/[id]                → Book detail page (metadata + community reviews)
/library                   → My library (all statuses, filterable)
/library/[status]          → Filtered library view
/challenges                → Challenge directory (public)
/challenges/[id]           → Challenge detail
/challenges/new            → Create challenge
/rooms                     → Live Reading Rooms directory (upcoming public sessions)
/rooms/new                 → Create a reading room
/rooms/[id]                → Live reading room (session UI)
/messages                  → DM inbox
/messages/[username]       → DM thread with a specific user
/profile/[username]        → Public profile
/settings                  → Account settings (profile, password, notifications, export)
/wrapped/[year]            → Reading Wrapped for a given year
```

---

## 7. Data Models (Prisma Schema Outline)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  username      String    @unique
  displayName   String
  bio           String?
  avatarUrl     String?
  bannerUrl     String?
  accentColor   String?
  fontPreference String?
  pronouns      String?
  location      String?
  isPrivate     Boolean   @default(false)
  createdAt     DateTime  @default(now())

  library       UserBook[]
  reviews       Review[]
  challenges    UserChallenge[]
  wrappedYears  ReadingWrapped[]
  hostedRooms   ReadingRoom[]    @relation("HostedRooms")
  roomSessions  RoomParticipant[]
  sentMessages  Message[]        @relation("SentMessages")
  blockedUsers  Block[]          @relation("Blocker")
  blockedBy     Block[]          @relation("Blocked")
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

  userBooks     UserBook[]
  reviews       Review[]
}

model UserBook {
  id            String        @id @default(cuid())
  userId        String
  bookId        String
  status        ReadingStatus
  format        BookFormat
  currentPage   Int?
  progressPct   Float?
  startDate     DateTime?
  finishDate    DateTime?
  notes         String?
  dateAdded     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  user          User          @relation(...)
  book          Book          @relation(...)
  progressLogs  ProgressLog[]
}

model ProgressLog {
  id          String   @id @default(cuid())
  userBookId  String
  page        Int?
  pct         Float?
  loggedAt    DateTime @default(now())

  userBook    UserBook @relation(...)
}

model Review {
  id          String   @id @default(cuid())
  userId      String
  bookId      String
  rating      Int      // 1–5
  title       String?
  body        String?
  hasSpoiler  Boolean  @default(false)
  format      BookFormat
  dateRead    DateTime?
  likesCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(...)
  book        Book     @relation(...)
}

model Challenge {
  id          String         @id @default(cuid())
  creatorId   String
  title       String
  description String?
  type        ChallengeType
  isPublic    Boolean        @default(true)
  startDate   DateTime
  endDate     DateTime
  targetValue Int            // e.g. 24 (books) or 10000 (pages)
  createdAt   DateTime       @default(now())

  participants UserChallenge[]
}

model UserChallenge {
  id          String    @id @default(cuid())
  userId      String
  challengeId String
  progress    Int       @default(0)
  completedAt DateTime?
  joinedAt    DateTime  @default(now())

  user        User      @relation(...)
  challenge   Challenge @relation(...)
}

model ReadingWrapped {
  id              String   @id @default(cuid())
  userId          String
  year            Int
  totalBooks      Int
  totalPages      Int
  topGenre        String?
  topAuthor       String?
  longestBook     String?
  fastestRead     String?
  longestStreak   Int?
  personality     String?
  monthlyData     Json
  ratingDist      Json
  generatedAt     DateTime @default(now())

  user            User     @relation(...)
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
```

**New models (Live Rooms & Chat):**

```prisma
model ReadingRoom {
  id              String      @id @default(cuid())
  hostId          String
  bookId          String
  title           String
  status          RoomStatus  @default(SCHEDULED)
  isPublic        Boolean     @default(true)
  scheduledAt     DateTime
  durationMins    Int         // e.g. 25, 45, 60
  breakMins       Int?
  maxParticipants Int         @default(20)
  chatLocked      Boolean     @default(true) // locked during active reading
  startedAt       DateTime?
  endedAt         DateTime?
  createdAt       DateTime    @default(now())

  host            User        @relation("HostedRooms", ...)
  book            Book        @relation(...)
  participants    RoomParticipant[]
  messages        Message[]
}

model RoomParticipant {
  id            String      @id @default(cuid())
  roomId        String
  userId        String
  joinedAt      DateTime    @default(now())
  leftAt        DateTime?
  pagesLogged   Int         @default(0)  // pages logged during this session
  shareProgress Boolean     @default(true)

  room          ReadingRoom @relation(...)
  user          User        @relation(...)
}

model Message {
  id          String         @id @default(cuid())
  senderId    String
  context     MessageContext
  roomId      String?        // set when context = ROOM
  recipientId String?        // set when context = DIRECT
  body        String         // max 1000 chars
  isDeleted   Boolean        @default(false)
  readAt      DateTime?
  createdAt   DateTime       @default(now())

  sender      User           @relation("SentMessages", ...)
  room        ReadingRoom?   @relation(...)
}

model Block {
  id          String   @id @default(cuid())
  blockerId   String
  blockedId   String
  createdAt   DateTime @default(now())

  blocker     User     @relation("Blocker", ...)
  blocked     User     @relation("Blocked", ...)

  @@unique([blockerId, blockedId])
}

---

## 8. Technical Architecture

### 8.1 Frontend

| Concern | Approach |
|---------|----------|
| Framework | Next.js 14+ (App Router) |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| State | React Server Components + client state (Zustand or Context) |
| Forms | React Hook Form + Zod |
| Images | Next.js `<Image>` with Cloudinary or Vercel Blob for uploads |

### 8.2 Backend

| Concern | Approach |
|---------|----------|
| API Layer | Next.js Route Handlers (App Router) |
| ORM | Prisma |
| Database | Neon DB (PostgreSQL, serverless) |
| Auth | Custom JWT via `jose` or NextAuth.js (credentials provider only) |
| Book APIs | Google Books API + Open Library API (server-side, cached) |
| Email | Resend (for verification & password reset) |
| File Uploads | Vercel Blob or Cloudinary (avatars, banners) |
| Real-time | Pusher Channels (presence channels for rooms, private channels for DMs) |

### 8.3 Caching Strategy

- Book metadata: cached in Neon DB after first fetch, refreshed every 30 days.
- Search results: cached in-memory (Redis or Next.js cache) for 10 minutes per query.
- Reading Wrapped snapshots: stored as DB records, not recomputed on view.
- User profile stats: recomputed on library update, cached in DB.

---

## 9. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Pages load ≤ 2s on 4G; search returns in ≤ 1.5s |
| Availability | 99.5% uptime target |
| Scalability | Neon DB autoscaling; serverless Next.js on Vercel |
| Security | All passwords bcrypt-hashed; no plaintext PII in logs; HTTPS only |
| Accessibility | WCAG 2.1 AA — keyboard navigation, proper ARIA labels, colour contrast |
| SEO | Public book pages and profiles server-side rendered for indexability |
| Data Privacy | Users can delete their account and all associated data permanently |
| Mobile | Fully responsive; mobile-first layout |

---

## 10. Out of Scope / Constraints

- No social login in MVP (email + password only).
- No physical book format tracking.
- No push notifications (in-app + Pusher only in MVP).
- No admin dashboard in MVP (flagged reviews handled manually).
- No payment infrastructure (fully free).
- No file/image attachments in chat (text only in MVP).

---

## 11. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should users be able to follow each other or just view public profiles? | Product | Pre-MVP |
| 2 | Should challenge bingo cards be visual/interactive or text-prompt only in MVP? | Design | Pre-MVP |
| 3 | What is the maximum library size we design for at launch? | Eng | Pre-MVP |
| 4 | Should audiobook progress be tracked in minutes/hours rather than pages? | Product | Pre-MVP |
| 5 | Do we want a "Reading Now" widget users can embed on other sites? | Product | Post-MVP |
| 6 | Should room chat support @mentions of other participants? | Product | Pre-Phase 4 |
| 7 | Should DMs support group conversations (3+ users) in MVP or 1:1 only? | Product | Pre-Phase 4 |
| 8 | Should reading room progress be opt-in visible to others (privacy)? | Product | Pre-Phase 4 |

---

## 12. Milestones

| Phase | Scope | Target |
|-------|-------|--------|
| Phase 0 — Setup | Repo, DB schema, auth, CI/CD | Week 1–2 |
| Phase 1 — Core Library | Book search, library CRUD, progress tracking | Week 3–5 |
| Phase 2 — Social | Reviews, public profiles, profile customization | Week 6–8 |
| Phase 3 — Challenges | Challenge creation, joining, progress tracking | Week 9–10 |
| Phase 4 — Real-time | Live Reading Rooms + room chat + DMs (Pusher integration) | Week 11–13 |
| Phase 5 — Data | Wrapped generation, CSV/JSON export | Week 14–15 |
| Phase 6 — Polish | Performance, SEO, accessibility audit, bug bash | Week 16–17 |
| **Launch** | Public release | Week 18 |

---

*PRD authored for BookLog v1.1. Added: Live Reading Rooms (§5.9) and Chat — room chat + DMs (§5.10). All estimates are indicative. Review and adjust before sprint planning.*
