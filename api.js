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
 * @returns {Promise<any>} - Parsed JSON response body
 */
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText || "Request failed"})`);
    }

    if (response.status === 204) {
        return null;
    }

    return await response.json();
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
 * Renders an array of notes into the DOM.
 * Uses createElement and textContent exclusively to ensure safe text insertion.
 * @param {Array} notes - List of note objects to display
 */
function renderNotes(notes) {
    notesList.innerHTML = "";

    // Empty state handling
    if (!notes || notes.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-state";
        emptyItem.textContent = "No notes available. Click 'Load notes' to fetch notes from the server.";
        notesList.appendChild(emptyItem);
        return;
    }

    notes.forEach(note => {
        const li = document.createElement("li");
        li.className = "note-item";
        li.dataset.id = note.id;

        // Header with Title
        const headerDiv = document.createElement("div");
        headerDiv.className = "note-header";

        const titleH3 = document.createElement("h3");
        titleH3.className = "note-title";
        titleH3.textContent = note.title;
        headerDiv.appendChild(titleH3);

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

        notesList.appendChild(li);
    });
}

/**
 * Task 1: Loads 10 notes from the server (GET).
 * Manages loading state, disabled button state, success feedback, and error handling.
 */
async function loadNotes() {
    try {
        // Disable load button during active request
        loadBtn.disabled = true;
        showStatus("Loading notes...", "loading");

        // Fetch first 10 notes
        const notes = await request(`${API_URL}?_limit=10`);

        // Render notes to the list
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
        // Re-enable load button
        loadBtn.disabled = false;
    }
}

// Event Listeners
loadBtn.addEventListener("click", loadNotes);

// Initial State: display empty state on page load
renderNotes([]);
