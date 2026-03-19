const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore write errors for private mode.
    }
  },
};

const sessionsKey = "luxSessions";
const modesKey = "luxModes";

const sessionList = document.getElementById("sessionList");
const sessionCount = document.getElementById("sessionCount");
const emptyState = document.getElementById("emptyState");
const experienceForm = document.getElementById("experienceForm");
const intensityRange = document.getElementById("intensityRange");
const intensityValue = document.getElementById("intensityValue");
const clearSchedule = document.getElementById("clearSchedule");
const auraMeter = document.getElementById("auraMeter");
const auraLabel = document.getElementById("auraLabel");
const toggleGroup = document.getElementById("toggleGroup");
const conciergeInsight = document.getElementById("conciergeInsight");
const refreshInsight = document.getElementById("refreshInsight");

const insights = [
  "Take a deep breath and let the velvet calm surround you.",
  "Luxury tip: pair Golden Boost with a short walk for extra glow.",
  "Crystal Clarity shines best when you reduce screen brightness.",
  "Sleep Halo mode works beautifully with a cozy blanket ritual.",
  "Focus Flow loves a tidy space and a gentle cup of tea.",
];

function renderSessions() {
  const sessions = storage.get(sessionsKey, []);
  sessionList.innerHTML = "";

  sessions.forEach((session, index) => {
    const item = document.createElement("li");
    item.className = "session-item";

    const top = document.createElement("div");
    top.className = "session-top";

    const title = document.createElement("strong");
    title.textContent = session.mood;

    const actions = document.createElement("div");
    actions.className = "session-actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeSession(index));

    actions.append(removeButton);
    top.append(title, actions);

    const details = document.createElement("p");
    details.textContent = `Intensity ${session.intensity} · ${session.duration} min`;

    const notes = document.createElement("span");
    notes.textContent = session.notes ? `“${session.notes}”` : "No notes added";
    notes.className = "muted";

    item.append(top, details, notes);
    sessionList.append(item);
  });

  sessionCount.textContent = `${sessions.length} session${sessions.length === 1 ? "" : "s"}`;
  emptyState.style.display = sessions.length ? "none" : "block";
  updateAura();
}

function removeSession(index) {
  const sessions = storage.get(sessionsKey, []);
  sessions.splice(index, 1);
  storage.set(sessionsKey, sessions);
  renderSessions();
}

function updateAura() {
  const sessions = storage.get(sessionsKey, []);
  const activeModes = storage.get(modesKey, []);
  const base = 35;
  const value = Math.min(100, base + sessions.length * 6 + activeModes.length * 8);
  auraMeter.style.width = `${value}%`;
  auraLabel.textContent = `Aura level: ${value}%`;
}

function handleFormSubmit(event) {
  event.preventDefault();
  const mood = document.getElementById("moodSelect").value;
  const intensity = intensityRange.value;
  const duration = document.getElementById("durationInput").value;
  const notes = document.getElementById("notesInput").value.trim();

  const sessions = storage.get(sessionsKey, []);
  sessions.unshift({ mood, intensity, duration, notes });
  storage.set(sessionsKey, sessions);
  experienceForm.reset();
  intensityValue.textContent = intensityRange.value;
  renderSessions();
}

function handleToggle(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const mode = button.dataset.mode;
  if (!mode) return;

  const modes = new Set(storage.get(modesKey, []));
  if (modes.has(mode)) {
    modes.delete(mode);
    button.classList.remove("active");
  } else {
    modes.add(mode);
    button.classList.add("active");
    conciergeInsight.textContent = insights[Math.floor(Math.random() * insights.length)];
  }
  storage.set(modesKey, [...modes]);
  updateAura();
}

function restoreModes() {
  const modes = storage.get(modesKey, []);
  document.querySelectorAll(".toggle-button").forEach((button) => {
    if (modes.includes(button.dataset.mode)) {
      button.classList.add("active");
    }
  });
}

function bindRipple() {
  document.querySelectorAll("[data-ripple]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const circle = document.createElement("span");
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
      circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
      circle.classList.add("ripple");

      const existing = button.querySelector(".ripple");
      if (existing) {
        existing.remove();
      }

      button.appendChild(circle);
    });
  });
}

function refreshInsightText() {
  conciergeInsight.textContent = insights[Math.floor(Math.random() * insights.length)];
}

intensityRange.addEventListener("input", () => {
  intensityValue.textContent = intensityRange.value;
});

experienceForm.addEventListener("submit", handleFormSubmit);
clearSchedule.addEventListener("click", () => {
  storage.set(sessionsKey, []);
  renderSessions();
});

toggleGroup.addEventListener("click", handleToggle);
refreshInsight.addEventListener("click", refreshInsightText);

bindRipple();
restoreModes();
renderSessions();
refreshInsightText();
