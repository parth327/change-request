(function () {
  const form = document.getElementById("track-form");
  const btn = document.getElementById("track-btn");
  const btnText = document.getElementById("track-btn-text");
  const errorEl = document.getElementById("track-error");
  const errorTextEl = document.getElementById("track-error-text");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorEl.classList.add("hidden");
    btn.disabled = true;
    btnText.textContent = "Searching…";

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.email.value, refCode: form.refCode.value })
      });
      const data = await res.json();

      if (!res.ok) {
        errorTextEl.textContent = data.error || "Couldn't find that request.";
        errorEl.classList.remove("hidden");
        btn.disabled = false;
        btnText.textContent = "Find my request";
        return;
      }

      window.location.href = `/success/${data.id}`;
    } catch {
      errorTextEl.textContent = "Couldn't reach the server. Check your connection and try again.";
      errorEl.classList.remove("hidden");
      btn.disabled = false;
      btnText.textContent = "Find my request";
    }
  });
})();
