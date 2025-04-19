let context = "";
let isProcessing = false;

// DOM Elements
const elements = {
  loader: document.getElementById("loader"),
  pdfInput: document.getElementById("pdfInput"),
  uploadStatus: document.getElementById("uploadStatus"),
  qaSection: document.getElementById("qaSection"),
  questionInput: document.getElementById("questionInput"),
  answerContainer: document.getElementById("answerContainer"),
  askBtn: document.getElementById("askBtn"),
  uploadSection: document.querySelector(".upload-section"),
};

// Drag & Drop Handlers
function handleDragOver(e) {
  e.preventDefault();
  elements.uploadSection.style.borderColor = "#2563eb";
  elements.uploadSection.style.backgroundColor = "#f1f5f9";
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.uploadSection.style.borderColor = "#cbd5e1";
  elements.uploadSection.style.backgroundColor = "transparent";
}

async function handleDrop(e) {
  e.preventDefault();
  elements.uploadSection.style.borderColor = "#cbd5e1";
  elements.uploadSection.style.backgroundColor = "transparent";

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === "application/pdf") {
    elements.pdfInput.files = files;
    await uploadPDF();
  }
}

// Event Listeners
elements.pdfInput.addEventListener("change", uploadPDF);
elements.uploadSection.addEventListener("dragover", handleDragOver);
elements.uploadSection.addEventListener("dragleave", handleDragLeave);
elements.uploadSection.addEventListener("drop", handleDrop);
elements.questionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    askQuestion();
  }
});

async function uploadPDF() {
  if (isProcessing) return;
  isProcessing = true;

  const file = elements.pdfInput.files[0];
  if (!file) {
    showStatus("Please select a PDF file", "error");
    isProcessing = false;
    return;
  }

  showStatus("Processing PDF...", "loading");
  toggleLoader(true);
  resetUI();

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      "https://pdf-search-b-productions.up.railway.app/upload",
      // "http://localhost:8080/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to process PDF");
    }

    const data = await response.json();
    context = data.text;
    showQAInterface();
    console.log("PDF processed successfully!", "success");

    showStatus("PDF processed successfully!", "success");
  } catch (error) {
    console.error("Upload Error:", error);
    showStatus(error.message, "error");
  } finally {
    isProcessing = false;
    toggleLoader(false);
  }
}

async function askQuestion() {
  if (isProcessing || !context) return;
  isProcessing = true;

  const question = elements.questionInput.value.trim();
  if (!question || question.split(" ").length < 3) {
    showStatus(
      "Please enter a meaningful question (at least 3 words)",
      "error"
    );
    isProcessing = false;
    return;
  }

  toggleLoader(true);
  elements.askBtn.disabled = true;
  clearAnswer();

  try {
    const response = await fetch(
      "https://pdf-search-b-productions.up.railway.app/ask",
      // "http://localhost:8080/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, question }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to get answer");
    }

    const data = await response.json();
    displayAnswer(data);
  } catch (error) {
    console.error("Ask Error:", error);
    showStatus(error.message, "error");
  } finally {
    isProcessing = false;
    toggleLoader(false);
    elements.askBtn.disabled = false;
  }
}

// UI Helpers
function showStatus(message, type = "info") {
  elements.uploadStatus.textContent = message;
  elements.uploadStatus.className = `upload-status ${type}`;
}

function toggleLoader(show) {
  elements.loader.style.display = show ? "block" : "none";
}

function showQAInterface() {
  elements.qaSection.classList.add("visible");
  elements.questionInput.focus();
}

function clearAnswer() {
  elements.answerContainer.innerHTML = "";
}

function displayAnswer(data) {
  elements.answerContainer.innerHTML = `
        <div class="answer-header">
            <i class="fas fa-lightbulb"></i>
            Answer
        </div>
        <div class="answer-text">${data.answer || "No answer found"}</div>
        ${
          data.confidence
            ? `
        <div class="confidence">
            <i class="fas fa-chart-line"></i>
            Confidence: ${(data.confidence * 100).toFixed(2)}%
        </div>`
            : ""
        }
    `;
}

function resetUI() {
  context = "";
  elements.qaSection.classList.remove("visible");
  elements.questionInput.value = "";
  clearAnswer();
}
