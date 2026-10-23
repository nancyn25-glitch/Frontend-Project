
const STORAGE_KEY = "careerTrackApplications";

const form = document.getElementById("application-form");
const dialog = document.getElementById("application-dialog");
const tableBody = document.getElementById("applications-table-body");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const sortSelect = document.getElementById("sort-select");
const toast = document.getElementById("toast");

let applications = loadApplications();
let editingId = null;
let toastTimeout;

// Load saved applications safely.
function loadApplications() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      return [];
    }

    const parsedData = JSON.parse(savedData);

    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error("Could not load applications:", error);
    return [];
  }
}

// Save applications in the browser.
function saveApplications() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    return true;
  } catch (error) {
    console.error("Could not save applications:", error);
    showToast("Could not save data. Check your browser storage.");
    return false;
  }
}

// Format dates for display.
function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Avoid inserting user-provided text as HTML.
function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// Update the dashboard statistics.
function updateStatistics() {
  document.getElementById("total-count").textContent =
    applications.length;

  document.getElementById("interview-count").textContent =
    applications.filter((app) => app.status === "Interview").length;

  document.getElementById("offer-count").textContent =
    applications.filter((app) => app.status === "Offer").length;

  document.getElementById("rejected-count").textContent =
    applications.filter((app) => app.status === "Rejected").length;
}

// Get applications matching the search and filter.
function getFilteredApplications() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const sortOrder = sortSelect.value;

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm) ||
      app.role.toLowerCase().includes(searchTerm);

    const matchesStatus =
      selectedStatus === "All" || app.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (sortOrder === "newest") {
    filtered.sort((a, b) => {
      const dateComparison = b.dateApplied.localeCompare(a.dateApplied);
      return dateComparison || b.createdAt - a.createdAt;
    });
  } else if (sortOrder === "oldest") {
    filtered.sort((a, b) => {
      const dateComparison = a.dateApplied.localeCompare(b.dateApplied);
      return dateComparison || a.createdAt - b.createdAt;
    });
  } else if (sortOrder === "company") {
    filtered.sort((a, b) => a.company.localeCompare(b.company));
  }

  return filtered;
}

// Build a table row for one application.
function createApplicationRow(app) {
  const row = document.createElement("tr");

  // Company and role.
  const companyCell = document.createElement("td");
  const companyWrapper = createElement("div", "company-cell");
  const avatar = createElement(
    "div",
    "company-avatar",
    app.company.trim().charAt(0).toUpperCase()
  );

  avatar.setAttribute("aria-hidden", "true");

  const companyInfo = createElement("div", "company-info");
  companyInfo.append(
    createElement("strong", "", app.company),
    createElement("span", "", app.role)
  );

  companyWrapper.append(avatar, companyInfo);
  companyCell.append(companyWrapper);

  // Application date.
  const dateCell = createElement(
    "td",
    "",
    formatDate(app.dateApplied)
  );

  // Status.
  const statusCell = document.createElement("td");
  const statusClasses = {
    Applied: "status-applied",
    Interview: "status-interview",
    Offer: "status-offer",
    Rejected: "status-rejected",
  };

  const statusBadge = createElement(
    "span",
    `status-badge ${statusClasses[app.status] || ""}`,
    app.status
  );

  statusCell.append(statusBadge);

  // Optional job link.
  const linkCell = document.createElement("td");

  if (app.jobLink) {
    const link = createElement("a", "job-link", "View job ↗");
    link.href = app.jobLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `View job posting for ${app.role}`);
    linkCell.append(link);
  } else {
    linkCell.append(createElement("span", "no-link", "Not provided"));
  }

  // Edit and delete buttons.
  const actionsCell = document.createElement("td");
  const actions = createElement("div", "row-actions");

  const editButton = createElement("button", "action-button", "Edit");
  editButton.type = "button";
  editButton.addEventListener("click", () => openEditForm(app.id));

  const deleteButton = createElement(
    "button",
    "action-button delete",
    "Delete"
  );
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => deleteApplication(app.id));

  actions.append(editButton, deleteButton);
  actionsCell.append(actions);

  row.append(companyCell, dateCell, statusCell, linkCell, actionsCell);

  return row;
}

// Render the applications table.
function renderApplications() {
  const filteredApplications = getFilteredApplications();

  tableBody.replaceChildren();

  filteredApplications.forEach((app) => {
    tableBody.append(createApplicationRow(app));
  });

  document.getElementById("visible-count").textContent =
    `${filteredApplications.length} ${
      filteredApplications.length === 1 ? "application" : "applications"
    }`;

  emptyState.hidden = filteredApplications.length > 0;

  if (applications.length === 0) {
    document.getElementById("empty-title").textContent =
      "Your job search starts here";

    document.getElementById("empty-description").textContent =
      "Add your first application to start tracking your progress.";

    document.getElementById("empty-add-btn").hidden = false;
  } else if (filteredApplications.length === 0) {
    document.getElementById("empty-title").textContent =
      "No applications found";

    document.getElementById("empty-description").textContent =
      "Try another search term or change your filters.";

    document.getElementById("empty-add-btn").hidden = true;
  }

  updateStatistics();
}

// Open the form to add an application.
function openAddForm() {
  editingId = null;
  form.reset();

  document.getElementById("dialog-title").textContent =
    "Add application";

  document.getElementById("save-btn").textContent =
    "Save application";

  document.getElementById("date-applied").value =
    new Date().toLocaleDateString("en-CA");

  document.getElementById("form-message").textContent = "";

  dialog.showModal();
  document.getElementById("company").focus();
}

// Open the form to edit an application.
function openEditForm(id) {
  const app = applications.find((item) => item.id === id);

  if (!app) return;

  editingId = id;

  document.getElementById("dialog-title").textContent =
    "Edit application";

  document.getElementById("save-btn").textContent =
    "Update application";

  document.getElementById("company").value = app.company;
  document.getElementById("role").value = app.role;
  document.getElementById("date-applied").value = app.dateApplied;
  document.getElementById("status").value = app.status;
  document.getElementById("job-link").value = app.jobLink || "";
  document.getElementById("form-message").textContent = "";

  dialog.showModal();
  document.getElementById("company").focus();
}

// Close the form.
function closeForm() {
  dialog.close();
  form.reset();
  editingId = null;
  document.getElementById("form-message").textContent = "";
}

// Validate and normalize a job URL.
function normalizeJobLink(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

// Add or update an application when the form is submitted.
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const company = document.getElementById("company").value.trim();
  const role = document.getElementById("role").value.trim();
  const dateApplied = document.getElementById("date-applied").value;
  const status = document.getElementById("status").value;
  const jobLinkInput = document.getElementById("job-link").value;

  const formMessage = document.getElementById("form-message");

  if (!company || !role || !dateApplied) {
    formMessage.textContent = "Please fill in all required fields.";
    return;
  }

  const jobLink = normalizeJobLink(jobLinkInput);

  if (jobLink === null) {
    formMessage.textContent =
      "Enter a valid job URL starting with http:// or https://.";
    return;
  }

  const previousApplications = [...applications];

  if (editingId !== null) {
    applications = applications.map((app) =>
      app.id === editingId
        ? { ...app, company, role, dateApplied, status, jobLink }
        : app
    );
  } else {
    applications.push({
      id: crypto.randomUUID(),
      company,
      role,
      dateApplied,
      status,
      jobLink,
      createdAt: Date.now(),
    });
  }

  if (!saveApplications()) {
    applications = previousApplications;
    return;
  }

  const message =
    editingId !== null
      ? "Application updated successfully!"
      : "Application added successfully!";

  closeForm();
  renderApplications();
  showToast(message);
});

// Delete an application.
function deleteApplication(id) {
  const app = applications.find((item) => item.id === id);

  if (!app) return;

  const confirmed = window.confirm(
    `Delete the application for ${app.company}?`
  );

  if (!confirmed) return;

  const previousApplications = [...applications];

  applications = applications.filter((item) => item.id !== id);

  if (!saveApplications()) {
    applications = previousApplications;
    return;
  }

  renderApplications();
  showToast("Application deleted.");
}

// Display a temporary notification.
function showToast(message) {
  clearTimeout(toastTimeout);

  toast.textContent = message;
  toast.classList.add("show");

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// Connect buttons and filters.
document.getElementById("open-form-btn").addEventListener("click", openAddForm);
document.getElementById("empty-add-btn").addEventListener("click", openAddForm);
document.getElementById("close-dialog-btn").addEventListener("click", closeForm);
document.getElementById("cancel-btn").addEventListener("click", closeForm);

searchInput.addEventListener("input", renderApplications);
statusFilter.addEventListener("change", renderApplications);
sortSelect.addEventListener("change", renderApplications);

// Close the dialog if the user clicks outside it.
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    closeForm();
  }
});

// Initial page render.
renderApplications();
