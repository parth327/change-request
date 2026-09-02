(function () {
  const form = document.getElementById("login-form");
  const btn = document.getElementById("login-btn");
  const btnText = document.getElementById("login-btn-text");
  const errorEl = document.getElementById("login-error");
  const errorTextEl = document.getElementById("login-error-text");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorEl.classList.add("hidden");
    btn.disabled = true;
    btnText.textContent = "Signing in…";

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.email.value, password: form.password.value })
      });
      const data = await res.json();

      if (!res.ok) {
        errorTextEl.textContent = data.error || "Couldn't sign in.";
        errorEl.classList.remove("hidden");
        btn.disabled = false;
        btnText.textContent = "Sign in";
        return;
      }

      window.location.href = form.dataset.from || "/admin";
    } catch {
      errorTextEl.textContent = "Couldn't reach the server. Check your connection and try again.";
      errorEl.classList.remove("hidden");
      btn.disabled = false;
      btnText.textContent = "Sign in";
    }
  });
})();
