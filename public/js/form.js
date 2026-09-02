(function () {
  const form = document.getElementById("request-form");
  const submitBtn = document.getElementById("submit-btn");
  const submitBtnText = document.getElementById("submit-btn-text");
  const formError = document.getElementById("form-error");
  const formErrorText = document.getElementById("form-error-text");

  function clearErrors() {
    formError.classList.add("hidden");
    formErrorText.textContent = "";
    document.querySelectorAll(".field-error").forEach((el) => {
      el.classList.add("hidden");
      el.textContent = "";
    });
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtnText.textContent = loading ? "Submitting…" : "Submit request";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const payload = {
      email: form.email.value,
      changeDate: form.changeDate.value,
      description: form.description.value,
      reason: form.reason.value
    };

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.issues) {
          Object.entries(data.issues).forEach(([field, messages]) => {
            const el = document.getElementById(`${field}-error`);
            if (el && messages && messages[0]) {
              el.textContent = messages[0];
              el.classList.remove("hidden");
            }
          });
        }
        formErrorText.textContent = data.error || "Something went wrong. Please try again.";
        formError.classList.remove("hidden");
        setLoading(false);
        return;
      }

      window.location.href = `/success/${data.id}`;
    } catch {
      formErrorText.textContent = "Couldn't reach the server. Check your connection and try again.";
      formError.classList.remove("hidden");
      setLoading(false);
    }
  });
})();
