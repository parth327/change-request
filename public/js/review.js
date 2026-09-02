(function () {
  const container = document.getElementById("review-form");
  if (!container) return;

  const token = container.dataset.token;
  const commentEl = document.getElementById("comment");
  const errorEl = document.getElementById("review-error");
  const errorTextEl = document.getElementById("review-error-text");
  const resultEl = document.getElementById("review-result");
  const resultTextEl = document.getElementById("review-result-text");
  const actionsEl = document.getElementById("review-actions");
  const approveBtn = document.getElementById("approve-btn");
  const rejectBtn = document.getElementById("reject-btn");

  async function decide(decision) {
    errorEl.classList.add("hidden");
    approveBtn.disabled = true;
    rejectBtn.disabled = true;
    const clickedBtn = decision === "APPROVED" ? approveBtn : rejectBtn;
    const originalLabel = clickedBtn.innerHTML;
    clickedBtn.innerHTML = `<span class="spinner"></span> ${decision === "APPROVED" ? "Approving…" : "Rejecting…"}`;

    try {
      const res = await fetch(`/api/review/${token}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, comment: commentEl.value })
      });
      const data = await res.json();

      if (!res.ok) {
        errorTextEl.textContent = data.error || "Something went wrong.";
        errorEl.classList.remove("hidden");
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        clickedBtn.innerHTML = originalLabel;
        return;
      }

      commentEl.parentElement.classList.add("hidden");
      actionsEl.classList.add("hidden");
      resultTextEl.textContent = data.message || "Decision recorded.";
      resultEl.classList.remove("hidden");
    } catch {
      errorTextEl.textContent = "Couldn't reach the server. Check your connection and try again.";
      errorEl.classList.remove("hidden");
      approveBtn.disabled = false;
      rejectBtn.disabled = false;
      clickedBtn.innerHTML = originalLabel;
    }
  }

  approveBtn.addEventListener("click", () => decide("APPROVED"));
  rejectBtn.addEventListener("click", () => decide("REJECTED"));
})();
