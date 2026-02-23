(function () {
  const STORAGE_KEY = "frens_answers";
  const PROFILE_KEY = "frens_profile";
  const MUTE_KEY = "frens_muted";
  const MAX_HEARTS = 45;
  const HEART_SPAWN_MIN = 400;
  const HEART_SPAWN_MAX = 900;

  // To receive results when friends finish: create a form at https://formspree.io,
  // get your form endpoint, and set it here (e.g. "https://formspree.io/f/xxxxx").
  const SUBMIT_ENDPOINT = "";

  // Four identity characters: each has name (for "Is your name X?"), quizQuestion, quizAnswer
  const CHARACTERS = [
    { id: "char1", label: "Person 1", name: "Little Dana", src: "characters/AdaptiveImageGlyph-21B6C011-1469-46C9-B992-6832C40263320.png", quizQuestion: "What's my favorite juice mix?", quizAnswer: "orange peach" },
    { id: "char2", label: "Person 2", name: "Viki", src: "characters/AdaptiveImageGlyph-2BE3E35B-9267-4962-A359-8B2BEA0EA1370.png", quizQuestion: "What's our yearbook quote?", quizAnswer: "Half jinx?" },
    { id: "char3", label: "Person 3", name: "Big Dana", src: "characters/AdaptiveImageGlyph-56E1E849-01CE-432F-940C-BB3E10E1F9390.png", quizQuestion: "Whats's my favorite breakfast food you've cooked for me?", quizAnswer: "shakshuka" },
    { id: "char4", label: "Person 4", name: "Ash", src: "characters/AdaptiveImageGlyph-5BBC6511-982D-4EA7-B489-F4CC1E98A6250.png", quizQuestion: "What's our favorite day of the year?", quizAnswer: "may 2nd" }
  ];

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
  let userName = "";
  let character = CHARACTERS[0] ? CHARACTERS[0].id : "char1";
  let started = false;
  let muted = false;
  let unlockShown = false;
  let heartIntervalId = null;
  // Identity flow: 'circle' | 'confirmName' | 'identityQuiz' | 'warning'
  let startPhase = "circle";
  let selectedCharacter = null;
  let tryHarder = false;

  const stepContent = document.getElementById("step-content");
  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const progressChar = document.getElementById("progress-char");
  const progressBlock = document.getElementById("progress-block");
  const btnBack = document.getElementById("btn-back");
  const btnNext = document.getElementById("btn-next");
  const btnHome = document.getElementById("btn-home");
  const btnMute = document.getElementById("btn-mute");
  const heartContainer = document.getElementById("heart-container");
  const windowPanel = document.querySelector(".window-panel");

  function goToHome() {
    started = false;
    startPhase = "circle";
    selectedCharacter = null;
    if (windowPanel) windowPanel.classList.add("panel--start");
    if (btnHome) btnHome.hidden = true;
    if (btnNext) btnNext.hidden = true;
    if (btnBack) btnBack.hidden = true;
    renderIdentityCircle("normal");
  }

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
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.name) userName = p.name;
        if (p.character) character = p.character;
        if (userName) started = true;
      }
    } catch (_) {}
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch (_) {}
  }

  function saveProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: userName, character: character }));
    } catch (_) {}
  }

  function sendResultsToServer() {
    if (!SUBMIT_ENDPOINT || SUBMIT_ENDPOINT.length === 0) return;
    var payload = {
      name: userName,
      character: character,
      answers: answers,
      _subject: "Frens questionnaire: " + (userName || "Someone")
    };
    fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(function () {});
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function getCharacterDef(id) {
    return CHARACTERS.find(function (c) { return c.id === id; });
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
    if (progressChar) {
      progressChar.style.setProperty("--dog-left", Math.min(100, pct) + "%");
      progressChar.classList.add("dog-hop");
      progressChar.classList.remove("progress-char--dog", "progress-char--cat", "progress-char--star", "progress-char--img");
      var charDef = getCharacterDef(character);
      if (charDef && charDef.src) {
        progressChar.classList.add("progress-char--img");
        var sprite = progressChar.querySelector(".progress-char__sprite");
        if (sprite) {
          sprite.innerHTML = "";
          var img = document.createElement("img");
          img.src = charDef.src;
          img.alt = "";
          img.onerror = function () {
            character = "dog";
            saveProfile();
            progressChar.classList.remove("progress-char--img");
            progressChar.classList.add("progress-char--dog");
            sprite.innerHTML = "";
          };
          sprite.appendChild(img);
        }
      } else {
        progressChar.classList.add("progress-char--" + (charDef ? character : "dog"));
      }
      progressChar.addEventListener("animationend", function removeHop() {
        progressChar.classList.remove("dog-hop");
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

  function renderIdentityCircle(mode) {
    startPhase = "circle";
    stepContent.classList.remove("step-enter");
    void stepContent.offsetWidth;
    stepContent.classList.add("step-enter");
    var subtitle = mode === "liar" ? "Liar! Which one is you?" : (mode === "tryHarder" ? "Try harder — which one is you?" : "Which one is you?");
    var subtitleClass = "identity-start__subtitle" + (mode === "tryHarder" ? " identity-start__subtitle--try-harder" : "") + (mode === "liar" ? " identity-start__subtitle--liar" : "");
    var charHtml = CHARACTERS.map(function (c) {
      return '<button type="button" class="identity-circle__item" data-char="' + escapeHtml(c.id) + '">' +
        '<span class="identity-circle__sprite"><img src="' + escapeHtml(c.src) + '" alt=""></span>' +
        '</button>';
    }).join("");
    stepContent.innerHTML =
      '<div class="identity-start">' +
        '<p class="' + subtitleClass + '">' + escapeHtml(subtitle) + '</p>' +
        '<div class="identity-circle">' + charHtml + '</div>' +
      '</div>';
    btnBack.hidden = true;
    btnNext.hidden = true;
    stepContent.querySelectorAll(".identity-circle__item").forEach(function (el) {
      el.addEventListener("click", function () {
        playSound("click");
        var id = el.getAttribute("data-char");
        selectedCharacter = CHARACTERS.find(function (c) { return c.id === id; });
        if (!selectedCharacter) return;
        startPhase = "confirmName";
        renderConfirmName();
      });
    });
  }

  function renderConfirmName() {
    if (!selectedCharacter) return;
    stepContent.classList.remove("step-enter");
    void stepContent.offsetWidth;
    stepContent.classList.add("step-enter");
    var name = selectedCharacter.name;
    stepContent.innerHTML =
      '<div class="identity-confirm">' +
        '<div class="identity-selected-corner" aria-hidden="true">' +
          '<img src="' + escapeHtml(selectedCharacter.src) + '" alt="">' +
        '</div>' +
        '<div class="card identity-confirm__card">' +
          '<p class="identity-confirm__text">Is your name "' + escapeHtml(name) + '"?</p>' +
          '<div class="identity-confirm__actions">' +
            '<button type="button" class="btn btn-primary" id="btn-identity-yes">Yes</button>' +
            '<button type="button" class="btn btn-secondary" id="btn-identity-no">No</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    btnBack.hidden = true;
    btnNext.hidden = true;
    document.getElementById("btn-identity-yes").addEventListener("click", function () {
      playSound("click");
      startPhase = "identityQuiz";
      renderIdentityQuiz();
    });
    document.getElementById("btn-identity-no").addEventListener("click", function () {
      playSound("click");
      startPhase = "warning";
      renderWarningScreen();
    });
  }

  function renderWarningScreen() {
    stepContent.classList.remove("step-enter");
    void stepContent.offsetWidth;
    stepContent.classList.add("step-enter");
    stepContent.innerHTML =
      '<div class="identity-warning">' +
        '<div class="card">' +
          '<p class="identity-warning__message">I am taking this as a personal attack on my art skills</p>' +
          '<button type="button" class="btn btn-primary" id="btn-warning-back">Try again</button>' +
        '</div>' +
      '</div>';
    btnBack.hidden = true;
    btnNext.hidden = true;
    document.getElementById("btn-warning-back").addEventListener("click", function () {
      playSound("click");
      tryHarder = true;
      selectedCharacter = null;
      renderIdentityCircle("tryHarder");
    });
  }

  function renderIdentityQuiz() {
    if (!selectedCharacter) return;
    stepContent.classList.remove("step-enter");
    void stepContent.offsetWidth;
    stepContent.classList.add("step-enter");
    var q = escapeHtml(selectedCharacter.quizQuestion);
    stepContent.innerHTML =
      '<div class="identity-confirm">' +
        '<div class="identity-selected-corner" aria-hidden="true">' +
          '<img src="' + escapeHtml(selectedCharacter.src) + '" alt="">' +
        '</div>' +
        '<div class="card identity-quiz__card">' +
          '<label for="identity-quiz-answer">' + q + '</label>' +
          '<div class="input-wrap">' +
            '<input type="text" id="identity-quiz-answer" data-question-id="identity-quiz" placeholder="Your answer" autocomplete="off">' +
            '<span class="pixel-caret" aria-hidden="true"></span>' +
          '</div>' +
          '<button type="button" class="btn btn-primary" id="btn-quiz-submit">Prove it</button>' +
        '</div>' +
      '</div>';
    btnBack.hidden = true;
    btnNext.hidden = true;
    var input = document.getElementById("identity-quiz-answer");
    var wrap = input && input.closest(".input-wrap");
    if (input && wrap) {
      input.addEventListener("focus", function () {
        input.classList.add("input-focused");
        wrap.classList.add("input-wrap--focused");
      });
      input.addEventListener("blur", function () {
        input.classList.remove("input-focused");
        wrap.classList.remove("input-wrap--focused");
      });
    }
    document.getElementById("btn-quiz-submit").addEventListener("click", function () {
      playSound("click");
      var rawAnswer = (input && input.value.trim()) ? input.value.trim() : "";
      var answer = rawAnswer.toLowerCase().replace(/\s+/g, " ").trim();
      var expected = (selectedCharacter.quizAnswer || "").toLowerCase().replace(/\s+/g, " ").trim();
      var correct = (function () {
        if (answer === expected) return true;
        var expectedWords = expected.split(/\s+/).filter(Boolean);
        if (expectedWords.length >= 2) {
          return expectedWords.every(function (word) { return answer.indexOf(word) !== -1; });
        }
        return false;
      })();
      if (correct) {
        playSound("success");
        startQuestionnaire();
        renderIntroNote();
      } else {
        selectedCharacter = null;
        renderIdentityCircle("liar");
      }
    });
  }

  function startQuestionnaire() {
    if (!selectedCharacter) return;
    userName = selectedCharacter.name;
    character = selectedCharacter.id;
    saveProfile();
    started = true;
    if (windowPanel) windowPanel.classList.remove("panel--start");
    if (btnHome) btnHome.hidden = false;
    btnNext.hidden = false;
  }

  function renderIntroNote() {
    if (!selectedCharacter) return;
    var name = selectedCharacter.name || "you";
    if (progressBlock) progressBlock.hidden = true;
    if (btnBack) btnBack.hidden = true;
    if (btnNext) btnNext.hidden = true;
    stepContent.classList.remove("step-enter");
    void stepContent.offsetWidth;
    stepContent.classList.add("step-enter");
    stepContent.innerHTML =
      '<div class="intro-note">' +
        '<p class="intro-note__greeting">Hi ' + escapeHtml(name) + ',</p>' +
        '<p class="intro-note__body">This is a questionnaire I made because I have a very bad memory (as you guys already know) and it includes questions of things I never ever ever want to forget about you. As an apology for my bad memory I drew super cute pictures of you guys and well.. made this website using up every ounce of creativity that I don\'t have. Anyways answer truthfully and I\'ll never forget again promise!</p>' +
        '<button type="button" class="btn btn-primary" id="btn-intro-start">Let\'s go!</button>' +
      '</div>';
    document.getElementById("btn-intro-start").addEventListener("click", function () {
      playSound("click");
      if (progressBlock) progressBlock.hidden = false;
      updateProgress(0);
      renderStep(0);
    });
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
      var doneName = userName ? ", " + escapeHtml(userName) + "." : ".";
      stepContent.innerHTML = '<div class="done-screen">' +
        '<p class="done-screen__message">All done' + doneName + '</p>' +
        '<div class="unlock-block">' +
        '<div class="unlock-sticker">' +
        '<span class="unlock-sticker__badge" aria-hidden="true">★</span>' +
        '<span class="unlock-sticker__label">Unlocked!</span>' +
        '</div>' +
        '</div>' +
        '</div>';
      btnBack.hidden = false;
      btnNext.hidden = true;

      sendResultsToServer();

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
      answers[q.id] = getAnswerForStep(currentStep);
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
  if (!started) {
    if (windowPanel) windowPanel.classList.add("panel--start");
    if (btnHome) btnHome.hidden = true;
    renderIdentityCircle("normal");
  } else {
    if (btnHome) btnHome.hidden = false;
    updateProgress(0);
    renderStep(0);
  }
  if (btnHome) btnHome.addEventListener("click", function () {
    playSound("click");
    goToHome();
  });
  scheduleHeart();
})();
