# QuickNotes REST API Specification

This document provides the formal RESTful API specification for the **QuickNotes** production cloud service. It serves as the authoritative blueprint for the backend engineering team.

---

## 1. Overview & General Principles

* **Base URL**: `https://api.quicknotes.com/v1`
* **Protocol**: HTTPS only
* **Data Format**: JSON (`application/json; charset=utf-8`)
* **Authentication**: Token-based authentication using JSON Web Tokens (JWT) passed in the HTTP Authorization header:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
* **Date-Time Format**: ISO 8601 UTC string (e.g., `2026-10-18T20:30:00Z`).

---

## 2. API Endpoints Table

| Method | Path | Description | Success Status |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/v1/notes` | Retrieves a paginated list of notes owned by the authenticated user. Supports filtering by tag and sorting. | `200 OK` |
| **`GET`** | `/v1/notes/:id` | Retrieves the full details of a specific note identified by its unique ID. | `200 OK` |
| **`POST`** | `/v1/notes` | Creates a new note for the authenticated user. | `201 Created` |
| **`PUT`** | `/v1/notes/:id` | Replaces all fields of an existing note with the provided payload. | `200 OK` |
| **`PATCH`** | `/v1/notes/:id` | Partially updates specific fields (e.g., `title`, `body`, or `is_pinned`) of an existing note. | `200 OK` |
| **`DELETE`** | `/v1/notes/:id` | Permanently deletes a note identified by its unique ID. | `204 No Content` |
| **`GET`** | `/v1/notes/search` | Performs a full-text search across titles and bodies of the user's notes using query parameter `q`. | `200 OK` |

---

## 3. Request & Response Examples

### A. Creating a Note (`POST /v1/notes`)

#### Request
* **Endpoint**: `POST /v1/notes`
* **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
* **Request Body**:
  ```json
  {
    "title": "System Architecture Review",
    "body": "Prepare presentation slides on load balancers, database read replicas, and caching for Day 8.",
    "tags": ["architecture", "presentation", "capstone"],
    "is_pinned": true
  }
  ```

#### Response
* **Status**: `201 Created`
* **Headers**:
  ```http
  Content-Type: application/json
  Location: /v1/notes/429
  ```
* **Response Body**:
  ```json
  {
    "id": 429,
    "user_id": 81,
    "title": "System Architecture Review",
    "body": "Prepare presentation slides on load balancers, database read replicas, and caching for Day 8.",
    "tags": ["architecture", "presentation", "capstone"],
    "is_pinned": true,
    "created_at": "2026-10-18T20:30:00Z",
    "updated_at": "2026-10-18T20:30:00Z"
  }
  ```

---

### B. Listing Notes (`GET /v1/notes`)

#### Request
* **Endpoint**: `GET /v1/notes?page=1&limit=10&tag=architecture&sort=updated_at:desc`
* **Headers**:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
* **Request Body**: *None*

#### Response
* **Status**: `200 OK`
* **Headers**:
  ```http
  Content-Type: application/json
  ```
* **Response Body**:
  ```json
  {
    "data": [
      {
        "id": 429,
        "user_id": 81,
        "title": "System Architecture Review",
        "body": "Prepare presentation slides on load balancers, database read replicas, and caching for Day 8.",
        "tags": ["architecture", "presentation", "capstone"],
        "is_pinned": true,
        "created_at": "2026-10-18T20:30:00Z",
        "updated_at": "2026-10-18T20:30:00Z"
      },
      {
        "id": 381,
        "user_id": 81,
        "title": "Database Normalization Notes",
        "body": "First normal form eliminates repeating groups; third normal form eliminates transitive dependencies.",
        "tags": ["architecture", "database"],
        "is_pinned": false,
        "created_at": "2026-10-17T14:15:00Z",
        "updated_at": "2026-10-17T15:20:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "limit": 10,
      "total_items": 2,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
  ```

---

## 4. Error Handling & Status Codes

All errors return a standardized JSON envelope containing an `error` object with machine-readable `code`, human-readable `message`, HTTP `status`, and optional validation `details`.

### Standard Error Response Format
```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_FAILED",
    "message": "The request payload failed validation.",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must not exceed 100 characters."
      }
    ]
  }
}
```

---

### Error Codes Specification

#### 1. `400 Bad Request`
* **Meaning**: The request payload is malformed or failed validation rules (e.g., missing title, title exceeding 100 characters, or invalid JSON syntax).
* **Example Scenario**: Sending `{ "body": "Missing title" }` to `POST /v1/notes`.
* **Example Body**:
  ```json
  {
    "error": {
      "status": 400,
      "code": "INVALID_INPUT",
      "message": "Validation error: 'title' is a required field.",
      "details": [
        {
          "field": "title",
          "message": "Title cannot be blank."
        }
      ]
    }
  }
  ```

#### 2. `401 Unauthorized`
* **Meaning**: The request lacks valid authentication credentials or the provided Bearer token has expired or is invalid.
* **Example Scenario**: Accessing `GET /v1/notes` without an `Authorization` header.
* **Example Body**:
  ```json
  {
    "error": {
      "status": 401,
      "code": "AUTHENTICATION_REQUIRED",
      "message": "Authentication token is missing or has expired. Please log in again."
    }
  }
  ```

#### 3. `403 Forbidden`
* **Meaning**: The user is authenticated but does not have permission to access or modify the requested resource.
* **Example Scenario**: User ID 81 attempts to update or delete a note belonging to User ID 95 (`DELETE /v1/notes/701`).
* **Example Body**:
  ```json
  {
    "error": {
      "status": 403,
      "code": "FORBIDDEN_ACCESS",
      "message": "You do not have permission to modify or delete this note."
    }
  }
  ```

#### 4. `404 Not Found`
* **Meaning**: The requested resource does not exist on the server.
* **Example Scenario**: Calling `GET /v1/notes/99999` where note 99999 does not exist.
* **Example Body**:
  ```json
  {
    "error": {
      "status": 404,
      "code": "NOTE_NOT_FOUND",
      "message": "No note found with ID 99999."
    }
  }
  ```

#### 5. `500 Internal Server Error`
* **Meaning**: An unexpected server error occurred while processing the request (e.g., database connection timeout, unhandled exception).
* **Example Scenario**: Primary database connection pool exhaustion during a peak traffic event.
* **Example Body**:
  ```json
  {
    "error": {
      "status": 500,
      "code": "INTERNAL_SERVER_ERROR",
      "message": "An unexpected error occurred on the server. Our engineering team has been notified."
    }
  }
  ```
