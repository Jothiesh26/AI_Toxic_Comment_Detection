
const comment = document.getElementById("comment");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const charCount = document.getElementById("charCount");
const errorMessage = document.getElementById("errorMessage");

const classification = document.getElementById("classification");
const verdictBox = document.getElementById("verdictBox");
const verdictIcon = document.getElementById("verdictIcon");
const verdictDescription = document.getElementById("verdictDescription");
const toxicityScore = document.getElementById("toxicityScore");
const progressBar = document.getElementById("progressBar");
const dfaMatches = document.getElementById("dfaMatches");
const automatonStates = document.getElementById("automatonStates");

let requestController = null;

comment.addEventListener("input", () => {
  charCount.textContent = comment.value.length;
});

function resetResults() {
  verdictBox.className = "verdict neutral";
  verdictIcon.textContent = "🔎";
  classification.textContent = "Ready to Analyze";
  verdictDescription.textContent =
    "Enter a comment to view the prediction.";

  toxicityScore.textContent = "--";
  progressBar.style.width = "0%";
  dfaMatches.textContent = "--";
  automatonStates.textContent = "--";
  errorMessage.textContent = "";
}

function showResult(data) {
  const isToxic = data.classification === "Toxic";

  verdictBox.className = isToxic
    ? "verdict danger"
    : "verdict safe";

  verdictIcon.textContent = isToxic ? "⚠️" : "✅";
  classification.textContent = data.classification;

  verdictDescription.textContent = isToxic
    ? "The system detected potentially toxic content."
    : "The comment does not appear to contain toxic content.";

  // The Flask backend returns ai_score between 0 and 1.
  const rawScore = Number(data.ai_score);
  const score = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, rawScore * 100))
    : 0;

  toxicityScore.textContent = score.toFixed(1) + "%";
  progressBar.style.width = score + "%";

  const matches = Array.isArray(data.matched_keywords)
    ? data.matched_keywords
    : [];

  dfaMatches.textContent = matches.length
    ? matches.join(", ")
    : "None";

  automatonStates.textContent =
    data.automata_states ?? "--";
}

analyzeBtn.addEventListener("click", async () => {
  const text = comment.value.trim();

  if (!text) {
    errorMessage.textContent = "Please enter a comment.";
    return;
  }

  errorMessage.textContent = "";
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";

  requestController = new AbortController();

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ comment: text }),
      signal: requestController.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    showResult(data);

  } catch (error) {
    if (error.name !== "AbortError") {
      errorMessage.textContent =
        error.message || "Unable to connect to the server.";
    }
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "🔍 Analyze Comment";
    requestController = null;
  }
});

clearBtn.addEventListener("click", () => {
  if (requestController) {
    requestController.abort();
  }
  comment.value = "";
  charCount.textContent = "0";
  resetResults();
});

document.querySelectorAll(".sample").forEach(button => {
  button.addEventListener("click", () => {
    comment.value = button.dataset.comment;
    charCount.textContent = comment.value.length;
    resetResults();
    comment.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

resetResults();
