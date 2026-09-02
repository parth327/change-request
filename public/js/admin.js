(function () {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", async function () {
    btn.disabled = true;
    btn.textContent = "Signing out…";
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  });
})();
