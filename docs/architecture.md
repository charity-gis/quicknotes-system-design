# QuickNotes System Architecture Plan

This document describes the high-level system architecture, capacity estimations, component breakdown, request workflows, and resilience strategies for scaling **QuickNotes** to **1 million registered users**.

---

## 1. System Requirements

### Functional Requirements
1. **Note Creation & Editing**: Users can create, update, and delete notes with a mandatory title (max 100 characters) and optional markdown/text body.
2. **Note Retrieval & Organization**: Users can view a paginated list of their notes, pin important notes to the top, and filter notes by tags.
3. **Full-Text Search**: Users can search across note titles and content with low latency.
4. **Data Isolation & Security**: Each user can access and modify only their own notes; all traffic is authenticated via JWT over HTTPS.

### Non-Functional Requirements
1. **High Availability**: Target 99.95% uptime with zero single points of failure across all architectural layers.
2. **Low Latency**:
   * P95 read response times $< 50\text{ ms}$ for cached feeds and static assets.
   * P95 write response times $< 150\text{ ms}$ for creating and updating notes.
3. **Scalability**: Ability to handle traffic spikes up to 5× average load without service degradation.
4. **Data Durability**: Zero data loss for committed notes (RPO = 0, RTO $< 1\text{ minute}$).

---

## 2. Capacity & Load Estimations (1 Million Users)

### Core Assumptions
* **Total Registered Users**: 1,000,000 (1 million).
* **Daily Active Users (DAU)**: 20% active daily = **200,000 DAU**.
* **Daily Reads per Active User**: 20 feed views / searches per day.
* **Daily Writes per Active User**: 2 note creations or updates per day.
* **Peak Multiplier**: 5× the average traffic rate.
* **Seconds per Day**: $86,400\text{ seconds}$.
* **Average Note Size**: 100 bytes (title) + 1,000 bytes (body) + 150 bytes (metadata & tags) $\approx 1.25\text{ KB}$.

---

### A. Read Traffic Estimates (`GET` requests)
* **Daily Note Reads**:
  $$200,000 \text{ active users} \times 20 \text{ reads/day} = 4,000,000 \text{ reads/day}$$
* **Average Reads per Second**:
  $$\frac{4,000,000 \text{ reads}}{86,400 \text{ seconds}} \approx 46.30 \text{ reads/second} \quad (\approx 46 \text{ RPS})$$
* **Peak Reads per Second (5×)**:
  $$46.30 \times 5 \approx 231.50 \text{ reads/second} \quad (\approx 232 \text{ RPS})$$

---

### B. Write Traffic Estimates (`POST`, `PUT`, `DELETE` requests)
* **Daily Note Writes**:
  $$200,000 \text{ active users} \times 2 \text{ writes/day} = 400,000 \text{ writes/day}$$
* **Average Writes per Second**:
  $$\frac{400,000 \text{ writes}}{86,400 \text{ seconds}} \approx 4.63 \text{ writes/second} \quad (\approx 5 \text{ WPS})$$
* **Peak Writes per Second (5×)**:
  $$4.63 \times 5 \approx 23.15 \text{ writes/second} \quad (\approx 23 \text{ WPS})$$

* **Read-to-Write Ratio**: $10 : 1$ (A typical read-heavy consumer productivity application).

---

### C. Annual Storage Requirements
* **Notes Created per Year**:
  $$400,000 \text{ writes/day} \times 365 \text{ days} = 146,000,000 \text{ note operations/year}$$
  *(Assuming ~50% net new notes after updates and deletes = $73,000,000$ persistent notes/year).*
* **Raw Note Data per Year**:
  $$73,000,000 \times 1.25 \text{ KB} \approx 91,250,000 \text{ KB} \approx 91.25 \text{ GB/year}$$
* **Database Indexes & Audit Logs (~40% overhead)**:
  $$91.25 \text{ GB} \times 0.40 \approx 36.5 \text{ GB/year}$$
* **Total Primary Database Storage Growth per Year**:
  $$\approx 127.75 \text{ GB/year} \quad (\approx 130 \text{ GB/year})$$
  *(Easily managed on modern managed cloud database instances like Amazon RDS PostgreSQL with automated volume expansion).*

---

## 3. High-Level Architecture Diagram

```
                              +--------------------------+
                              |   Client (Web / Mobile)  |
                              +-------------+------------+
                                            |
                                            v
                              +--------------------------+
                              |      Anycast DNS         |
                              |   (e.g., Route 53)       |
                              +-------------+------------+
                                            |
                     +----------------------+----------------------+
                     |                                             |
            Static Assets (HTML/CSS/JS)                     Dynamic API Traffic
                     |                                             |
                     v                                             v
          +--------------------+                        +--------------------+
          |   Edge CDN         |                        |   Load Balancer    |
          |  (Cloudflare /     |                        |  (AWS ALB / NGINX) |
          |   CloudFront)      |                        +---------+----------+
          +--------------------+                                  |
                                                     +------------+------------+
                                                     |                         |
                                                     v                         v
                                            +-----------------+       +-----------------+
                                            |  App Server 1   |       |  App Server 2   |
                                            | (Node.js/Go)    |       | (Node.js/Go)    |
                                            +--------+--------+       +--------+--------+
                                                     |                         |
                           +-------------------------+-------------------------+
                           |                         |                         |
                           v                         v                         v
                   +---------------+         +---------------+         +---------------+
                   | In-Memory     |         | Message Queue |         |  Primary DB   |
                   | Cache (Redis) |         | (RabbitMQ/SQS)|         | (PostgreSQL)  |
                   +---------------+         +-------+-------+         +-------+-------+
                                                     |                         |
                                                     v                    Replication
                                             +---------------+                 |
                                             | Background    |                 v
                                             | Worker Pool   |         +---------------+
                                             | (Search/Async)|         | Read Replica  |
                                             +---------------+         | Database      |
                                                                       +---------------+
```

---

## 4. Component Breakdown (One Sentence per Component)

* **Client (Web / Mobile)**: Presents the user interface, manages client-side form validation, and dispatches authenticated HTTP requests to the backend API.
* **DNS (Domain Name System, e.g., Route 53)**: Resolves the domain `quicknotes.com` into latency-optimized IP addresses and provides geo-routing and health-check failover.
* **CDN (Content Delivery Network, e.g., Cloudflare)**: Caches and delivers static frontend assets (HTML, CSS, JavaScript) from edge PoPs close to users worldwide to minimize origin latency.
* **Load Balancer (e.g., AWS Application Load Balancer / NGINX)**: Distributes incoming HTTPS traffic across application server instances while terminating TLS and health-checking backend nodes.
* **Application Servers (App Server 1 & 2)**: Execute business logic, validate user permissions, verify JWT tokens, and coordinate database queries and cache interactions.
* **In-Memory Cache (Redis)**: Caches pre-rendered user notes lists and session states in RAM to deliver read responses in under 5 milliseconds and shield the database.
* **Primary Database (Master PostgreSQL)**: Serves as the authoritative ACID-compliant persistence store handling all relational transactions, inserts, updates, and deletes.
* **Read Replica Database**: Continually replicates from the primary database to process read-only queries (such as listing notes and search requests), preventing read starvation on the master.
* **Message Queue (e.g., RabbitMQ / AWS SQS)**: Buffers asynchronous tasks—such as search index updates, audit logging, and email notifications—to prevent blocking the synchronous HTTP response.
* **Background Worker Pool**: Consumes tasks from the message queue to update Elasticsearch/OpenSearch indices and handle long-running background jobs.

---

## 5. Step-by-Step Request Flows

### A. Flow of `GET /v1/notes` (Read Request)

1. **Client Request**: The client dispatches `GET /v1/notes?page=1&limit=10` with header `Authorization: Bearer <jwt_token>`.
2. **Routing & Load Balancing**: The Load Balancer receives the request, terminates TLS, checks server health, and routes the request to `App Server 1`.
3. **Authentication & Validation**: `App Server 1` extracts the JWT from the header, cryptographically verifies its signature, and extracts `user_id = 81`.
4. **Cache Lookup**: `App Server 1` checks Redis for key `cache:user:81:notes:page:1`.
   * **Cache Hit (90% of requests)**: Redis returns the serialized notes JSON; `App Server 1` returns `200 OK` to the client immediately ($< 15\text{ ms}$).
   * **Cache Miss (10% of requests)**: 
5. **Database Query**: `App Server 1` executes the paginated query against the **Read Replica Database**:
   ```sql
   SELECT * FROM notes WHERE user_id = 81 ORDER BY is_pinned DESC, updated_at DESC LIMIT 10;
   ```
6. **Populate Cache**: `App Server 1` writes the fetched notes list to Redis with a 5-minute Time-To-Live (TTL).
7. **Client Response**: `App Server 1` returns HTTP `200 OK` with the note array and pagination metadata to the client.

---

### B. Flow of `POST /v1/notes` (Write Request)

1. **Client Request**: The client sends an HTTP `POST /v1/notes` request containing JSON payload `{ "title": "Meeting Notes", "body": "Discuss sprint goals" }` with the user's JWT.
2. **Routing**: The Load Balancer routes the request to an available server (`App Server 2`).
3. **Authentication & Validation**: `App Server 2` authenticates the token (`user_id = 81`) and validates the body (ensures `title` exists and is $\le 100$ characters).
4. **Transactional Write**: `App Server 2` executes an `INSERT` statement on the **Primary Database (Master)**:
   ```sql
   INSERT INTO notes (user_id, title, body, created_at, updated_at)
   VALUES (81, 'Meeting Notes', 'Discuss sprint goals', NOW(), NOW())
   RETURNING id, user_id, title, body, is_pinned, created_at, updated_at;
   ```
5. **Cache Invalidation**: `App Server 2` invalidates the cached note lists for this user in Redis (`DEL cache:user:81:notes:*`) to prevent stale reads.
6. **Publish Asynchronous Event**: `App Server 2` pushes a lightweight event message `{ "event": "note_created", "note_id": 429, "user_id": 81 }` to the **Message Queue**.
7. **Client Response**: `App Server 2` immediately returns `201 Created` with the newly created note JSON to the user ($< 80\text{ ms}$).
8. **Asynchronous Background Processing**: A **Background Worker** pulls the message from the queue and indexes the note content into Elasticsearch for full-text search capability.

---

## 6. Architectural Trade-Offs

### Trade-Off 1: Cache-Aside with Invalidation vs. Strict Immediate Read Consistency
* **Decision**: We utilize a **Cache-Aside** strategy in Redis with explicit cache eviction on writes (`DEL cache:user:<id>:notes:*`).
* **Advantage**: Sub-millisecond read times for 90% of requests, enabling the system to effortlessly support peak loads of over 230 reads/second without stressing database connection pools.
* **Trade-Off**: If a user creates a note and reads from a lagging read replica before replication completes (or if cache invalidation fails), the user could experience a momentary stale read (eventual consistency window of 50–200 ms). We mitigate this by reading directly from the primary database on immediate post-write redirects.

---

### Trade-Off 2: Synchronous DB Write with Asynchronous Search Indexing
* **Decision**: Notes are committed synchronously to PostgreSQL, but full-text search indexing is offloaded asynchronously to background workers via a message queue.
* **Advantage**: Fast write latency ($< 80\text{ ms}$) and high API availability. If the search indexing cluster is under heavy load or temporarily unavailable, user note creation continues without disruption.
* **Trade-Off**: A newly created note may take 1–3 seconds to appear in search query results until the background worker processes the indexing job.

---

## 7. Eliminating Single Points of Failure (SPOF Analysis)

To guarantee 99.95% system uptime, redundancy and automated failover are built into every tier:

| Architectural Tier | Potential Failure Mode | Prevention & High Availability Strategy |
| :--- | :--- | :--- |
| **DNS Tier** | DNS Provider Outage | Managed Anycast DNS (Route 53 / Cloudflare) with automated health checks and failover routing across multiple cloud regions. |
| **Edge & Ingress** | Load Balancer crash or network partition | AWS Application Load Balancer operates across multiple Availability Zones (Multi-AZ) with automated horizontal elasticity and health monitoring. |
| **Application Tier** | App server crash or memory leak | Stateless application servers deployed in an Auto-Scaling Group across a minimum of two Availability Zones; unhealthy instances are automatically terminated and replaced. |
| **Cache Tier** | Redis node failure | Redis deployed in a clustered configuration with Master-Replica replication and Redis Sentinel for automatic failover in $< 5\text{ seconds}$. |
| **Database Tier** | Primary Database crash or disk failure | Managed Multi-AZ PostgreSQL with synchronous standby replica in a second Availability Zone; automated failover promotes the standby replica to primary within 30 seconds without data loss. |
| **Queue Tier** | Message Queue node failure | High-availability mirrored queues in RabbitMQ / AWS SQS with durable messages persisted to disk and Dead Letter Queues (DLQ) for unprocessable jobs. |
