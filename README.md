# QuickNotes System Design & API Client

![Project 2 Capstone](https://img.shields.io/badge/Project-Web%20Foundations%20Capstone-blue)
![API Client](https://img.shields.io/badge/Front--End-Vanilla%20JS%20%7C%20CSS%20%7C%20HTML5-brightgreen)
![Architecture](https://img.shields.io/badge/Scale-1%20Million%20Users-orange)

An end-to-end system design and front-end API integration proving how **QuickNotes** transitions from an isolated browser tool into a highly available, scalable cloud service supporting **1 million registered users**.

---

## 1. Project Overview

As the lead engineer for QuickNotes, this project delivers two core pillars:
1. **Interactive API Client**: A lightweight, responsive front-end client written in semantic HTML5, modern vanilla CSS, and asynchronous JavaScript. It connects to a RESTful service (practiced with the JSONPlaceholder API) to prove live **GET**, **POST**, and **DELETE** HTTP operations with validation, disabled-button states, and complete UI state handling (loading, success, error, and empty states).
2. **Production System Design**: Three comprehensive technical documents in the [`docs/`](docs/) directory providing the complete backend architectural blueprint for scaling QuickNotes to 1 million users.

---

## 2. Design Documentation Links

The architecture and engineering specifications are organized in the [`docs/`](docs/) folder:

* 📄 **[REST API Design Specification (`docs/api-design.md`)](docs/api-design.md)**  
  Comprehensive RESTful API blueprint covering 7 production endpoints, request/response JSON schemas, pagination, and error-handling envelopes for status codes `400`, `401`, `403`, `404`, and `500`.

* 🗄️ **[Relational Data Model (`docs/data-model.md`)](docs/data-model.md)**  
  Normalized database schema for `users`, `notes`, `tags`, and `note_tags`. Includes entity-relationship breakdowns (1:N and M:N), production `CREATE TABLE` DDL statements, multi-table `JOIN` SQL queries, B-tree indexing strategies, and relational database justification.

* 🏗️ **[System Architecture Plan (`docs/architecture.md`)](docs/architecture.md)**  
  Large-scale system design for 1 million registered users. Contains capacity estimations (reads, writes, and annual storage growth), a full-system ASCII architecture diagram, component-by-component problem justifications, step-by-step `GET` and `POST` request flows, trade-off analyses, and Single Point of Failure (SPOF) mitigation strategies.

---

## 3. How to Run the API Client Locally

The API client runs directly in any modern web browser without external package dependencies.

### Option A: Using Python (Recommended)
Open your terminal in the project root directory and run:
```bash
# Python 3
python -m http.server 3000
```
Then navigate to:
```
http://localhost:3000
```

### Option B: Using Node.js
```bash
npx serve .
```

### Option C: VS Code Live Server
Right-click on `index.html` inside VS Code / Antigravity IDE and select **"Open with Live Server"**.

---

## 4. API Client Features & Verification

* **Load Notes (GET)**: Click **"Load notes"** to fetch 10 items via `GET https://jsonplaceholder.typicode.com/posts?_limit=10`. The button is disabled and displays a `"Loading notes..."` indicator during transit, followed by a green success notification (`"Loaded 10 notes from the server."`).
* **Create Note (POST)**: Form validation strictly enforces a required title with a 100-character ceiling. Submitting dispatches `POST https://jsonplaceholder.typicode.com/posts`, disables the submit button during submission, prepends the new note card immediately to the top of the list, clears input fields, and displays the HTTP status and generated ID (`"Note created (status 201, id 101)."`).
* **Delete Note (DELETE)**: Every note card features an individual **Delete** button that issues `DELETE /posts/{id}`. Upon success, the card is removed from the DOM, and if no notes remain, the user is presented with a friendly empty state.
* **XSS Protection**: All user-generated text is rendered strictly using `document.createElement()` and `element.textContent`, preventing any script injection vulnerabilities.

---

## 5. What I Learned

1. **Mastering Asynchronous JavaScript & RESTful HTTP Lifecycles**:
   Implementing a centralized `request()` helper with `fetch`, `async / await`, and `try / catch / finally` reinforced the importance of explicit HTTP state transitions. Handling network latency through disabled button states and providing clear visual cues for loading, success, error, and empty states creates a robust, user-centric interface.

2. **Relational Database Normalization & Indexing Trade-offs**:
   Designing the schema across `users`, `notes`, `tags`, and `note_tags` demonstrated how junction tables decompose many-to-many relationships while preserving First Normal Form (1NF). Furthermore, analyzing query execution paths highlighted that foreign keys are not automatically indexed by default; adding targeted B-tree indexes (such as `notes(user_id, updated_at DESC)`) is vital to transform linear table scans ($O(N)$) into logarithmic lookups ($O(\log N)$) at scale.

3. **High-Scale System Architecture & Resilience Planning**:
   Calculating concrete capacity numbers for 1 million users (evaluating read-to-write ratios of 10:1 and annual storage demands) showed why production systems separate operational concerns. Placing edge CDNs for media/assets, in-memory Redis caching for hot feeds, database read replicas for query offloading, and asynchronous queues (RabbitMQ/SQS) for background search indexing allows each tier to scale independently while eliminating single points of failure.
