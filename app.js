const STORAGE_KEY = "classroom-assignment-tracker-v1";
const USERS_KEY = "classroom-local-users-v1";
const SESSION_KEY = "classroom-local-session-v1";
const PBKDF2_ITERATIONS = 310000;

const seedStudents = [
  { id: "emma", name: "Emma Chen", email: "emma.chen@school.edu", color: "purple" },
  { id: "liam", name: "Liam Patel", email: "liam.patel@school.edu", color: "green" },
  { id: "sofia", name: "Sofia Rivera", email: "sofia.rivera@school.edu", color: "orange" },
  { id: "noah", name: "Noah Kim", email: "noah.kim@school.edu", color: "blue" },
  { id: "ava", name: "Ava Brooks", email: "ava.brooks@school.edu", color: "pink" },
];
let students = seedStudents.map((student) => ({ ...student }));

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", roles: ["instructor", "student"] },
  { id: "assignments", label: "Assignments", icon: "▤", roles: ["instructor", "student"] },
];

const subjectMeta = {
  Mathematics: { icon: "∑", className: "math" },
  Science: { icon: "⚗", className: "science" },
  English: { icon: "Aa", className: "english" },
  History: { icon: "⌖", className: "history" },
  "Visual Arts": { icon: "✳", className: "art" },
};

const initials = (name) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const dateAt = (offset) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

function createSeedState() {
  const assignmentSeed = [
    {
      id: "alg-01",
      title: "Algebra in the real world",
      subject: "Mathematics",
      description: "Find a real-world example of a linear equation and show how it works.",
      dueDate: dateAt(2),
      points: 20,
      createdAt: dateAt(-3),
      submissions: [
        { studentId: "emma", status: "assigned" },
        { studentId: "liam", status: "submitted", submittedAt: dateAt(-1), work: "A taxi fare example: base fare + cost per mile." },
        { studentId: "sofia", status: "graded", submittedAt: dateAt(-2), work: "I modeled the cost of a phone plan with y = 15 + 8x.", grade: 18, feedback: "Great choice of example. Label both variables next time." },
        { studentId: "noah", status: "assigned" },
        { studentId: "ava", status: "submitted", submittedAt: dateAt(0), work: "https://classroom.example/work/ava-algebra" },
      ],
    },
    {
      id: "bio-02",
      title: "Build a tiny ecosystem",
      subject: "Science",
      description: "Map a local ecosystem and explain how energy moves through it.",
      dueDate: dateAt(4),
      points: 30,
      createdAt: dateAt(-2),
      submissions: [
        { studentId: "emma", status: "submitted", submittedAt: dateAt(-1), work: "Grass → grasshopper → frog → heron. The sun provides the starting energy." },
        { studentId: "liam", status: "assigned" },
        { studentId: "sofia", status: "assigned" },
        { studentId: "noah", status: "graded", submittedAt: dateAt(-1), work: "https://classroom.example/work/noah-ecosystem", grade: 27, feedback: "Thoughtful food web and clear energy arrows." },
        { studentId: "ava", status: "assigned" },
      ],
    },
    {
      id: "eng-03",
      title: "A letter from the future",
      subject: "English",
      description: "Write a one-page letter from your future self. Focus on voice and detail.",
      dueDate: dateAt(6),
      points: 25,
      createdAt: dateAt(-1),
      submissions: [
        { studentId: "emma", status: "assigned" },
        { studentId: "liam", status: "graded", submittedAt: dateAt(-1), work: "I wrote about opening a community garden in my neighborhood.", grade: 23, feedback: "Warm, specific voice. Your closing is especially strong." },
        { studentId: "sofia", status: "assigned" },
        { studentId: "noah", status: "assigned" },
        { studentId: "ava", status: "assigned" },
      ],
    },
    {
      id: "his-04",
      title: "Voices of the past",
      subject: "History",
      description: "Choose a primary source and write what it can tell us—and what it cannot.",
      dueDate: dateAt(0),
      points: 15,
      createdAt: dateAt(-5),
      submissions: [
        { studentId: "emma", status: "graded", submittedAt: dateAt(-1), work: "I chose a newspaper clipping from the school archive.", grade: 14, feedback: "Good source analysis. Add one sentence about who published it." },
        { studentId: "liam", status: "assigned" },
        { studentId: "sofia", status: "submitted", submittedAt: dateAt(0), work: "A diary entry from the local history collection." },
        { studentId: "noah", status: "assigned" },
        { studentId: "ava", status: "assigned" },
      ],
    },
    {
      id: "art-05",
      title: "Color, shape & feeling",
      subject: "Visual Arts",
      description: "Create a small abstract piece that communicates a mood without words.",
      dueDate: dateAt(9),
      points: 20,
      createdAt: dateAt(-1),
      submissions: students.map((student) => ({ studentId: student.id, status: "assigned" })),
    },
  ];
  return { role: "instructor", studentId: "emma", page: "dashboard", assignments: assignmentSeed, students: seedStudents.map((student) => ({ ...student })) };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    const initial = createSeedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  const parsed = JSON.parse(stored);
  if (!parsed || !Array.isArray(parsed.assignments)) {
    throw new Error("Saved assignment data is invalid. Clear this site's data to start fresh.");
  }
  if (!Array.isArray(parsed.students)) parsed.students = seedStudents.map((student) => ({ ...student }));
  students = parsed.students;
  if (!students.some((student) => student.id === parsed.studentId)) parsed.studentId = students[0]?.id || "";
  if (!["instructor", "student"].includes(parsed.role)) parsed.role = "instructor";
  if (!navigation.some((item) => item.id === parsed.page && item.roles.includes(parsed.role))) parsed.page = "dashboard";
  return parsed;
}

let state;
let sessionUser = null;
let toastTimeout;
let authMode = "signin";
let selectedSignupRole = "student";
let authNoticeTimeout;
const pageHistory = [];
const authScreen = document.querySelector("#authScreen");
const authForm = document.querySelector("#authForm");
const pageContent = document.querySelector("#pageContent");
const dialog = document.querySelector("#appDialog");
const dialogContent = document.querySelector("#dialogContent");
const toastRegion = document.querySelector("#toastRegion");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatDate(isoDate, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en", options).format(new Date(`${isoDate}T12:00:00`));
}

function dayDifference(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${isoDate}T12:00:00`).getTime() - today.getTime()) / 86400000);
}

function getStudent(studentId = state.studentId) {
  return students.find((student) => student.id === studentId);
}

function readUsers() {
  const storedUsers = localStorage.getItem(USERS_KEY);
  if (storedUsers === null) return [];
  const parsedUsers = JSON.parse(storedUsers);
  if (!Array.isArray(parsedUsers)) throw new Error("Saved sign-in details are invalid. Clear this site's data to start fresh.");
  return parsedUsers;
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure sign-in needs a modern browser. Open this app in a browser that supports Web Crypto.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations: PBKDF2_ITERATIONS,
    hash: "SHA-256",
  }, key, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
}

async function ensureDemoAccounts() {
  const users = readUsers();
  const demos = [
    { id: "demo-instructor", name: "Jordan Davis", email: "teacher.demo@classroom.school", role: "instructor" },
    { id: "demo-student", name: "Emma Chen", email: "emma.chen@school.edu", role: "student", studentId: "emma" },
  ];
  let changed = false;
  for (const demo of demos) {
    if (users.some((user) => user.id === demo.id)) continue;
    const salt = randomSalt();
    users.push({ ...demo, salt, passwordHash: await hashPassword("ClassroomDemo2026!", hexToBytes(salt)) });
    changed = true;
  }
  if (changed) writeUsers(users);
}

async function startSession(user) {
  sessionStorage.setItem(SESSION_KEY, user.id);
  sessionUser = user;
  commit((nextState) => {
    nextState.role = user.role;
    nextState.page = "dashboard";
    if (user.role === "student") nextState.studentId = user.studentId;
  });
  authScreen.hidden = true;
  document.querySelector(".app-shell").hidden = false;
  render();
}

function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionUser = null;
  pageHistory.length = 0;
  state.page = "dashboard";
  authScreen.hidden = false;
  document.querySelector(".app-shell").hidden = true;
  setAuthMode("signin");
  showAuthNotice("You’ve signed out. See you next time.");
}

function showAuthNotice(message, isError = false) {
  const notice = document.querySelector("#authNotice");
  notice.textContent = message;
  notice.classList.toggle("error", isError);
  notice.classList.add("visible");
  clearTimeout(authNoticeTimeout);
  authNoticeTimeout = setTimeout(() => notice.classList.remove("visible"), 3600);
}

function renderAuthForm() {
  const isSignup = authMode === "signup";
  document.querySelector("#authEyebrow").textContent = isSignup ? "TRACK YOUR WORK" : "WELCOME BACK";
  document.querySelector("#authTitle").textContent = isSignup ? "Let’s get you set up." : "Good to have you back.";
  document.querySelector("#authSubtitle").textContent = isSignup
    ? "Create an account to track and manage assignments."
    : "Sign in to pick up right where you left off.";
  document.querySelector("#signInTab").classList.toggle("active", !isSignup);
  document.querySelector("#signInTab").setAttribute("aria-selected", String(!isSignup));
  document.querySelector("#createAccountTab").classList.toggle("active", isSignup);
  document.querySelector("#createAccountTab").setAttribute("aria-selected", String(isSignup));

  authForm.innerHTML = `${isSignup ? `
    <div class="field"><label for="accountName">Your name</label><div class="input-with-icon"><span aria-hidden="true">✳</span><input id="accountName" name="name" autocomplete="name" maxlength="60" required placeholder="e.g. Taylor Morgan" /></div></div>
    <fieldset class="role-picker"><legend>I’m joining as a...</legend><div class="role-options">
      <button class="role-option${selectedSignupRole === "student" ? " selected" : ""}" type="button" data-signup-role="student" aria-pressed="${selectedSignupRole === "student"}"><span aria-hidden="true">✿</span><span><strong>Student</strong><small>Learn & turn in work</small></span><span class="role-check">✓</span></button>
      <button class="role-option${selectedSignupRole === "instructor" ? " selected" : ""}" type="button" data-signup-role="instructor" aria-pressed="${selectedSignupRole === "instructor"}"><span aria-hidden="true">✳</span><span><strong>Instructor</strong><small>Create and review assignments</small></span><span class="role-check">✓</span></button>
    </div></fieldset>` : ""}
    <div class="field"><label for="accountEmail">School email</label><div class="input-with-icon"><span aria-hidden="true">@</span><input id="accountEmail" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@school.edu" /></div></div>
    <div class="field"><div class="password-label"><label for="accountPassword">Password</label>${isSignup ? `<span class="password-hint">At least 8 characters</span>` : ""}</div>
      <div class="input-with-icon password-input"><span aria-hidden="true">⌑</span><input id="accountPassword" name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" minlength="8" required maxlength="128" placeholder="${isSignup ? "Choose a password" : "Enter your password"}" /><button class="password-toggle" type="button" data-toggle-password aria-label="Show password">Show</button></div>
      ${isSignup ? `<div class="password-meter" id="passwordMeter" aria-live="polite"><span></span><span></span><span></span><small>Use a mix of letters and numbers.</small></div>` : ""}
    </div>
    <p class="auth-error" id="authError" role="alert"></p>
    <button class="primary-button auth-submit" type="submit"><span>${isSignup ? "Create my account" : "Sign in"}</span><span aria-hidden="true">→</span></button>
    ${isSignup ? `<p class="auth-switch-copy">Already have an account? <button type="button" data-auth-mode="signin">Sign in</button></p>` : `<p class="auth-switch-copy">New to the assignment tracker? <button type="button" data-auth-mode="signup">Create an account</button></p>`}`;
}

function setAuthMode(mode) {
  authMode = mode;
  renderAuthForm();
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12 || (/[a-z]/i.test(password) && /\d/.test(password))) score += 1;
  if (/[^a-z0-9]/i.test(password) && /[a-z]/i.test(password) && /\d/.test(password)) score += 1;
  return score;
}

function renderPasswordStrength(password) {
  const meter = document.querySelector("#passwordMeter");
  if (!meter) return;
  const strength = passwordStrength(password);
  meter.dataset.strength = String(strength);
  meter.querySelector("small").textContent = password.length === 0
    ? "Use a mix of letters and numbers."
    : ["Add a few more characters.", "A good start — add a number or symbol.", "Nice and strong.", "Lovely. That’s a strong password."][strength];
}

async function handleDemoLogin(role) {
  try {
    const users = readUsers();
    const user = users.find((item) => item.id === (role === "student" ? "demo-student" : "demo-instructor"));
    if (!user) throw new Error("The demo account isn’t available right now.");
    await startSession(user);
  } catch (error) {
    showAuthNotice(error.message, true);
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const data = new FormData(authForm);
  const email = String(data.get("email") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  const errorElement = document.querySelector("#authError");
  errorElement.textContent = "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorElement.textContent = "Enter a valid school email address.";
    document.querySelector("#accountEmail").focus();
    return;
  }
  if (authMode === "signup") {
    const name = String(data.get("name") || "").trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      errorElement.textContent = "Please enter your name so it can appear on your assignments.";
      document.querySelector("#accountName").focus();
      return;
    }
    if (password.length < 8) {
      errorElement.textContent = "Choose a password with at least 8 characters.";
      document.querySelector("#accountPassword").focus();
      return;
    }
    if (password.length > 128) {
      errorElement.textContent = "Choose a password with 128 characters or fewer.";
      document.querySelector("#accountPassword").focus();
      return;
    }
    try {
      const users = readUsers();
      if (users.some((user) => user.email.toLowerCase() === email)) {
        errorElement.textContent = "An account with that email already exists. Try signing in instead.";
        document.querySelector("#accountEmail").focus();
        return;
      }
      const salt = randomSalt();
      const user = {
        id: `user-${crypto.randomUUID()}`,
        name,
        email,
        role: selectedSignupRole,
        salt,
        passwordHash: await hashPassword(password, hexToBytes(salt)),
      };
      if (user.role === "student") {
        const student = {
          id: user.id,
          name,
          email,
          color: ["sage", "coral", "blue", "gold", "rose"][students.length % 5],
        };
        user.studentId = student.id;
        commit((nextState) => {
          nextState.students.push(student);
          for (const assignment of nextState.assignments) {
            assignment.submissions.push({ studentId: student.id, status: "assigned" });
          }
        });
      }
      writeUsers([...users, user]);
      await startSession(user);
      showToast(`Welcome to the assignment tracker, ${name.split(" ")[0]}!`);
    } catch (error) {
      errorElement.textContent = `Couldn’t create your account: ${error.message}`;
    }
    return;
  }

  if (!password || password.length > 128) {
    errorElement.textContent = "Enter your password to continue.";
    document.querySelector("#accountPassword").focus();
    return;
  }
  try {
    const user = readUsers().find((item) => item.email.toLowerCase() === email);
    if (!user || !user.salt || !user.passwordHash) {
      errorElement.textContent = "We couldn’t find an account with those details. Check your email or create an account.";
      return;
    }
    const hash = await hashPassword(password, hexToBytes(user.salt));
    if (hash !== user.passwordHash) {
      errorElement.textContent = "That email and password don’t match. Give it another try.";
      document.querySelector("#accountPassword").focus();
      return;
    }
    await startSession(user);
    showToast(`Welcome back, ${user.name.split(" ")[0]}!`);
  } catch (error) {
    errorElement.textContent = `Sign-in couldn’t be completed: ${error.message}`;
  }
}

function getSubmission(assignment, studentId) {
  return assignment.submissions.find((submission) => submission.studentId === studentId);
}

function statusFor(submission, dueDate) {
  if (!submission || submission.status === "assigned") return dayDifference(dueDate) < 0 ? "missing" : "assigned";
  return submission.status;
}

function statusLabel(status) {
  return ({ assigned: "To do", submitted: "Submitted", graded: "Graded", missing: "Missing", review: "Needs review" })[status] || status;
}

function statusBadge(status) {
  return `<span class="status-badge ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`;
}

function subjectMark(subject) {
  const meta = subjectMeta[subject] || { icon: "▤", className: "math" };
  return `<span class="subject-mark ${meta.className}" aria-hidden="true">${meta.icon}</span>`;
}

function dueLabel(date) {
  const difference = dayDifference(date);
  if (difference < 0) return { label: `${Math.abs(difference)} day${Math.abs(difference) === 1 ? "" : "s"} overdue`, className: "late" };
  if (difference === 0) return { label: "Due today", className: "soon" };
  if (difference === 1) return { label: "Due tomorrow", className: "soon" };
  return { label: `Due ${formatDate(date)}`, className: "" };
}

function commit(update) {
  const nextState = JSON.parse(JSON.stringify(state));
  update(nextState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  state = nextState;
  students = state.students;
  render();
}

function showToast(message, isError = false) {
  toastRegion.innerHTML = `<div class="toast${isError ? " error" : ""}" role="status">${escapeHtml(message)}</div>`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toastRegion.innerHTML = ""; }, 3200);
}

function renderNavigation() {
  const items = navigation.filter((item) => item.roles.includes(state.role));
  if (!items.some((item) => item.id === state.page)) state.page = "dashboard";
  document.querySelector("#mainNav").innerHTML = items.map((item) => {
    const active = state.page === item.id;
    const pendingCount = item.id === "assignments" && state.role === "instructor"
      ? state.assignments.reduce((total, assignment) => total + assignment.submissions.filter((submission) => submission.status === "submitted").length, 0)
      : 0;
    return `<button class="nav-item${active ? " active" : ""}" type="button" data-page="${item.id}"${active ? ' aria-current="page"' : ""}>
      <span class="nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span>
      ${pendingCount ? `<span class="nav-count">${pendingCount}</span>` : ""}
    </button>`;
  }).join("");
  document.querySelector("#breadcrumbCurrent").textContent = items.find((item) => item.id === state.page)?.label || "Dashboard";
  document.querySelector("#backButton").disabled = pageHistory.length === 0;
}

function renderHeader() {
  const person = state.role === "instructor"
    ? { name: sessionUser?.name || "Instructor", color: "sage" }
    : getStudent(state.studentId);
  document.querySelector("#profileName").textContent = person.name;
  document.querySelector("#profileRole").textContent = state.role === "instructor" ? "Instructor" : "Student";
  const avatar = document.querySelector("#profileAvatar");
  avatar.textContent = initials(person.name);
  avatar.className = `avatar avatar-${person.color || "sage"}`;
}

function instructorStats() {
  const assignmentCount = state.assignments.length;
  const needsReview = state.assignments.reduce((total, assignment) =>
    total + assignment.submissions.filter((submission) => submission.status === "submitted").length, 0);
  const submitted = state.assignments.reduce((total, assignment) =>
    total + assignment.submissions.filter((submission) => ["submitted", "graded"].includes(submission.status)).length, 0);
  const possible = assignmentCount * students.length;
  const completion = possible ? Math.round((submitted / possible) * 100) : 0;
  const allGrades = state.assignments.flatMap((assignment) =>
    assignment.submissions.filter((submission) => submission.status === "graded" && Number.isFinite(submission.grade)).map((submission) => (submission.grade / assignment.points) * 100));
  const average = allGrades.length ? `${Math.round(allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length)}%` : "—";
  return [
    { label: "Active assignments", value: assignmentCount, note: "in your tracker", icon: "▤", color: "purple" },
    { label: "Need your review", value: needsReview, note: "ready to be graded", icon: "✎", color: "orange" },
    { label: "Submissions complete", value: `${completion}%`, note: "submitted or graded", icon: "↗", color: "green" },
    { label: "Average score", value: average, note: `${allGrades.length} graded submissions`, icon: "☆", color: "blue" },
  ];
}

function studentStats() {
  const records = state.assignments.map((assignment) => ({ assignment, status: statusFor(getSubmission(assignment, state.studentId), assignment.dueDate) }));
  const upcoming = records.filter(({ status }) => status === "assigned").length;
  const toReview = records.filter(({ status }) => status === "graded").length;
  const missing = records.filter(({ status }) => status === "missing").length;
  const scores = records.filter(({ status }) => status === "graded").map(({ assignment }) => getSubmission(assignment, state.studentId)).filter((submission) => Number.isFinite(submission.grade));
  const average = scores.length ? `${Math.round(scores.reduce((sum, submission) => sum + submission.grade, 0) / scores.length)} pts` : "—";
  return [
    { label: "To complete", value: upcoming, note: "assignments on your list", icon: "▤", color: "purple" },
    { label: "Ready to review", value: toReview, note: "graded by your instructor", icon: "✎", color: "green" },
    { label: "Past due", value: missing, note: "check in with your instructor", icon: "◷", color: "orange" },
    { label: "Points earned", value: average, note: `from ${scores.length} graded`, icon: "☆", color: "blue" },
  ];
}

function statCards(stats) {
  return `<section class="stats-grid" aria-label="Assignment overview">${stats.map((stat) => `
    <article class="stat-card">
      <div class="stat-head"><span>${stat.label}</span><span class="stat-icon ${stat.color}" aria-hidden="true">${stat.icon}</span></div>
      <div class="stat-value">${stat.value}<span class="stat-note">${stat.note}</span></div>
    </article>`).join("")}</section>`;
}

function studentAssignmentRows(assignments) {
  const sorted = [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!sorted.length) return `<div class="empty-state"><strong>Nothing here just yet</strong>Try changing your filters.</div>`;
  return `<div class="assignment-list">${sorted.map((assignment) => {
    const submission = getSubmission(assignment, state.studentId);
    const status = statusFor(submission, assignment.dueDate);
    const due = dueLabel(assignment.dueDate);
    const action = status === "graded" ? "View feedback" : status === "submitted" ? "View submission" : status === "missing" ? "Submit late work" : "Open assignment";
    return `<article class="assignment-row">
      <div class="assignment-main">${subjectMark(assignment.subject)}<div class="assignment-copy"><strong>${escapeHtml(assignment.title)}</strong><small>${escapeHtml(assignment.subject)} · ${assignment.points} points</small></div></div>
      <div class="row-actions"><span class="due-copy ${due.className}">${due.label}</span>${statusBadge(status)}<button class="text-button" type="button" data-open-assignment="${assignment.id}">${action}</button></div>
    </article>`;
  }).join("")}</div>`;
}

function instructorAssignmentRows(assignments) {
  const sorted = [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!sorted.length) return `<div class="empty-state"><strong>No assignments yet</strong>Create an assignment to start tracking work.</div>`;
  return `<div class="assignment-list">${sorted.map((assignment) => {
    const submitted = assignment.submissions.filter((submission) => ["submitted", "graded"].includes(submission.status)).length;
    const waiting = assignment.submissions.filter((submission) => submission.status === "submitted").length;
    const due = dueLabel(assignment.dueDate);
    return `<article class="assignment-row">
      <div class="assignment-main">${subjectMark(assignment.subject)}<div class="assignment-copy"><strong>${escapeHtml(assignment.title)}</strong><small>${escapeHtml(assignment.subject)} · ${assignment.points} points</small></div></div>
      <div class="row-actions"><span class="due-copy ${due.className}">${due.label}</span>${waiting ? statusBadge("review") : `<span class="due-copy">${submitted}/${students.length} submitted</span>`}<button class="text-button" type="button" data-review-assignment="${assignment.id}">Review work</button></div>
    </article>`;
  }).join("")}</div>`;
}

function activityItems() {
  if (state.role === "student") {
    const graded = state.assignments.flatMap((assignment) => {
      const submission = getSubmission(assignment, state.studentId);
      return submission?.status === "graded" ? [{ assignment, submission }] : [];
    }).sort((a, b) => b.submission.submittedAt.localeCompare(a.submission.submittedAt)).slice(0, 3);
    return graded.length ? graded.map(({ assignment, submission }) => `
      <div class="activity-item"><span class="activity-icon" aria-hidden="true">✓</span><div class="activity-copy"><strong>${escapeHtml(assignment.title)}</strong> was graded · ${submission.grade}/${assignment.points} points<small>${submission.feedback ? escapeHtml(submission.feedback) : "Your instructor left feedback."}</small></div></div>`).join("")
      : `<div class="empty-state"><strong>No updates yet</strong>Your instructor's feedback will show up here.</div>`;
  }
  const recent = state.assignments.flatMap((assignment) => assignment.submissions
    .filter((submission) => submission.status === "submitted")
    .map((submission) => ({ assignment, submission, student: getStudent(submission.studentId) })))
    .sort((a, b) => b.submission.submittedAt.localeCompare(a.submission.submittedAt)).slice(0, 3);
  return recent.length ? recent.map(({ assignment, submission, student }) => `
    <div class="activity-item"><span class="activity-icon" aria-hidden="true">↗</span><div class="activity-copy"><strong>${escapeHtml(student.name)}</strong> submitted <strong>${escapeHtml(assignment.title)}</strong><small>${formatDate(submission.submittedAt)} · ${escapeHtml(assignment.subject)}</small></div></div>`).join("")
    : `<div class="empty-state"><strong>All caught up</strong>New student submissions will show up here.</div>`;
}

function renderDashboard() {
  const isInstructor = state.role === "instructor";
  const personName = isInstructor ? sessionUser.name.split(" ")[0] : getStudent().name.split(" ")[0];
  const assignments = isInstructor
    ? [...state.assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4)
    : state.assignments.filter((assignment) => statusFor(getSubmission(assignment, state.studentId), assignment.dueDate) !== "graded")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  pageContent.innerHTML = `
    <section class="welcome-banner">
      <div class="banner-copy">
        <p class="eyebrow">${isInstructor ? "ASSIGNMENTS AT A GLANCE" : "YOUR ASSIGNMENT OVERVIEW"}</p>
        <h1>${isInstructor ? `Good morning, ${personName} 👋` : `Hey ${escapeHtml(personName)}, you’ve got this ✨`}</h1>
        <p>${isInstructor ? "See what is due, what has been submitted, and what needs grading." : "See what is due next and check the status of your submitted work."}</p>
        <button class="primary-button banner-button" type="button" data-page="assignments">${isInstructor ? "Manage assignments" : "View assignments"} <span aria-hidden="true">→</span></button>
      </div>
      <div class="banner-illustration" aria-hidden="true"><span class="sparkle">✦</span><span class="sparkle small">✧</span><div class="paper"></div><div class="book-stack"></div></div>
    </section>
    ${statCards(isInstructor ? instructorStats() : studentStats())}
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-header"><div><h2 class="panel-title">${isInstructor ? "Assignments to track" : "Upcoming assignments"}</h2><p class="panel-subtitle">${isInstructor ? "Due dates and submission status" : "Your next due dates and current status"}</p></div><button class="text-button" type="button" data-page="assignments">View all <span aria-hidden="true">→</span></button></div>
        ${isInstructor ? instructorAssignmentRows(assignments) : studentAssignmentRows(assignments)}
      </section>
      <section class="panel">
        <div class="panel-header"><div><h2 class="panel-title">${isInstructor ? "Submissions to review" : "Assignment feedback"}</h2><p class="panel-subtitle">${isInstructor ? "Recently submitted work" : "Grades and comments on your work"}</p></div></div>
        <div class="activity-list">${activityItems()}</div>
      </section>
    </div>`;
}

function renderAssignments() {
  if (state.role === "student") {
    pageContent.innerHTML = `
      <div class="page-heading"><div><p class="eyebrow">YOUR WORK</p><h1>Assignments</h1><p class="page-subtitle">Track due dates, submission status, grades, and feedback.</p></div>
        <label class="toolbar"><span class="sr-only">Filter assignments</span><select class="filter-select" id="assignmentFilter"><option value="all">All assignments</option><option value="assigned">To do</option><option value="submitted">Submitted</option><option value="graded">Graded</option><option value="missing">Past due</option></select></label></div>
      <section class="panel">${studentAssignmentRows(filteredStudentAssignments())}</section>`;
  } else {
    pageContent.innerHTML = `
      <div class="page-heading"><div><p class="eyebrow">ASSIGNMENT TRACKER</p><h1>Assignments</h1><p class="page-subtitle">Create assignments and track student submissions and grades.</p></div>
        <button class="primary-button" type="button" data-create-assignment><span class="button-plus" aria-hidden="true">+</span> Create assignment</button></div>
      <div class="toolbar" style="margin-bottom: 16px"><label class="toolbar"><span class="sr-only">Search assignments</span><input class="search-input" id="assignmentSearch" type="search" placeholder="Search assignments..." /></label><label><span class="sr-only">Filter by subject</span><select class="filter-select" id="subjectFilter"><option value="all">All subjects</option>${Object.keys(subjectMeta).map((subject) => `<option>${escapeHtml(subject)}</option>`).join("")}</select></label></div>
      <div class="assignment-grid" id="assignmentGrid">${instructorAssignmentCards(state.assignments)}</div>`;
  }
}

function filteredStudentAssignments() {
  const filter = document.querySelector("#assignmentFilter")?.value || "all";
  return state.assignments.filter((assignment) => filter === "all" || statusFor(getSubmission(assignment, state.studentId), assignment.dueDate) === filter);
}

function instructorAssignmentCards(assignments) {
  if (!assignments.length) return `<section class="panel" style="grid-column:1/-1">${`<div class="empty-state"><strong>No assignments match</strong>Try another search or create an assignment.</div>`}</section>`;
  return assignments.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((assignment) => {
    const submitted = assignment.submissions.filter((submission) => ["submitted", "graded"].includes(submission.status)).length;
    const pendingReview = assignment.submissions.filter((submission) => submission.status === "submitted").length;
    const due = dueLabel(assignment.dueDate);
    return `<article class="assignment-card">
      <div class="card-topline"><span class="card-subject">${subjectMark(assignment.subject)}${escapeHtml(assignment.subject)}</span>${pendingReview ? statusBadge("review") : statusBadge("assigned")}</div>
      <h3>${escapeHtml(assignment.title)}</h3><p>${escapeHtml(assignment.description)}</p>
      <div class="card-meta"><span>${due.label}</span><span>${assignment.points} points</span></div>
      <div class="card-footer"><span class="submission-count">${submitted} of ${students.length} submitted</span><button class="secondary-button" type="button" data-review-assignment="${assignment.id}">Review work →</button></div>
    </article>`;
  }).join("");
}

function render() {
  authScreen.hidden = Boolean(sessionUser);
  document.querySelector(".app-shell").hidden = !sessionUser;
  if (!sessionUser) return;
  renderNavigation();
  renderHeader();
  if (state.page === "assignments") renderAssignments();
  else renderDashboard();
}

function openDialog(title, subtitle, body, className = "") {
  dialogContent.innerHTML = `<div class="dialog-header"><div><h2 id="dialogTitle">${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button class="dialog-close" type="button" data-close-dialog aria-label="Close dialog">×</button></div>${body}`;
  dialog.className = `app-dialog ${className}`.trim();
  dialog.showModal();
}

function openCreateDialog() {
  openDialog("Create an assignment", "Share a new task with everyone in your class.", `
    <form class="dialog-form" id="createAssignmentForm">
      <div class="field"><label for="assignmentTitle">Assignment title</label><input id="assignmentTitle" name="title" required maxlength="90" placeholder="e.g. A closer look at fractions" /></div>
      <div class="form-grid">
        <div class="field"><label for="assignmentSubject">Subject</label><select id="assignmentSubject" name="subject" required>${Object.keys(subjectMeta).map((subject) => `<option>${escapeHtml(subject)}</option>`).join("")}</select></div>
        <div class="field"><label for="assignmentPoints">Points</label><input id="assignmentPoints" name="points" type="number" min="1" max="1000" value="20" required /></div>
      </div>
      <div class="field"><label for="assignmentDue">Due date</label><input id="assignmentDue" name="dueDate" type="date" min="${dateAt(0)}" value="${dateAt(7)}" required /></div>
      <div class="field"><label for="assignmentDescription">Instructions</label><textarea id="assignmentDescription" name="description" required maxlength="1000" placeholder="Tell students what they need to do..."></textarea></div>
      <div class="dialog-actions"><button class="secondary-button" type="button" data-close-dialog>Cancel</button><button class="primary-button" type="submit">Create assignment</button></div>
    </form>`);
}

function openStudentAssignment(assignmentId) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return;
  const submission = getSubmission(assignment, state.studentId) || { status: "assigned" };
  const status = statusFor(submission, assignment.dueDate);
  const graded = status === "graded";
  const content = graded
    ? `<div class="dialog-form"><div class="form-grid"><div class="field"><label>Score</label><div class="review-work">${submission.grade ?? "—"} / ${assignment.points} points</div></div><div class="field"><label>Submitted</label><div class="review-work">${submission.submittedAt ? formatDate(submission.submittedAt, { month: "long", day: "numeric", year: "numeric" }) : "—"}</div></div></div><div class="field"><label>Instructor feedback</label><div class="review-work">${escapeHtml(submission.feedback || "Your instructor has not left written feedback.")}</div></div>${submission.work ? `<div class="field"><label>Your submission</label><div class="review-work">${escapeHtml(submission.work)}</div></div>` : ""}<div class="dialog-actions"><button class="primary-button" type="button" data-close-dialog>Done</button></div></div>`
    : `<form class="dialog-form" id="submitAssignmentForm" data-assignment-id="${assignment.id}">
      <div class="form-grid"><div class="field"><label>Subject</label><div class="review-work">${escapeHtml(assignment.subject)}</div></div><div class="field"><label>Due date · ${assignment.points} points</label><div class="review-work">${formatDate(assignment.dueDate, { month: "long", day: "numeric" })}</div></div></div>
      <div class="field"><label>Instructions</label><div class="review-work">${escapeHtml(assignment.description)}</div></div>
      ${submission.status === "submitted" ? `<div class="field"><label>Current submission</label><div class="review-work">${escapeHtml(submission.work || "Submitted")}<br /><span class="field-hint">Submitted ${formatDate(submission.submittedAt)}</span></div></div>` : ""}
      <div class="field"><label for="submissionWork">${submission.status === "submitted" ? "Update your work" : "Your work"}</label><textarea id="submissionWork" name="work" required maxlength="3000" placeholder="Paste a link or write a short response...">${submission.status === "submitted" ? escapeHtml(submission.work || "") : ""}</textarea><span class="field-hint">You can paste a link or enter a written response.</span></div>
      <div class="dialog-actions"><button class="secondary-button" type="button" data-close-dialog>Cancel</button><button class="primary-button" type="submit">${submission.status === "submitted" ? "Update submission" : "Submit assignment"}</button></div>
    </form>`;
  openDialog(assignment.title, `${statusLabel(status)} · ${assignment.points} points`, content);
}

function openReviewDialog(assignmentId) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return;
  const rows = assignment.submissions.map((submission) => {
    const student = getStudent(submission.studentId);
    const disabled = !["submitted", "graded"].includes(submission.status);
    const work = submission.work
      ? /^https?:\/\//i.test(submission.work)
        ? `<a href="${escapeHtml(submission.work)}" target="_blank" rel="noopener noreferrer">${escapeHtml(submission.work)}</a>`
        : escapeHtml(submission.work)
      : "No work submitted yet.";
    return `<article class="review-row" data-review-student="${student.id}">
      <div class="review-student"><span class="avatar avatar-${student.color}">${initials(student.name)}</span><div class="profile-copy"><strong>${escapeHtml(student.name)}</strong><small>${statusLabel(statusFor(submission, assignment.dueDate))}${submission.submittedAt ? ` · ${formatDate(submission.submittedAt)}` : ""}</small></div>${submission.status === "graded" ? `<span class="status-badge graded">${submission.grade}/${assignment.points}</span>` : ""}</div>
      <p class="review-work">${work}</p>
      <div class="review-fields"><label class="sr-only" for="grade-${student.id}">Grade for ${escapeHtml(student.name)}</label><input id="grade-${student.id}" type="number" min="0" max="${assignment.points}" placeholder="Score / ${assignment.points}" value="${submission.grade ?? ""}" ${disabled ? "disabled" : ""} />
        <label class="sr-only" for="feedback-${student.id}">Feedback for ${escapeHtml(student.name)}</label><textarea id="feedback-${student.id}" maxlength="500" placeholder="Add helpful feedback..." ${disabled ? "disabled" : ""}>${escapeHtml(submission.feedback || "")}</textarea></div>
      ${disabled ? "" : `<div class="dialog-actions"><button class="primary-button" type="button" data-save-grade="${student.id}" data-assignment-id="${assignment.id}">Save feedback</button></div>`}
    </article>`;
  }).join("");
  openDialog("Review student work", `${assignment.title} · ${assignment.points} points`, `<div class="review-list">${rows}</div>`);
}

function handleCreateAssignment(form) {
  const data = new FormData(form);
  const title = String(data.get("title")).trim();
  const description = String(data.get("description")).trim();
  const subject = String(data.get("subject"));
  const points = Number(data.get("points"));
  const dueDate = String(data.get("dueDate"));
  if (!title || !description || !Number.isInteger(points) || points < 1 || points > 1000 || !subjectMeta[subject] || dueDate < dateAt(0)) {
    showToast("Check the assignment details and try again.", true);
    return;
  }
  const assignment = {
    id: `assignment-${Date.now()}`,
    title,
    subject,
    description,
    dueDate,
    points,
    createdAt: dateAt(0),
    submissions: students.map((student) => ({ studentId: student.id, status: "assigned" })),
  };
  try {
    commit((nextState) => nextState.assignments.push(assignment));
    dialog.close();
    showToast("Assignment created and shared with your class.");
  } catch (error) {
    showToast(`Could not save the assignment: ${error.message}`, true);
  }
}

function handleSubmission(form) {
  const assignmentId = form.dataset.assignmentId;
  const work = String(new FormData(form).get("work")).trim();
  if (!work) {
    showToast("Add your work before submitting.", true);
    return;
  }
  try {
    commit((nextState) => {
      const assignment = nextState.assignments.find((item) => item.id === assignmentId);
      const submission = assignment?.submissions.find((item) => item.studentId === nextState.studentId);
      if (!assignment || !submission) throw new Error("This assignment is no longer available.");
      submission.status = "submitted";
      submission.submittedAt = dateAt(0);
      submission.work = work;
    });
    dialog.close();
    showToast("Your work has been submitted. Nice job!");
  } catch (error) {
    showToast(`Could not submit your work: ${error.message}`, true);
  }
}

function handleGrade(button) {
  const assignmentId = button.dataset.assignmentId;
  const studentId = button.dataset.saveGrade;
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  const submission = assignment?.submissions.find((item) => item.studentId === studentId);
  if (!assignment || !submission) {
    showToast("This submission is no longer available.", true);
    return;
  }
  const scoreInput = dialog.querySelector(`#grade-${studentId}`);
  const feedbackInput = dialog.querySelector(`#feedback-${studentId}`);
  const grade = Number(scoreInput.value);
  if (scoreInput.value === "" || !Number.isInteger(grade) || grade < 0 || grade > assignment.points) {
    showToast(`Enter a whole-number score from 0 to ${assignment.points}.`, true);
    scoreInput.focus();
    return;
  }
  try {
    commit((nextState) => {
      const nextAssignment = nextState.assignments.find((item) => item.id === assignmentId);
      const nextSubmission = nextAssignment.submissions.find((item) => item.studentId === studentId);
      nextSubmission.status = "graded";
      nextSubmission.grade = grade;
      nextSubmission.feedback = feedbackInput.value.trim();
    });
    openReviewDialog(assignmentId);
    showToast("Grade and feedback saved.");
  } catch (error) {
    showToast(`Could not save the grade: ${error.message}`, true);
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.page) {
    if (state.page !== target.dataset.page) pageHistory.push(state.page);
    commit((nextState) => { nextState.page = target.dataset.page; });
  } else if (target.id === "backButton") {
    const previousPage = pageHistory.pop();
    if (previousPage) commit((nextState) => { nextState.page = previousPage; });
  } else if (target.hasAttribute("data-create-assignment")) {
    openCreateDialog();
  } else if (target.dataset.openAssignment) {
    openStudentAssignment(target.dataset.openAssignment);
  } else if (target.dataset.reviewAssignment) {
    openReviewDialog(target.dataset.reviewAssignment);
  } else if (target.dataset.saveGrade) {
    handleGrade(target);
  } else if (target.hasAttribute("data-close-dialog")) {
    dialog.close();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "createAssignmentForm") {
    event.preventDefault();
    handleCreateAssignment(event.target);
  } else if (event.target.id === "submitAssignmentForm") {
    event.preventDefault();
    handleSubmission(event.target);
  }
});

document.querySelector("#pageContent").addEventListener("change", (event) => {
  if (event.target.id === "assignmentFilter") renderAssignments();
  if (event.target.id === "subjectFilter" || event.target.id === "assignmentSearch") filterInstructorCards();
});

document.querySelector("#pageContent").addEventListener("input", (event) => {
  if (event.target.id === "assignmentSearch") filterInstructorCards();
});

function filterInstructorCards() {
  const subject = document.querySelector("#subjectFilter")?.value || "all";
  const search = (document.querySelector("#assignmentSearch")?.value || "").trim().toLowerCase();
  const matching = state.assignments.filter((assignment) =>
    (subject === "all" || assignment.subject === subject) &&
    `${assignment.title} ${assignment.description} ${assignment.subject}`.toLowerCase().includes(search));
  const grid = document.querySelector("#assignmentGrid");
  if (grid) grid.innerHTML = instructorAssignmentCards(matching);
}

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

authForm.addEventListener("submit", async (event) => {
  const submitButton = authForm.querySelector('[type="submit"]');
  if (!submitButton || submitButton.disabled) {
    event.preventDefault();
    return;
  }
  const originalLabel = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = `<span>One moment…</span><span aria-hidden="true">·</span>`;
  authForm.setAttribute("aria-busy", "true");
  try {
    await handleAuthSubmit(event);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalLabel;
    authForm.removeAttribute("aria-busy");
  }
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.authMode) {
    setAuthMode(target.dataset.authMode);
  } else if (target.dataset.signupRole) {
    const formValues = new FormData(authForm);
    selectedSignupRole = target.dataset.signupRole;
    renderAuthForm();
    for (const fieldName of ["name", "email", "password"]) {
      const input = authForm.elements.namedItem(fieldName);
      if (input) input.value = String(formValues.get(fieldName) || "");
    }
    renderPasswordStrength(authForm.elements.namedItem("password")?.value || "");
  } else if (target.hasAttribute("data-toggle-password")) {
    const input = document.querySelector("#accountPassword");
    const showPassword = input.type === "password";
    input.type = showPassword ? "text" : "password";
    target.textContent = showPassword ? "Hide" : "Show";
    target.setAttribute("aria-label", `${showPassword ? "Hide" : "Show"} password`);
  } else if (target.dataset.demoRole) {
    handleDemoLogin(target.dataset.demoRole);
  }
});

authForm.addEventListener("input", (event) => {
  if (event.target.id === "accountPassword") renderPasswordStrength(event.target.value);
});

document.querySelector("#signOutButton").addEventListener("click", signOut);

try {
  state = loadState();
  renderAuthForm();
  ensureDemoAccounts().then(() => {
    const userId = sessionStorage.getItem(SESSION_KEY);
    if (!userId) {
      render();
      return;
    }
    sessionUser = readUsers().find((user) => user.id === userId) || null;
    if (!sessionUser) sessionStorage.removeItem(SESSION_KEY);
    render();
  }).catch((error) => {
    render();
    showAuthNotice(error.message, true);
  });
} catch (error) {
  pageContent.innerHTML = `<section class="panel"><div class="empty-state"><strong>Assignment tracker couldn’t load</strong>${escapeHtml(error.message)}</div></section>`;
  showAuthNotice(error.message, true);
}
