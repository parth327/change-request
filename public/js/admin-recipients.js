(function () {
  const addForm = document.getElementById("add-form");
  const addBtn = document.getElementById("add-btn");
  const addError = document.getElementById("add-error");
  const addErrorText = document.getElementById("add-error-text");

  addForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    addError.classList.add("hidden");
    addBtn.disabled = true;
    addBtn.innerHTML = `<span class="spinner"></span> Adding…`;

    try {
      const res = await fetch("/api/admin/recipients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.value,
          email: addForm.email.value,
          level: Number(addForm.level.value)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        addErrorText.textContent = data.error || "Couldn't add recipient.";
        addError.classList.remove("hidden");
        addBtn.disabled = false;
        addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add`;
        return;
      }
      window.location.reload();
    } catch {
      addErrorText.textContent = "Couldn't reach the server.";
      addError.classList.remove("hidden");
      addBtn.disabled = false;
      addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add`;
    }
  });

  document.querySelectorAll(".level-input").forEach((input) => {
    const original = input.value;
    input.addEventListener("blur", async function () {
      if (input.value === original) return;
      try {
        const res = await fetch(`/api/admin/recipients/${input.dataset.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ level: Number(input.value) })
        });
        if (!res.ok) {
          input.value = original;
          return;
        }
        window.location.reload();
      } catch {
        input.value = original;
      }
    });
  });

  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const active = btn.dataset.active === "true";
      btn.disabled = true;
      try {
        const res = await fetch(`/api/admin/recipients/${btn.dataset.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active: !active })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          btn.disabled = false;
        }
      } catch {
        btn.disabled = false;
      }
    });
  });
})();
