# X (Twitter) Full-Stack Clone - Rails 8 API & React

A production-ready full-stack clone of X (formerly Twitter) built with **Ruby on Rails 8 (API mode)** and **React (Vite)**. The application implements core social mechanics including media uploads, recursive comment threads, optimistic interactions, and real-time feed synchronization over WebSockets.

---

## 🚀 Key Features Built

* **Authentication & Authorization**: Stateless JWT authentication with secure password hashing via `bcrypt`.
* **Reverse-Chronological Timeline**: Cursor-based infinite pagination feed powered by browser `IntersectionObserver`.
* **Nested Threaded Comments**: Recursive reply system with inline expansion drawers and counter-cache optimizations.
* **Media Uploads & Streaming**: Direct file uploads powered by Rails **ActiveStorage** via multipart `FormData`, handled through the `mini_magick` image processing pipeline.
* **Real-Time Live Updates**: ActionCable WebSocket integration (`FeedChannel`) broadcasting tweets, replies, like counts, and deletions instantly without page refreshes.
* **Optimistic UI Updates**: Zero-latency interactions for liking, unliking, and posting, backed by server reconciliation.
* **Profile & Social Graph**: Follow/unfollow mechanics, user profile timelines, follower/following counts, and a follower-filtered feed tab.

---

## 🛠 Tech Stack & Architecture

### Backend
* **Framework**: Ruby on Rails 8 (API-only mode)
* **Database**: PostgreSQL
* **WebSockets**: ActionCable (Async adapter for development, Redis-ready for production)
* **File Storage**: ActiveStorage (`mini_magick` variant processor)
* **Authentication**: JWT (`jwt` gem) + `has_secure_password`

### Frontend
* **Core**: React 18 + Vite
* **Icons**: `lucide-react`
* **Real-Time Client**: `@rails/actioncable`
* **Styling**: Responsive inline styles mirroring Twitter/X web design

---

## 📂 Project Structure

```text
x-clone-fullstack/
├── backend/
│   ├── app/
│   │   ├── channels/             # ActionCable WebSocket channels (FeedChannel)
│   │   ├── controllers/api/v1/   # Auth, Tweets, Users controllers
│   │   └── models/               # User, Tweet, Like, Follow models
│   ├── config/                   # ActiveStorage, routes, cable.yml
│   └── db/                       # Migrations & schema definitions
└── frontend/
    ├── src/
    │   ├── App.jsx               # Main SPA entrypoint, state & WebSocket consumer
    │   └── main.jsx
    └── package.json

```

---

## ⚙️ Setup & Local Installation

### Prerequisites

* Ruby 3.3+
* PostgreSQL
* Node.js 18+
* ImageMagick (`sudo apt-get install -y imagemagick`)

### 1. Backend Setup

```bash
cd backend
bundle install
rails db:create db:migrate
rails s -p 3000

```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev

```

* Frontend: `http://localhost:5173`
* Backend API & WebSocket: `http://localhost:3000` (`ws://localhost:3000/cable`)

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/signup` | Register new account | No |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/v1/tweets` | Fetch paginated feed (`?cursor=&feed=following`) | Optional |
| `POST` | `/api/v1/tweets` | Create new tweet/reply (`multipart/form-data`) | Yes |
| `GET` | `/api/v1/tweets/:id` | Fetch tweet details and thread replies | Optional |
| `POST` | `/api/v1/tweets/:id/like` | Toggle like status on a tweet/reply | Yes |
| `DELETE` | `/api/v1/tweets/:id` | Delete tweet (author only) | Yes |
| `GET` | `/api/v1/users/:username` | Get user profile & posted tweets | Optional |
| `POST` | `/api/v1/users/:username/follow` | Toggle follow status | Yes |

---

## 🔄 Solved Engineering Challenges

* **ActiveStorage in Pure API Mode**: Constructed direct blob URLs with request host fallback, eliminating session-cookie dependencies for media serving.
* **Schema Constraints for Media Posts**: Handled image-only posts by setting `null: true` on `tweets.content` alongside conditional model-level validation (`unless: :image_attached?`).
* **WebSocket Deduplication**: Built client-side state reconciliation to prevent duplicate feed cards when ActionCable broadcasts match local optimistic state.
* **Event Propagation in Nested React Trees**: Fixed like toggles inside comment drawers using `e.stopPropagation()` and explicit `type="button"` attributes to eliminate page-reload glitches.

```

## 🔌 API Endpoints Reference


| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/signup` | Register new account | No |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/v1/tweets` | Fetch paginated feed (`?cursor=&feed=following`) | Optional |
| `POST` | `/api/v1/tweets` | Create new tweet/reply (`multipart/form-data`) | Yes |
| `GET` | `/api/v1/tweets/:id` | Fetch tweet details and thread replies | Optional |
| `POST` | `/api/v1/tweets/:id/like` | Toggle like status on a tweet/reply | Yes |
| `DELETE` | `/api/v1/tweets/:id` | Delete tweet (author only) | Yes |
| `GET` | `/api/v1/users/:username` | Get user profile & posted tweets | Optional |
| `POST` | `/api/v1/users/:username/follow` | Toggle follow status | Yes |

### ⚡ Real-Time WebSockets (ActionCable)


| Protocol | Mount Point | Channel | Description |
| --- | --- | --- | --- |
| `WS` | `/cable` | `FeedChannel` | Live stream for new tweets, replies, deletions, and like updates |

