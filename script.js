(function () {
  const STORAGE_KEY = "frens_answers";

  const form = document.getElementById("questionnaire");
  const formSection = document.getElementById("form-section");
  const resultsSection = document.getElementById("results-section");
  const resultsList = document.getElementById("results-list");
  const copyBtn = document.getElementById("copy-btn");
  const copyFeedback = document.getElementById("copy-feedback");
  const backBtn = document.getElementById("back-btn");

  let lastSubmittedData = {};

  const questionLabels = {
    color: "Favorite color",
    show: "Favorite show",
    season: "Winter or summer?",
    car: "Dream car",
    snack: "Favorite snack",
    time: "Morning or night person?",
    superpower: "One superpower you'd want",
  };

  function getFormData() {
    const data = new FormData(form);
    const result = {};
    for (const [key, value] of data.entries()) {
      if (value && value.trim()) result[key] = value.trim();
    }
    return result;
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      Object.keys(saved).forEach(function (name) {
        const input = form.elements[name];
        if (!input) return;
        if (input.type === "radio") {
          const option = form.querySelector('input[name="' + name + '"][value="' + saved[name] + '"]');
          if (option) option.checked = true;
        } else {
          input.value = saved[name];
        }
      });
    } catch (_) {}
  }

  function saveToStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function renderResults(data) {
    resultsList.innerHTML = "";
    Object.keys(questionLabels).forEach(function (key) {
      const value = data[key];
      if (value == null || value === "") return;
      const li = document.createElement("li");
      li.innerHTML = '<span class="q">' + escapeHtml(questionLabels[key]) + "</span>" + escapeHtml(value);
      resultsList.appendChild(li);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function showResults(data) {
    lastSubmittedData = data;
    renderResults(data);
    formSection.hidden = true;
    resultsSection.hidden = false;
    copyFeedback.textContent = "";
  }

  function showForm() {
    resultsSection.hidden = true;
    formSection.hidden = false;
  }

  function buildCopyText(data) {
    return Object.keys(questionLabels)
      .filter(function (key) {
        const v = data[key];
        return v != null && v !== "";
      })
      .map(function (key) {
        return questionLabels[key] + ": " + data[key];
      })
      .join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = getFormData();
    saveToStorage(data);
    showResults(data);
  });

  copyBtn.addEventListener("click", function () {
    const text = buildCopyText(lastSubmittedData);
    if (!text) {
      copyFeedback.textContent = "Nothing to copy.";
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(function () {
        copyFeedback.textContent = "Copied!";
        setTimeout(function () {
          copyFeedback.textContent = "";
        }, 2000);
      })
      .catch(function () {
        copyFeedback.textContent = "Copy failed.";
      });
  });

  backBtn.addEventListener("click", showForm);

  loadSaved();
})();
