# QuickNotes Relational Data Model

This document outlines the database schema, entity-relationship model, SQL DDL statements, indexing strategy, and technology justification for the **QuickNotes** production database.

---

## 1. Entities & Schema Specification

The QuickNotes data model consists of four core entities: `users`, `notes`, `tags`, and the junction table `note_tags`.

### A. `users`
Represents registered user accounts on the platform.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTOINCREMENT` | Unique identifier for each user |
| `email` | `VARCHAR(255)` | `NOT NULL UNIQUE` | User's unique login email address |
| `name` | `VARCHAR(100)` | `NOT NULL` | User's display name |
| `password_hash`| `VARCHAR(255)` | `NOT NULL` | Secure salted password hash (e.g., bcrypt/Argon2) |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |
| `updated_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Timestamp of last profile update |

---

### B. `notes`
Represents individual notes created by users.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTOINCREMENT` | Unique identifier for each note |
| `user_id` | `BIGINT` | `NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id)` | Author of the note |
| `title` | `VARCHAR(100)` | `NOT NULL` | Required note headline (max 100 characters) |
| `body` | `TEXT` | `NULL` | Optional long-form markdown/plain-text content |
| `is_pinned` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Flag for keeping note at top of user feed |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Note creation timestamp |
| `updated_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Timestamp of last note modification |

---

### C. `tags`
Represents shared categorization labels (e.g., "Work", "Personal", "Ideas").

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY AUTOINCREMENT` | Unique tag identifier |
| `name` | `VARCHAR(50)` | `NOT NULL UNIQUE` | Unique normalized label name (lowercase) |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Tag creation timestamp |

---

### D. `note_tags` (Junction Table)
Connects `notes` and `tags` to support a Many-to-Many relationship.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `note_id` | `BIGINT` | `NOT NULL, FOREIGN KEY REFERENCES notes(id) ON DELETE CASCADE` | Associated note |
| `tag_id` | `INT` | `NOT NULL, FOREIGN KEY REFERENCES tags(id) ON DELETE CASCADE` | Associated tag |
| *(Composite PK)*| `(note_id, tag_id)`| `PRIMARY KEY` | Enforces that a tag is applied at most once to a note |

---

## 2. Entity Relationships

```
+------------+          1:N           +------------+
|   users    |----------------------->|   notes    |
+------------+                        +-----+------+
                                            |
                                            | M:N (via note_tags)
                                            v
                                      +------------+
                                      | note_tags  |
                                      +-----+------+
                                            |
                                            |
                                            v
                                      +------------+
                                      |    tags    |
                                      +------------+
```

### 1. One-to-Many (1:N): `users` $\rightarrow$ `notes`
* A single user can create and own zero, one, or thousands of notes.
* Every individual note belongs strictly to exactly one registered user (`notes.user_id`).
* When a user account is deleted, all their associated notes are automatically purged using `ON DELETE CASCADE`.

### 2. Many-to-Many (M:N): `notes` $\leftrightarrow$ `tags`
* A single note can have multiple tags attached to it (e.g., a note tagged with both `"work"` and `"urgent"`).
* Conversely, a single tag can categorize many different notes across the system.
* **Why a Join Table is Required**: Relational databases enforce First Normal Form (1NF), prohibiting multi-valued fields (such as comma-separated tags in a note column). The `note_tags` junction table cleanly normalizes the M:N relationship into two one-to-many relationships (`notes` 1:N `note_tags` and `tags` 1:N `note_tags`), eliminating data duplication and maintaining referential integrity.

---

## 3. SQL DDL Statements (`CREATE TABLE`)

```sql
-- Clean up existing tables
DROP TABLE IF EXISTS note_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Notes Table
CREATE TABLE notes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tags Table
CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Note Tags Junction Table
CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

---

## 4. Example SQL Queries

### Query 1: Fetch All Notes for a User with Attached Tags (`JOIN`)
Retrieves all notes for User ID 81, sorted with pinned notes first, aggregating associated tag names into a comma-separated list.

```sql
SELECT 
    n.id AS note_id,
    n.title,
    n.body,
    n.is_pinned,
    n.created_at,
    n.updated_at,
    GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') AS tags
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 81
GROUP BY n.id, n.title, n.body, n.is_pinned, n.created_at, n.updated_at
ORDER BY n.is_pinned DESC, n.updated_at DESC;
```

---

### Query 2: Full-Text Keyword Search in User Notes
Finds all notes belonging to User ID 81 containing the term `'architecture'` in either the title or body.

```sql
SELECT 
    id,
    title,
    body,
    updated_at
FROM notes
WHERE user_id = 81
  AND (title LIKE '%architecture%' OR body LIKE '%architecture%')
ORDER BY updated_at DESC;
```

---

### Query 3: Count Notes per Tag for a User (`GROUP BY`)
Calculates the distribution of notes across categories for User ID 81.

```sql
SELECT 
    t.name AS tag_name,
    COUNT(nt.note_id) AS total_notes
FROM tags t
JOIN note_tags nt ON t.id = nt.tag_id
JOIN notes n ON nt.note_id = n.id
WHERE n.user_id = 81
GROUP BY t.id, t.name
ORDER BY total_notes DESC;
```

---

## 5. Indexing Strategy

```sql
-- Accelerate user note retrieval (Feed lookups and user isolation)
CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC);

-- Accelerate reverse tag lookups (Find all notes for a specific tag)
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
```

* **`idx_notes_user_updated` on `notes(user_id, updated_at DESC)`**:
  * **Rationale**: By far the most frequent query in QuickNotes is loading a user's recent notes list (`WHERE user_id = ? ORDER BY updated_at DESC`). Without an index, the database engine must perform an expensive full table scan and file sort across millions of rows. This composite B-tree index allows the database to instantly locate the user's partition and scan rows in pre-sorted order in $O(\log N)$ time, cutting query execution times from hundreds of milliseconds to under 2 milliseconds.
* **`idx_note_tags_tag_id` on `note_tags(tag_id)`**:
  * **Rationale**: The composite primary key `(note_id, tag_id)` automatically indexes `note_id`, but queries filtering notes by tag (`WHERE tag_id = ?`) cannot use that index efficiently. Adding an index on `tag_id` enables fast $O(1)$ joins when filtering notes by category.

---

## 6. Architectural Decision: SQL vs. NoSQL

For QuickNotes, **SQL (Relational Database)** is the optimal technology choice over NoSQL. 

The core QuickNotes domain is inherently relational: notes strictly belong to authenticated users, tags are shared across many notes, and business rules mandate strong referential integrity (e.g., deleting a user or note must atomically cascade without leaving orphan tag associations or orphaned notes). Relational databases provide ACID guarantees ensuring that concurrent note edits and updates are durable and conflict-free. 

While a document store (such as MongoDB) could embed tags inside a note document, updating a tag name or querying cross-tag analytics across 1 million users would require scanning and modifying every individual document. Furthermore, SQL easily scales to 1 million users through connection pooling, read replicas, and caching layers, while preserving declarative schema constraints and flexible SQL querying capabilities.
