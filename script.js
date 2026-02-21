(function () {
  const STORAGE_KEY = "frens_answers";
  const MUTE_KEY = "frens_muted";
  const MAX_HEARTS = 20;
  const HEART_SPAWN_MIN = 800;
  const HEART_SPAWN_MAX = 1500;

  const questions = [
    { id: "color", label: "Favorite color", type: "text", placeholder: "e.g. sky blue" },
    { id: "show", label: "Favorite show", type: "text", placeholder: "movie or series" },
    { id: "season", label: "Winter or summer?", type: "radio", options: [
      { value: "winter", label: "Winter" },
      { value: "summer", label: "Summer" }
    ]},
    { id: "car", label: "Dream car", type: "text", placeholder: "any vehicle" },
    { id: "snack", label: "Favorite snack", type: "text", placeholder: "e.g. chips, fruit" },
    { id: "time", label: "Morning or night person?", type: "radio", options: [
      { value: "morning", label: "Morning" },
      { value: "night", label: "Night" }
    ]},
    { id: "superpower", label: "One superpower you'd want", type: "text", placeholder: "e.g. flying, invisibility" }
  ];

  const totalQuestions = questions.length;
  let currentStep = 0;
  let answers = {};
  let muted = false;
  let unlockShown = false;
  let heartIntervalId = null;

  const stepContent = document.getElementById("step-content");
  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const progressDog = document.getElementById("progress-dog");
  const btnBack = document.getElementById("btn-back");
  const btnNext = document.getElementById("btn-next");
  const btnMute = document.getElementById("btn-mute");
  const heartContainer = document.getElementById("heart-container");

  function playSound(name) {
    if (muted) return;
    const el = document.getElementById("sound-" + name);
    if (!el) return;
    const src = el.getAttribute("src");
    if (!src || src === "") return;
    el.currentTime = 0;
    el.play().catch(function () {});
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) answers = Object.assign({}, answers, JSON.parse(raw));
    } catch (_) {}
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch (_) {}
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function getAnswerForStep(i) {
    const q = questions[i];
    if (!q) return undefined;
    if (q.type === "text") {
      const input = document.querySelector('[data-question-id="' + q.id + '"]');
      return input ? input.value.trim() : (answers[q.id] || "");
    }
    const checked = document.querySelector('input[name="' + q.id + '"]:checked');
    return checked ? checked.value : (answers[q.id] || "");
  }

  function setAnswerInDom(i, value) {
    const q = questions[i];
    if (!q) return;
    if (q.type === "text") {
      const input = document.querySelector('[data-question-id="' + q.id + '"]');
      if (input) input.value = value || "";
    } else {
      const radio = document.querySelector('input[name="' + q.id + '"][value="' + escapeHtml(value) + '"]');
      if (radio) radio.checked = true;
    }
  }

  function validateStep(i) {
    const q = questions[i];
    if (!q) return true;
    if (q.type === "text") {
      const val = getAnswerForStep(i);
      return val.length > 0;
    }
    const val = getAnswerForStep(i);
    return val.length > 0;
  }

  function updateProgress(i) {
    const denom = totalQuestions - 1;
    const pct = denom <= 0 ? 100 : (i / denom) * 100;
    if (progressFill) progressFill.style.setProperty("--progress", Math.min(100, pct) + "%");
    if (progressDog) {
      progressDog.style.setProperty("--dog-left", Math.min(100, pct) + "%");
      progressDog.classList.add("dog-hop");
      progressDog.addEventListener("animationend", function removeHop() {
        progressDog.removeEventListener("animationend", removeHop);
        progressDog.classList.remove("dog-hop");
      }, { once: true });
    }
    if (progressText) {
      if (i < totalQuestions) {
        progressText.textContent = "Question " + (i + 1) + " of " + totalQuestions;
        progressText.hidden = false;
      } else {
        progressText.textContent = "Done";
      }
    }
  }

  function renderStep(i) {
    stepContent.classList.remove("step-enter");
    void stepContent.offsetWidth;
    stepContent.classList.add("step-enter");

    if (i < totalQuestions) {
      const q = questions[i];
      let html = '<div class="card" data-step="' + i + '">';
      if (q.type === "text") {
        html += '<label for="q-' + q.id + '">' + escapeHtml(q.label) + "</label>";
        html += '<div class="input-wrap">';
        html += '<input type="text" id="q-' + q.id + '" data-question-id="' + q.id + '" placeholder="' + escapeHtml(q.placeholder || "") + '" autocomplete="off" value="' + escapeHtml(answers[q.id] || "") + '">';
        html += '<span class="pixel-caret" aria-hidden="true"></span>';
        html += "</div>";
      } else {
        html += '<span class="label">' + escapeHtml(q.label) + "</span>";
        html += '<div class="radio-group">';
        q.options.forEach(function (opt) {
          const checked = answers[q.id] === opt.value ? ' checked' : '';
          html += '<label class="radio-label"><input type="radio" name="' + escapeHtml(q.id) + '" value="' + escapeHtml(opt.value) + '"' + checked + '> ' + escapeHtml(opt.label) + '</label>';
        });
        html += "</div>";
      }
      html += "</div>";
      stepContent.innerHTML = html;
      setAnswerInDom(i, answers[q.id]);

      var textInput = stepContent.querySelector('input[type="text"]');
      if (textInput) {
        var wrap = textInput.closest(".input-wrap");
        textInput.addEventListener("focus", function () {
          textInput.classList.add("input-focused");
          if (wrap) wrap.classList.add("input-wrap--focused");
        });
        textInput.addEventListener("blur", function () {
          textInput.classList.remove("input-focused");
          if (wrap) wrap.classList.remove("input-wrap--focused");
        });
      }

      btnNext.textContent = i === totalQuestions - 1 ? "Finish" : "Next";
      btnBack.hidden = true;
      if (i > 0) btnBack.hidden = false;
    } else {
      stepContent.innerHTML = '<div class="done-screen">' +
        '<p class="done-screen__message">All done.</p>' +
        '<div class="unlock-block">' +
        '<div class="unlock-sticker">' +
        '<span class="unlock-sticker__badge" aria-hidden="true">★</span>' +
        '<span class="unlock-sticker__label">Unlocked!</span>' +
        '</div>' +
        '</div>' +
        '</div>';
      btnBack.hidden = false;
      btnNext.hidden = true;

      if (!unlockShown) {
        unlockShown = true;
        var burst = document.createElement("div");
        burst.className = "unlock-burst";
        burst.setAttribute("aria-hidden", "true");
        var count = 12;
        for (var b = 0; b < count; b++) {
          var angle = (b / count) * Math.PI * 2 + Math.random() * 0.5;
          var dist = 60 + Math.random() * 40;
          var bx = Math.cos(angle) * dist;
          var by = Math.sin(angle) * dist;
          var p = document.createElement("span");
          p.className = "burst-particle";
          p.style.setProperty("--bx", bx + "px");
          p.style.setProperty("--by", by + "px");
          burst.appendChild(p);
        }
        var panel = stepContent.closest(".window-panel");
        if (panel) {
          panel.style.position = "relative";
          panel.appendChild(burst);
          setTimeout(function () {
            if (burst.parentNode) burst.parentNode.removeChild(burst);
          }, 700);
        }
      }
    }
  }

  function goNext() {
    playSound("click");
    if (currentStep < totalQuestions && !validateStep(currentStep)) return;

    if (currentStep < totalQuestions) {
      var q = questions[currentStep];
      if (q.type === "text") {
        answers[q.id] = getAnswerForStep(currentStep);
      } else {
        answers[q.id] = getAnswerForStep(currentStep);
      }
      saveToStorage();
    }

    if (currentStep === totalQuestions - 1) {
      playSound("success");
      currentStep++;
      updateProgress(currentStep);
      renderStep(currentStep);
      return;
    }

    if (currentStep < totalQuestions) {
      playSound("success");
      currentStep++;
      updateProgress(currentStep);
      renderStep(currentStep);
    }
  }

  function goBack() {
    playSound("click");
    if (currentStep <= 0) return;
    currentStep--;
    updateProgress(currentStep);
    renderStep(currentStep);
    if (currentStep === totalQuestions - 1) btnNext.textContent = "Finish";
    btnNext.hidden = false;
  }

  function spawnHeart() {
    if (!heartContainer) return;
    if (heartContainer.children.length >= MAX_HEARTS) {
      var first = heartContainer.firstElementChild;
      if (first) first.remove();
    }
    var el = document.createElement("span");
    el.className = "heart-float";
    el.setAttribute("aria-hidden", "true");
    el.style.left = Math.random() * 100 + "%";
    el.style.top = "100%";
    heartContainer.appendChild(el);
    el.addEventListener("animationend", function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, { once: true });
  }

  function scheduleHeart() {
    var delay = HEART_SPAWN_MIN + Math.random() * (HEART_SPAWN_MAX - HEART_SPAWN_MIN);
    heartIntervalId = setTimeout(function () {
      spawnHeart();
      scheduleHeart();
    }, delay);
  }

  btnNext.addEventListener("click", goNext);
  btnBack.addEventListener("click", goBack);

  if (btnMute) {
    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
      if (muted) btnMute.classList.add("is-muted");
    } catch (_) {}
    btnMute.addEventListener("click", function () {
      muted = !muted;
      btnMute.classList.toggle("is-muted", muted);
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch (_) {}
    });
  }

  loadSaved();
  updateProgress(0);
  renderStep(0);
  scheduleHeart();
})();
