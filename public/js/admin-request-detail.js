(function () {
  const btn = document.getElementById("resend-btn");
  if (!btn) return;
  const statusEl = document.getElementById("resend-status");

  btn.addEventListener("click", async function () {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = `<span class="spinner border-accent-ink/30 border-t-accent-ink"></span> Resending…`;
    try {
      const res = await fetch(`/api/admin/requests/${btn.dataset.id}/resend`, { method: "POST" });
      const data = await res.json();
      statusEl.textContent = res.ok ? data.message : data.error || "Couldn't resend.";
      statusEl.classList.toggle("text-success", res.ok);
      statusEl.classList.toggle("text-danger", !res.ok);
      statusEl.classList.remove("hidden");
    } catch {
      statusEl.textContent = "Couldn't reach the server.";
      statusEl.classList.add("text-danger");
      statusEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
})();
