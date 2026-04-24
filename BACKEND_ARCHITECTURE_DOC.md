# Backend Architecture — In-Depth Documentation

## Table of Contents

1. [Problem Perception & Decomposition](#1-problem-perception--decomposition)
2. [Why Rails API Mode?](#2-why-rails-api-mode)
3. [High-Level Architecture Diagram](#3-high-level-architecture-diagram)
4. [MVC Breakdown](#4-mvc-breakdown)
5. [File-by-File Deep Dive](#5-file-by-file-deep-dive)
   - [Gemfile](#51-gemfile)
   - [Database Migrations](#52-database-migrations)
   - [Models (the M in MVC)](#53-models-the-m-in-mvc)
   - [Controllers (the C in MVC)](#54-controllers-the-c-in-mvc)
   - [Service Objects](#55-service-objects)
   - [Routing](#56-routing)
   - [Configuration Files](#57-configuration-files)
   - [Rake Tasks](#58-rake-tasks)
6. [Rails Concepts Used](#6-rails-concepts-used)
7. [Request Lifecycle Walkthrough](#7-request-lifecycle-walkthrough)
8. [Business Logic Decisions](#8-business-logic-decisions)
9. [Security Considerations](#9-security-considerations)

---

## 1. Problem Perception & Decomposition

### The Original Problem

The frontend was a **client-side-only** React Todo app that stored everything in `localStorage`. The user asked for:

1. **Authentication** — Login/Signup pages with JWT (30-day token)
2. **Persistent storage** — Tasks stored in a database, organized by date
3. **Calendar view** — Users pick a date to view/add tasks
4. **Auto-move logic** — Unfinished tasks at end of day move to the next day
5. **Weekend skipping** — If next day is Saturday, move to Monday
6. **Explicit move** — A button to manually push a task to the next business day

### How I Decomposed It

I broke this into **two domains**:

| Domain | Responsibility |
|--------|---------------|
| **Authentication** | User registration, login, session management via JWT |
| **Task Management** | CRUD operations on tasks, date-based organization, auto-move logic |

Each domain maps to a **model** + **controller** pair in Rails:

```
Authentication → User model  + AuthController
Task Management → Task model + TasksController
```

The cross-cutting concern (JWT encoding/decoding) was extracted into a **Service Object** (`JwtService`) to keep controllers thin.

### Why Two Tables?

```
users             tasks
┌──────────┐      ┌───────────────┐
│ id       │──┐   │ id            │
│ name     │  │   │ user_id (FK)  │←── belongs_to :user
│ email    │  └──→│ title         │
│ password │      │ completed     │
│ _digest  │      │ scheduled_date│
└──────────┘      └───────────────┘
```

- **users** — Stores credentials. `password_digest` holds the bcrypt hash (never plain text).
- **tasks** — Each task belongs to a user. `scheduled_date` is the key field — it's what makes the calendar view work. Tasks are queried by `(user_id, scheduled_date)`.

---

## 2. Why Rails API Mode?

```bash
rails new backend --api
```

The `--api` flag creates a **slimmed-down Rails** application:

| What's included | What's excluded |
|----------------|-----------------|
| ActiveRecord (ORM) | Views/Templates (ERB) |
| ActionController::API | Asset Pipeline |
| Routing DSL | Cookie-based sessions |
| Middleware stack (trimmed) | CSRF protection (not needed for API) |
| ActiveModel validations | Browser-specific middleware |

Since the React frontend is a completely separate app (runs on port 3000), the backend only needs to serve **JSON responses**. Rails API mode gives us everything we need without the overhead of a full-stack Rails app.

**ActionController::API vs ActionController::Base:**
```ruby
# Standard Rails controller (full-stack)
class ApplicationController < ActionController::Base  # includes views, CSRF, cookies, sessions

# API-only controller (what we use)
class ApplicationController < ActionController::API   # JSON responses only, lighter middleware
```

---

## 3. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (:3000)                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐ │
│  │LoginPage │  │SignupPage│  │  TodoApp   │  │ Calendar  │ │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └─────┬─────┘ │
│       │              │              │               │        │
│       └──────────────┴──────┬───────┴───────────────┘        │
│                             │                                 │
│                    ┌────────┴────────┐                        │
│                    │   api.js        │  (Axios + JWT Header)  │
│                    │   (API Client)  │                        │
│                    └────────┬────────┘                        │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTP (JSON)
                              │ Authorization: Bearer <token>
┌─────────────────────────────┼────────────────────────────────┐
│              Rails API Backend (:3001)                        │
│                             │                                 │
│  ┌──────────────────────────┴──────────────────────────────┐ │
│  │              Rack Middleware Stack                        │ │
│  │  ┌─────────┐  ┌──────────────┐  ┌───────────────────┐  │ │
│  │  │Rack::Cors│  │HostAuthorize │  │  Other Middleware  │  │ │
│  │  └─────────┘  └──────────────┘  └───────────────────┘  │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                 │
│  ┌──────────────────────────┴──────────────────────────────┐ │
│  │                     Router                               │ │
│  │  POST /api/v1/signup  → AuthController#signup            │ │
│  │  POST /api/v1/login   → AuthController#login             │ │
│  │  GET  /api/v1/me      → AuthController#me                │ │
│  │  GET  /api/v1/tasks   → TasksController#index            │ │
│  │  POST /api/v1/tasks   → TasksController#create           │ │
│  │  PATCH /api/v1/tasks/:id → TasksController#update        │ │
│  │  ...etc                                                  │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                 │
│  ┌─────────────┐    ┌──────┴──────┐    ┌──────────────────┐ │
│  │             │    │             │    │                  │ │
│  │  Models     │◄───│ Controllers │───►│  Services        │ │
│  │  (User,Task)│    │ (Auth,Tasks)│    │  (JwtService)    │ │
│  │             │    │             │    │                  │ │
│  └──────┬──────┘    └─────────────┘    └──────────────────┘ │
│         │                                                    │
│  ┌──────┴──────┐                                            │
│  │  SQLite DB  │                                            │
│  │  (dev mode) │                                            │
│  └─────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. MVC Breakdown

### What is MVC?

**Model-View-Controller** is a design pattern that separates an application into three concerns:

| Component | Role | In Our App |
|-----------|------|-----------|
| **Model** | Business logic, data validation, database interaction | `User`, `Task` — define validations, associations, scopes, and the auto-move/business-day logic |
| **View** | Presentation layer | In an API app, this is the **JSON response** (no HTML templates). We render JSON directly from controllers |
| **Controller** | Receives requests, orchestrates models, returns responses | `AuthController` handles login/signup; `TasksController` handles CRUD and move operations |

### MVC Flow in Our App

```
Request: POST /api/v1/tasks { title: "Buy milk", scheduled_date: "2026-04-01" }

1. ROUTER    → maps URL to TasksController#create
2. CONTROLLER → calls before_action (authenticate_user!)
              → extracts params
              → asks MODEL to create a task
3. MODEL     → validates title presence, scheduled_date presence
              → writes to SQLite database
              → returns saved Task object
4. CONTROLLER → serializes Task into JSON (the "view")
              → sends HTTP 201 Created response
```

### Where Does Each MVC Piece Live?

```
backend/
├── app/
│   ├── models/           ← M (Model)
│   │   ├── user.rb
│   │   └── task.rb
│   ├── controllers/      ← C (Controller)
│   │   ├── application_controller.rb
│   │   └── api/v1/
│   │       ├── auth_controller.rb
│   │       └── tasks_controller.rb
│   └── services/         ← Not part of MVC; extracted logic
│       └── jwt_service.rb
├── config/
│   ├── routes.rb         ← Routes map URLs → Controllers
│   └── initializers/
│       └── cors.rb       ← Middleware config
├── db/
│   └── migrate/          ← Schema definitions
└── lib/
    └── tasks/
        └── move_overdue_tasks.rake  ← Background job
```

---

## 5. File-by-File Deep Dive

### 5.1 Gemfile

**Path:** `backend/Gemfile`

The Gemfile declares all Ruby dependencies (like `package.json` for Node).

```ruby
gem "bcrypt", "~> 3.1"     # Password hashing
gem "jwt", "~> 3.1"        # JSON Web Token encoding/decoding
gem "rack-cors", "~> 3.0"  # Cross-Origin Resource Sharing
```

**Why these gems?**

| Gem | Purpose | Rails Concept |
|-----|---------|---------------|
| `bcrypt` | Provides `has_secure_password` — hashes passwords using bcrypt algorithm. Never store plaintext passwords | **ActiveModel::SecurePassword** |
| `jwt` | Encodes/decodes JWT tokens. We chose JWT over session cookies because the frontend is a separate SPA | **Service Object pattern** |
| `rack-cors` | Allows the React app on `:3000` to call the Rails API on `:3001`. Browsers block cross-origin requests by default (Same-Origin Policy) | **Rack Middleware** |

**Rails Concepts:** Bundler, Gemfile, `bundle install`

---

### 5.2 Database Migrations

**Paths:**
- `db/migrate/20260401175304_create_users.rb`
- `db/migrate/20260401175312_create_tasks.rb`

#### Logic Behind Schema Design

**Users table:**
```ruby
create_table :users do |t|
  t.string :email
  t.string :password_digest  # bcrypt hash stored here
  t.string :name
  t.timestamps               # created_at, updated_at
end
add_index :users, :email, unique: true  # fast lookup + uniqueness at DB level
```

- `password_digest`: Named exactly this because `has_secure_password` expects it. bcrypt stores `$2a$12$...` hashes here.
- `unique: true` index on email: Enforced at the **database level** (not just model validation) to prevent race conditions where two requests create the same email simultaneously.
- `t.timestamps`: Rails convention — automatically manages `created_at` and `updated_at` columns.

**Tasks table:**
```ruby
create_table :tasks do |t|
  t.references :user, null: false, foreign_key: true  # user_id column + FK constraint
  t.string :title
  t.boolean :completed
  t.date :scheduled_date      # THE key column for calendar feature
  t.timestamps
end
```

- `t.references :user, foreign_key: true`: Creates a `user_id` integer column with a **foreign key constraint** at the database level. If you try to create a task for a non-existent user, the DB itself rejects it.
- `scheduled_date` is a `date` type (not `datetime`): We only care about the day, not the time. This makes date comparisons cleaner and avoids timezone issues.
- `completed` is a boolean: Simple true/false toggle.

**Rails Concepts:** Migrations, `rails db:migrate`, `t.references`, `foreign_key`, `add_index`, `t.timestamps`

---

### 5.3 Models (the M in MVC)

#### User Model — `app/models/user.rb`

```ruby
class User < ApplicationRecord
  has_secure_password
  has_many :tasks, dependent: :destroy
  validates :email, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true
  validates :password, length: { minimum: 6 }, if: -> { new_record? || !password.nil? }
  before_save { self.email = email.downcase }
end
```

**Line-by-line logic:**

| Code | What It Does | Why |
|------|-------------|-----|
| `has_secure_password` | Adds `password` and `password_confirmation` virtual attributes, `authenticate(pwd)` method, and auto-hashes to `password_digest` | Core Rails feature from `bcrypt` gem. We never store passwords in plain text |
| `has_many :tasks, dependent: :destroy` | One-to-many association. When a user is deleted, all their tasks are deleted too | Prevents orphaned task records in the database |
| `validates :email, uniqueness: { case_sensitive: false }` | `Test@email.com` and `test@email.com` are treated as the same email | Real-world email addresses are case-insensitive |
| `format: { with: URI::MailTo::EMAIL_REGEXP }` | Uses Ruby's built-in RFC-compliant email regex | Better than writing a custom regex that might miss edge cases |
| `validates :password, length: { minimum: 6 }, if: -> { ... }` | Password must be 6+ chars, but **only on create or when password is being changed** | Without the `if` condition, users couldn't update their name without providing a password |
| `before_save { self.email = email.downcase }` | Normalizes email to lowercase before every save | Ensures consistent storage; `John@Email.com` becomes `john@email.com` |

**Rails Concepts:** `has_secure_password`, `has_many`, `dependent: :destroy`, `validates` (presence, uniqueness, format, length), `before_save` callback, `ApplicationRecord` inheritance, Active Record pattern

#### Task Model — `app/models/task.rb`

```ruby
class Task < ApplicationRecord
  belongs_to :user
  validates :title, presence: true
  validates :scheduled_date, presence: true

  scope :for_date, ->(date) { where(scheduled_date: date) }
  scope :incomplete, -> { where(completed: false) }
  scope :overdue, ->(date) { where(completed: false).where("scheduled_date < ?", date) }
```

**Scopes explained:**

Scopes are **reusable query fragments**. They return ActiveRecord::Relations (chainable).

```ruby
# Instead of writing this everywhere:
user.tasks.where(scheduled_date: date).where(completed: false)

# We write:
user.tasks.for_date(date).incomplete
```

| Scope | SQL Generated | Used Where |
|-------|---------------|-----------|
| `for_date(date)` | `WHERE scheduled_date = '2026-04-01'` | TasksController#index — fetching tasks for a calendar date |
| `incomplete` | `WHERE completed = false` | Internal use, composability |
| `overdue(date)` | `WHERE completed = false AND scheduled_date < '2026-04-01'` | Auto-move logic — finds all tasks that should have been done by now |

**Business Day Logic:**

```ruby
def self.next_business_day(from_date)
  next_day = from_date + 1.day
  next_day += 1.day while next_day.wday == 6 || next_day.wday == 0
  next_day
end
```

This is a **class method** (not a scope) because it computes a date, not a query.

- `from_date + 1.day`: Uses Rails' `ActiveSupport::Duration` — adds exactly one day.
- `.wday`: Ruby's built-in day-of-week (0 = Sunday, 6 = Saturday).
- The `while` loop keeps skipping until we land on a weekday.
- Example: Friday (wday=5) → +1 day → Saturday (wday=6) → +1 → Sunday (wday=0) → +1 → Monday (wday=1) ✓

**Auto-move method:**

```ruby
def self.auto_move_overdue_tasks(user, today = Date.current)
  target_date = next_business_day(today - 1.day)
  target_date = today if target_date < today
  target_date = next_business_day(target_date - 1.day) if target_date.wday == 6 || target_date.wday == 0

  overdue_tasks = user.tasks.overdue(today)
  overdue_tasks.update_all(scheduled_date: target_date) if overdue_tasks.any?
  overdue_tasks.count
end
```

- Called **every time a user fetches their tasks** (in `TasksController#index`). This is a "lazy" approach — instead of a cron job running at midnight, we check when the user actually opens the app.
- `update_all`: A single SQL `UPDATE` statement — much faster than loading each record, changing it, and saving individually.
- Why `if overdue_tasks.any?`? Avoids running an unnecessary UPDATE query when there's nothing to move.

**Instance method:**

```ruby
def move_to_next_business_day
  new_date = self.class.next_business_day(scheduled_date)
  update(scheduled_date: new_date)
end
```

This is on a **single task instance** — used when the user clicks the "move to next day" button. `self.class` calls the class method on `Task` to compute the next business day.

**Rails Concepts:** `belongs_to`, `scope`, `where`, lambda syntax `->`, `update_all` (batch update), `update` (single record), `Date.current` (timezone-aware), ActiveSupport duration (`1.day`), class methods vs instance methods

---

### 5.4 Controllers (the C in MVC)

#### ApplicationController — `app/controllers/application_controller.rb`

```ruby
class ApplicationController < ActionController::API
  before_action :authenticate_user!
```

This is the **base controller** that all other controllers inherit from. The `before_action` runs `authenticate_user!` before **every** action in every controller.

**Authentication flow:**

```ruby
def authenticate_user!
  token = extract_token                          # 1. Get token from header
  if token
    decoded = JwtService.decode(token)           # 2. Decode & verify JWT
    if decoded
      @current_user = User.find_by(id: decoded[:user_id])  # 3. Load user
    end
  end
  render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user  # 4. Reject if failed
end

def extract_token
  header = request.headers["Authorization"]      # "Bearer eyJhbG..."
  header.split(" ").last if header.present? && header.start_with?("Bearer ")
end
```

1. Reads `Authorization: Bearer <token>` from the request header
2. Passes token to `JwtService.decode` which verifies signature and expiration
3. If valid, loads the User from database
4. If anything fails, returns 401 Unauthorized

**Why `before_action` on the base controller?**

Every endpoint requires authentication **by default**. Controllers that have public endpoints (like login/signup) explicitly skip it:

```ruby
skip_before_action :authenticate_user!, only: [:signup, :login]
```

This is the **Secure by Default** principle — it's safer to require auth everywhere and opt-out than to require developers to remember to add it.

**Rails Concepts:** `ActionController::API`, `before_action`, `skip_before_action`, `request.headers`, `render json:`, HTTP status codes, instance variables (`@current_user`)

#### AuthController — `app/controllers/api/v1/auth_controller.rb`

```ruby
module Api
  module V1
    class AuthController < ApplicationController
```

**Why the nested modules?**

The URL is `/api/v1/signup`. Rails' namespace routing convention maps:
- `/api` → `module Api`
- `/v1` → `module V1`
- `/signup` → `AuthController#signup`

The file lives at `app/controllers/api/v1/auth_controller.rb` — Rails auto-loads based on this exact path.

**Signup action:**

```ruby
def signup
  user = User.new(signup_params)            # Build (don't save yet)
  if user.save                               # Attempt save — triggers validations
    token = JwtService.encode(user_id: user.id)  # Generate JWT
    render json: { message: "...", user: user_response(user), token: token }, status: :created
  else
    render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
  end
end
```

- `User.new` vs `User.create`: `new` builds in memory; `save` writes to DB. This split lets us handle validation failures gracefully.
- `user.errors.full_messages`: Returns human-readable strings like `["Email has already been taken", "Password is too short"]`.
- HTTP 201 Created: Correct RESTful status for resource creation.
- HTTP 422 Unprocessable Entity: Client sent valid JSON but the data is logically wrong.

**Login action:**

```ruby
def login
  user = User.find_by(email: params[:email]&.downcase)
  if user&.authenticate(params[:password])
    # success...
  else
    render json: { error: "Invalid email or password" }, status: :unauthorized
  end
end
```

- `find_by` returns `nil` (not an exception) if no user found.
- `&.authenticate`: Safe navigation operator — if `user` is nil, returns nil instead of raising NoMethodError.
- `authenticate(password)`: Provided by `has_secure_password`. Compares bcrypt hash. Returns the user object on success, `false` on failure.
- **Security note**: We say "Invalid email or password" (not "email not found" or "wrong password") to prevent user enumeration attacks.

**Strong Parameters:**

```ruby
def signup_params
  params.permit(:name, :email, :password, :password_confirmation)
end
```

This is Rails' **mass assignment protection**. Without `permit`, a malicious user could send `{ admin: true }` and potentially escalate privileges. `permit` whitelists only the fields we accept.

**Rails Concepts:** Namespaced controllers, `skip_before_action`, `find_by`, safe navigation (`&.`), `has_secure_password#authenticate`, Strong Parameters (`params.permit`), HTTP status codes (201, 401, 422), `errors.full_messages`

#### TasksController — `app/controllers/api/v1/tasks_controller.rb`

```ruby
before_action :set_task, only: [:show, :update, :destroy, :move_to_next_day]
```

**Before action with `:only`** — `set_task` runs only for actions that need a specific task (not for `index`, `create`, or `dates_with_tasks`).

```ruby
def set_task
  @task = current_user.tasks.find(params[:id])
rescue ActiveRecord::RecordNotFound
  render json: { error: "Task not found" }, status: :not_found
end
```

**Critical security pattern**: `current_user.tasks.find(id)` — searches **only within the current user's tasks**. A user cannot access another user's tasks even if they know the ID. This is called **scoped queries** or **authorization through association**.

```ruby
# INSECURE (never do this):
@task = Task.find(params[:id])  # Any user can access any task!

# SECURE (what we do):
@task = current_user.tasks.find(params[:id])  # Only finds tasks owned by current_user
```

**Index with auto-move:**

```ruby
def index
  date = params[:date] ? Date.parse(params[:date]) : Date.current
  Task.auto_move_overdue_tasks(current_user, Date.current)  # Housekeeping!
  tasks = current_user.tasks.for_date(date).order(created_at: :asc)
  render json: { tasks: tasks.map { |t| task_response(t) }, date: date.to_s }
end
```

Every time the user opens the app, we clean up overdue tasks first. This guarantees the user never sees stale overdue tasks on past dates.

**dates_with_tasks (calendar dots):**

```ruby
def dates_with_tasks
  year = (params[:year] || Date.current.year).to_i
  month = (params[:month] || Date.current.month).to_i
  start_date = Date.new(year, month, 1)
  end_date = start_date.end_of_month

  dates = current_user.tasks
                      .where(scheduled_date: start_date..end_date)
                      .group(:scheduled_date)
                      .count

  render json: { dates: dates }
end
```

- `start_date..end_date`: Ruby Range — generates SQL `BETWEEN`.
- `.group(:scheduled_date).count`: Single SQL query using `GROUP BY` — returns a hash like `{ "2026-04-01" => 3, "2026-04-05" => 1 }`. Much more efficient than loading all tasks and counting in Ruby.

**Private response serializer:**

```ruby
def task_response(task)
  { id: task.id, title: task.title, completed: task.completed,
    scheduled_date: task.scheduled_date.to_s, ... }
end
```

This manual serialization acts as our **View layer** in the API. We explicitly choose which fields to expose. `password_digest` or `user_id` are intentionally excluded — the client doesn't need them.

**Rails Concepts:** `before_action` with `only:`, `rescue` for error handling, scoped queries for authorization, `Date.parse`, `end_of_month`, Range queries, `group().count` (SQL aggregation), `order()`, `update` vs `update_all`, `destroy`, RESTful actions (index, show, create, update, destroy), custom member/collection routes

---

### 5.5 Service Objects

#### JwtService — `app/services/jwt_service.rb`

```ruby
class JwtService
  SECRET_KEY = Rails.application.secret_key_base
  EXPIRATION = 30.days

  def self.encode(payload)
    payload[:exp] = EXPIRATION.from_now.to_i   # Unix timestamp 30 days from now
    payload[:iat] = Time.current.to_i          # "Issued At" timestamp
    JWT.encode(payload, SECRET_KEY, "HS256")
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY, true, { algorithm: "HS256" })
    HashWithIndifferentAccess.new(decoded.first)
  rescue JWT::DecodeError, JWT::ExpiredSignature => e
    nil
  end
end
```

**Why a Service Object?**

This is **not** a model (it doesn't represent a database table) and **not** a controller concern (it's reused across controllers). Service Objects encapsulate a **single responsibility** that doesn't fit into M, V, or C.

Rails auto-loads from `app/services/` because of **Zeitwerk** (Rails' autoloader) — any class in `app/` subdirectories is auto-loaded by convention.

**Token anatomy:**

A JWT has three parts: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiJ9.           ← Header: { alg: "HS256" }
eyJ1c2VyX2lkIjoxLCJleHAiOi...   ← Payload: { user_id: 1, exp: 1777658435, iat: 1775066435 }
MQvAmyRjQ2gMwaj4FThTFTers7...   ← Signature: HMAC-SHA256(header + payload, SECRET_KEY)
```

| Field | Purpose |
|-------|---------|
| `user_id` | Identifies the user — this is what `authenticate_user!` reads |
| `exp` | Expiration — 30 days from creation. The `jwt` gem auto-rejects expired tokens |
| `iat` | "Issued At" — for auditing purposes |

**Why HS256?** HMAC-SHA256 is a symmetric algorithm — the same secret key signs and verifies. Simple and appropriate for a single-server setup.

**Why `rescue` returns `nil`?** On any decode failure (bad token, expired, tampered), we return `nil`. The controller then fails to find a user and returns 401. No exceptions leak to the client.

**Rails Concepts:** Service Object pattern, `Rails.application.secret_key_base`, Zeitwerk autoloading, `ActiveSupport::Duration` (30.days), `Time.current` (timezone-aware), `HashWithIndifferentAccess`

---

### 5.6 Routing

#### `config/routes.rb`

```ruby
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post "signup", to: "auth#signup"
      post "login",  to: "auth#login"
      get  "me",     to: "auth#me"

      resources :tasks, only: [:index, :create, :show, :update, :destroy] do
        member do
          patch :move_to_next_day
        end
        collection do
          get :dates_with_tasks
        end
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
```

**Namespace:**

`namespace :api do namespace :v1 do` generates URLs prefixed with `/api/v1/` and expects controllers in `Api::V1::` module. This is **API versioning** — if we ever need breaking changes, we create `v2` without breaking existing clients.

**`resources :tasks`:**

This single line generates 5 RESTful routes:

| HTTP Method | URL | Controller#Action |
|-------------|-----|-------------------|
| GET | /api/v1/tasks | tasks#index |
| POST | /api/v1/tasks | tasks#create |
| GET | /api/v1/tasks/:id | tasks#show |
| PATCH | /api/v1/tasks/:id | tasks#update |
| DELETE | /api/v1/tasks/:id | tasks#destroy |

`only: [...]` limits which routes are generated. We don't need `new` or `edit` (those are for HTML form pages).

**`member` vs `collection`:**

```ruby
member do
  patch :move_to_next_day    # /api/v1/tasks/:id/move_to_next_day (acts on ONE task)
end
collection do
  get :dates_with_tasks      # /api/v1/tasks/dates_with_tasks (acts on the collection)
end
```

- **Member route**: Nested under `/:id` — operates on a specific task
- **Collection route**: No `/:id` — operates on the tasks collection as a whole

**Custom auth routes:**

```ruby
post "signup", to: "auth#signup"
```

Auth routes are **not** RESTful resources (there's no "session" model we CRUD). They're custom routes mapping directly to controller actions.

**Rails Concepts:** `namespace`, `resources`, `only:`, `member`, `collection`, RESTful routing, route helpers, API versioning convention, `to:` option for custom routes

---

### 5.7 Configuration Files

#### CORS — `config/initializers/cors.rb`

```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:3000"
    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end
```

**Why is CORS needed?**

Browsers enforce the **Same-Origin Policy**: JavaScript on `localhost:3000` cannot make HTTP requests to `localhost:3001` by default. CORS headers tell the browser "it's okay, I trust this origin."

- `insert_before 0`: Places CORS middleware at the **very top** of the stack. This is critical — CORS preflight (OPTIONS) requests must be handled before any authentication middleware rejects them.
- `origins "http://localhost:3000"`: Only the React dev server is allowed. In production, this would be your domain.
- `credentials: true`: Allows cookies/auth headers in cross-origin requests.

**Rails Concepts:** Rack Middleware stack, `config.middleware.insert_before`, initializers (files in `config/initializers/` run once at boot)

#### Puma — `config/puma.rb`

```ruby
port ENV.fetch("PORT", 3001)
```

Changed default from 3000 to **3001** so it doesn't conflict with the React dev server on 3000.

**Rails Concepts:** Puma web server configuration, `ENV.fetch` with default values

---

### 5.8 Rake Tasks

#### `lib/tasks/move_overdue_tasks.rake`

```ruby
namespace :tasks do
  desc "Move overdue incomplete tasks to the next business day for all users"
  task move_overdue: :environment do
    today = Date.current
    User.find_each do |user|
      count = Task.auto_move_overdue_tasks(user, today)
      puts "Moved #{count} overdue tasks for user #{user.email}" if count > 0
    end
  end
end
```

**Purpose:** A scheduled job (run via cron) that moves overdue tasks for ALL users at midnight.

- `task move_overdue: :environment`: The `:environment` dependency loads the full Rails environment (models, database connection, etc.).
- `User.find_each`: Loads users in **batches of 1000** (memory-efficient). Unlike `.each` which loads all records at once, `find_each` uses `LIMIT`/`OFFSET`.
- Run with: `rails tasks:move_overdue`

**Note:** This is a safety net. The primary auto-move happens in `TasksController#index` when users fetch tasks. The rake task handles cases where users don't open the app.

**Rails Concepts:** Rake tasks, `namespace`, `desc`, `:environment` dependency, `find_each` (batch loading)

---

## 6. Rails Concepts Used

### Complete Reference Table

| Concept | Where Used | Description |
|---------|-----------|-------------|
| **API Mode** | `rails new --api` | Lightweight Rails without views/assets |
| **ActiveRecord** | All models | ORM — maps Ruby classes to database tables |
| **Migrations** | `db/migrate/` | Version-controlled schema changes |
| **Validations** | User, Task models | `validates :field, presence/uniqueness/format/length` |
| **Associations** | `has_many`, `belongs_to` | Define relationships between models |
| **Callbacks** | `before_save` (User) | Hooks into object lifecycle |
| **Scopes** | Task model | Reusable, chainable query fragments |
| **has_secure_password** | User model | bcrypt-based password hashing |
| **Strong Parameters** | All controllers | Whitelist allowed params to prevent mass assignment |
| **before_action** | ApplicationController, TasksController | Run code before controller actions |
| **skip_before_action** | AuthController | Opt out of inherited before_actions |
| **Namespaced Controllers** | `Api::V1::` | Organize controllers matching URL structure |
| **RESTful Resources** | `resources :tasks` | Convention-based CRUD routing |
| **Member/Collection Routes** | routes.rb | Custom routes on single items (member) or the whole resource (collection) |
| **Rack Middleware** | CORS initializer | Request/response pipeline processing |
| **Initializers** | `config/initializers/` | One-time boot configuration |
| **Zeitwerk Autoloading** | `app/services/` | Auto-discovers and loads classes by convention |
| **Service Objects** | JwtService | Extract non-MVC logic into standalone classes |
| **Rake Tasks** | `lib/tasks/` | Custom CLI commands for maintenance |
| **find_each** | Rake task | Memory-efficient batch iteration |
| **update_all** | Task model | Batch SQL UPDATE without loading records |
| **group/count** | TasksController | SQL aggregation for efficient counting |
| **HashWithIndifferentAccess** | JwtService | Access hash keys as strings or symbols |
| **ActiveSupport::Duration** | JwtService | `30.days`, `1.day` — human-readable time math |
| **Date.current** | Task model | Timezone-aware current date |
| **rescue** | TasksController, JwtService | Exception handling for graceful error responses |
| **dependent: :destroy** | User model | Cascade-delete associated records |
| **foreign_key** | Tasks migration | Database-level referential integrity |
| **Unique Index** | Users migration | Database-level uniqueness constraint |

---

## 7. Request Lifecycle Walkthrough

### Example: User creates a task

```
1. Frontend sends:
   POST http://localhost:3001/api/v1/tasks
   Headers: { Authorization: "Bearer eyJ...", Content-Type: "application/json" }
   Body: { "title": "Buy groceries", "scheduled_date": "2026-04-01" }

2. Rack Middleware Stack processes the request:
   → Rack::Cors checks origin (localhost:3000 ✓)
   → Rack::Runtime adds X-Runtime header
   → ActionDispatch::RemoteIp extracts client IP
   → ActionDispatch::RequestId generates unique request ID

3. Router matches: POST /api/v1/tasks → Api::V1::TasksController#create

4. Before Actions run (in order):
   a) ApplicationController#authenticate_user!
      → Extracts "eyJ..." from Authorization header
      → JwtService.decode verifies signature + expiration
      → Loads User from DB: SELECT * FROM users WHERE id = 1
      → Sets @current_user

5. TasksController#create runs:
   → Reads params: title="Buy groceries", scheduled_date="2026-04-01"
   → Strong Parameters: params.permit(:title, :completed, :scheduled_date)
   → Builds task: current_user.tasks.new(title: "Buy groceries", scheduled_date: "2026-04-01", completed: false)
   → Task validations run (title present ✓, scheduled_date present ✓)
   → SQL: INSERT INTO tasks (user_id, title, completed, scheduled_date, created_at, updated_at) VALUES (1, 'Buy groceries', false, '2026-04-01', ...)
   → Returns JSON response with status 201

6. Response travels back through middleware stack
   → Rack::Cors adds CORS headers (Access-Control-Allow-Origin: http://localhost:3000)
   → Puma sends response to client

7. Frontend receives:
   { "task": { "id": 5, "title": "Buy groceries", "completed": false, "scheduled_date": "2026-04-01", ... } }
```

---

## 8. Business Logic Decisions

### Decision 1: Where to put auto-move logic?

**Options considered:**
- **Cron job only** — Runs at midnight. Problem: What if user opens app at 11pm and sees stale tasks?
- **Controller only** — Check on every request. Problem: If user doesn't open app for 3 days, nothing moves.
- **Both (chosen)** — Controller checks on every `index` request (user-facing), Rake task runs as a safety net for scheduled execution.

### Decision 2: How to handle weekend skipping?

**The rule:** "If the next day is Saturday, move to Monday."

The implementation generalizes this: find next day, if it's Saturday OR Sunday, keep incrementing. This handles edge cases like:
- Friday task → next business day = Monday
- Saturday task (if one somehow exists) → Monday
- Sunday task → Monday

### Decision 3: JWT vs Session-based auth?

**JWT chosen because:**
- Frontend is a **separate SPA** (not server-rendered by Rails)
- Stateless — no server-side session storage needed
- 30-day expiry is straightforward with JWT's `exp` claim
- Works well with the `Authorization: Bearer` pattern that API clients expect

### Decision 4: Scoped queries for authorization

Instead of a separate authorization library (like Pundit or CanCanCan), we use **scoped queries**:

```ruby
# This pattern inherently prevents unauthorized access:
current_user.tasks.find(params[:id])
```

For a two-model app (User + Task), this is simpler and equally secure. A full authorization library would be warranted with more complex permission models.

---

## 9. Security Considerations

| Threat | Mitigation |
|--------|-----------|
| **SQL Injection** | ActiveRecord parameterizes all queries automatically. `where("scheduled_date < ?", date)` uses prepared statements |
| **Mass Assignment** | Strong Parameters (`params.permit`) whitelist fields. Can't inject `admin: true` |
| **Password Storage** | bcrypt via `has_secure_password`. Passwords are salted + hashed |
| **Token Expiry** | JWT expires after 30 days. `exp` claim is verified automatically by the `jwt` gem |
| **Token Tampering** | HMAC-SHA256 signature. Changing any byte of the payload invalidates the signature |
| **Cross-Origin Attacks** | CORS whitelist only `localhost:3000`. Other origins are blocked |
| **User Enumeration** | Login returns "Invalid email or password" — doesn't reveal if email exists |
| **Unauthorized Access** | Scoped queries (`current_user.tasks`) prevent accessing other users' data |
| **Foreign Key Integrity** | Database-level FK constraints prevent orphaned records |
| **Email Uniqueness Race Condition** | Database unique index prevents duplicates even under concurrent requests |
