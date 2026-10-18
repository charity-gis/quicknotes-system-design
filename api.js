// ========================================================
// QuickNotes API Client (Project 2)
// Practice API Endpoint: JSONPlaceholder Posts
// ========================================================

const API_URL = "https://jsonplaceholder.typicode.com/posts";

// DOM Elements
const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const notesList = document.getElementById("notes-list");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");

/**
 * Reusable HTTP request helper using fetch and async/await.
 * Checks response.ok and throws a formatted Error on failure.
 * @param {string} url - Target URL endpoint
 * @param {object} options - Fetch configuration options
 * @returns {Promise<any>} - Parsed JSON response body or null for 204
 */
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText || "Request failed"})`);
    }

    // 204 No Content or empty responses
    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    if (!text) {
        return { _httpStatus: response.status };
    }

    try {
        const data = JSON.parse(text);
        if (data && typeof data === "object" && !Array.isArray(data)) {
            data._httpStatus = response.status;
        }
        return data;
    } catch {
        return { _httpStatus: response.status };
    }
}

/**
 * Displays status messages (loading, success, error, info) to the user.
 * @param {string} message - Message text to display
 * @param {'loading'|'success'|'error'|'info'} type - Status category
 */
function showStatus(message, type = "info") {
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
}

/**
 * Creates a single DOM note item element safely using createElement and textContent.
 * Appends a dedicated Delete button to trigger DELETE /posts/{id}.
 * @param {object} note - Note object with id, title, and body
 * @returns {HTMLLIElement} - The created list item element
 */
function createNoteElement(note) {
    const li = document.createElement("li");
    li.className = "note-item";
    li.dataset.id = note.id;

    // Header with Title and Delete Button
    const headerDiv = document.createElement("div");
    headerDiv.className = "note-header";

    const titleH3 = document.createElement("h3");
    titleH3.className = "note-title";
    titleH3.textContent = note.title;
    headerDiv.appendChild(titleH3);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.setAttribute("aria-label", `Delete note ${note.title}`);
    deleteBtn.textContent = "Delete";
    headerDiv.appendChild(deleteBtn);

    // Body Text
    const bodyP = document.createElement("p");
    bodyP.className = "note-body";
    bodyP.textContent = note.body || "(No content)";

    // Footer with Note ID badge
    const footerDiv = document.createElement("div");
    footerDiv.className = "note-footer";

    const idBadge = document.createElement("span");
    idBadge.className = "note-id-badge";
    idBadge.textContent = `ID: #${note.id}`;
    footerDiv.appendChild(idBadge);

    li.appendChild(headerDiv);
    li.appendChild(bodyP);
    li.appendChild(footerDiv);

    return li;
}

/**
 * Renders an array of notes into the DOM.
 * Uses createElement and textContent exclusively to ensure safe text insertion.
 * @param {Array} notes - List of note objects to display
 */
function renderNotes(notes) {
    notesList.innerHTML = "";

    // Empty state handling
    if (!notes || notes.length === 0) {
        showEmptyState();
        return;
    }

    notes.forEach(note => {
        notesList.appendChild(createNoteElement(note));
    });
}

/**
 * Displays the empty-state message inside the notes list.
 */
function showEmptyState() {
    notesList.innerHTML = "";
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "No notes available. Click 'Load notes' to fetch notes from the server or create one above.";
    notesList.appendChild(emptyItem);
}

/**
 * Task 1: Loads 10 notes from the server (GET).
 * Manages loading state, disabled button state, success feedback, and error handling.
 */
async function loadNotes() {
    try {
        loadBtn.disabled = true;
        showStatus("Loading notes...", "loading");

        const notes = await request(`${API_URL}?_limit=10`);
        renderNotes(notes);

        if (notes.length === 0) {
            showStatus("No notes found on the server.", "info");
        } else {
            showStatus(`Loaded ${notes.length} notes from the server.`, "success");
        }
    } catch (error) {
        console.error("Failed to load notes:", error);
        showStatus(`Failed to load notes: ${error.message}. Please check your connection and try again.`, "error");
    } finally {
        loadBtn.disabled = false;
    }
}

/**
 * Task 2: Creates a new note on the server (POST).
 * Validates title (required, max 100 characters), sends payload, disables button,
 * prepends note to the top of the list, and clears the form.
 */
async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    // Validation
    if (!title) {
        showStatus("Validation error: Title is required.", "error");
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        showStatus(`Validation error: Title cannot exceed 100 characters (currently ${title.length}).`, "error");
        titleInput.focus();
        return;
    }

    try {
        submitBtn.disabled = true;
        showStatus("Creating note...", "loading");

        const payload = {
            title: title,
            body: body,
            userId: 1,
        };

        const newNote = await request(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify(payload),
        });

        // Remove empty state message if currently displayed
        const emptyState = notesList.querySelector(".empty-state");
        if (emptyState) {
            emptyState.remove();
        }

        // Add newly created note to the top of the list
        const noteElement = createNoteElement(newNote);
        notesList.prepend(noteElement);

        const statusReport = newNote._httpStatus ? newNote._httpStatus : 201;
        showStatus(`Note created (status ${statusReport}, id ${newNote.id}).`, "success");

        // Clear the form fields
        titleInput.value = "";
        bodyInput.value = "";
        titleInput.focus();
    } catch (error) {
        console.error("Failed to create note:", error);
        showStatus(`Failed to create note: ${error.message}. Please try again.`, "error");
    } finally {
        submitBtn.disabled = false;
    }
}

/**
 * Task 3: Deletes a note from the server and UI (DELETE).
 *
 * NOTE ON JSONPLACEHOLDER BEHAVIOR:
 * JSONPlaceholder is a mock REST API that simulates HTTP responses.
 * When sending DELETE /posts/{id}, JSONPlaceholder always returns HTTP 200 OK
 * with an empty JSON object {}, but it does not actually delete records on the
 * server, nor does it store newly created records (e.g. id: 101).
 *
 * OUR SENSIBLE APPROACH:
 * 1. We always dispatch the real HTTP DELETE request to `${API_URL}/${id}` to
 *    test and prove the network integration.
 * 2. If the API returns success (HTTP 200/204), we remove the note from the DOM.
 * 3. If removing the note leaves the list empty, we restore the empty-state message.
 * 4. We provide immediate user feedback showing successful deletion and handle any
 *    network/server errors appropriately.
 */
async function handleDelete(event) {
    const deleteBtn = event.target.closest(".delete-btn");
    if (!deleteBtn) return;

    const noteItem = deleteBtn.closest(".note-item");
    if (!noteItem) return;

    const noteId = noteItem.dataset.id;

    try {
        // Disable the delete button during the request to prevent double-submits
        deleteBtn.disabled = true;
        showStatus(`Deleting note #${noteId}...`, "loading");

        await request(`${API_URL}/${noteId}`, {
            method: "DELETE",
        });

        // Remove note card from the DOM
        noteItem.remove();

        showStatus(`Note #${noteId} deleted successfully.`, "success");

        // If no notes remain, display the empty state
        if (notesList.children.length === 0) {
            showEmptyState();
        }
    } catch (error) {
        console.error(`Failed to delete note #${noteId}:`, error);
        showStatus(`Failed to delete note #${noteId}: ${error.message}`, "error");
        deleteBtn.disabled = false;
    }
}

// Event Listeners
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
notesList.addEventListener("click", handleDelete);

// Initial State: display empty state on page load
renderNotes([]);
