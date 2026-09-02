(function () {
  const buttons = document.querySelectorAll(".mode-btn");
  const savedMsg = document.getElementById("saved-msg");
  const savedMsgText = document.getElementById("saved-msg-text");

  buttons.forEach((btn) => {
    btn.addEventListener("click", async function () {
      savedMsg.classList.add("hidden");
      buttons.forEach((b) => (b.disabled = true));
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ approvalMode: btn.dataset.mode })
        });
        if (!res.ok) {
          savedMsgText.textContent = "Couldn't save — please try again.";
          savedMsg.classList.remove("text-success");
          savedMsg.classList.add("text-danger");
          savedMsg.classList.remove("hidden");
          return;
        }
        buttons.forEach((b) => {
          b.classList.remove("border-accent", "ring-2", "ring-accent/25");
          b.querySelector(".selected-check").classList.add("hidden");
        });
        btn.classList.add("border-accent", "ring-2", "ring-accent/25");
        btn.querySelector(".selected-check").classList.remove("hidden");
        savedMsgText.textContent = "Saved.";
        savedMsg.classList.remove("text-danger");
        savedMsg.classList.add("text-success");
        savedMsg.classList.remove("hidden");
      } catch {
        savedMsgText.textContent = "Couldn't reach the server.";
        savedMsg.classList.remove("text-success");
        savedMsg.classList.add("text-danger");
        savedMsg.classList.remove("hidden");
      } finally {
        buttons.forEach((b) => (b.disabled = false));
      }
    });
  });
})();
