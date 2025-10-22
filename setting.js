/* =========================
   One-time attempt check
   ========================= */
const QUIZ_KEY = 'quiz_attempt_status';
const attemptStatus = localStorage.getItem(QUIZ_KEY); // null / 'completed' / 'disqualified'

if (attemptStatus === 'completed' || attemptStatus === 'disqualified') {
  alert('You have already attempted this quiz. Please contact admin for reattempt.');
  document.body.innerHTML = '<h3 style="text-align:center;color:red;margin-top:50px;">Quiz Already Attempted / Disqualified</h3>';
  throw new Error('Quiz attempt blocked');
}

function markAttempted(status) {
  localStorage.setItem(QUIZ_KEY, status); // 'completed' or 'disqualified'
}

/* =========================
   Questions Config
   ========================= */
const QUESTIONS = [
  { q: "Which of the following best explains the difference between AI and traditional programming?", options: ["AI requires more lines of code to specify behavior", "AI learns patterns from data rather than following explicit instructions", "AI cannot adapt to new situations", "Traditional programming always performs better"], a: 1 },
  { q: "Which of these is a limitation of current Narrow AI systems?", options: ["They can reason across multiple domains", "They are task-specific and cannot generalize knowledge", "They always outperform humans in all tasks", "They can self-upgrade without supervision"], a: 1 },
  { q: "Which of the following scenarios best demonstrates General AI (hypothetical)?", options: ["A chess program beating a grandmaster", "A spam filter detecting phishing emails", "An AI that can write essays, cook meals, and drive cars equally well", "A robot vacuum cleaner"], a: 2 },
  { q: "Which is NOT considered a core challenge in AI research?", options: ["Knowledge representation", "Reasoning and decision making", "Perception (e.g., vision, speech)", "Increasing processor clock speed"], a: 3 },
  { q: "Which branch of AI focuses on making machines perceive and interpret the world through images?", options: ["NLP", "Robotics", "Computer Vision", "Reinforcement Learning"], a: 2 }
];

let currentQuestion = 0;
let answers = Array(QUESTIONS.length).fill(null);
let timerInterval = null;
let remaining = 40 * 60; // seconds (40 minutes)
let disqualified = false;
let disqReason = '';
let autoSubmitted = false;

/* =========================
   Build UI
   ========================= */
function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return m + ':' + sec;
}

function buildQuestions() {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  QUESTIONS.forEach((q, idx) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.id = 'q' + idx;
    div.innerHTML = `<strong>Q${idx + 1}.</strong> <strong>${q.q}</strong>`;
    const opts = document.createElement('div');
    opts.className = 'options';
    q.options.forEach((opt, i) => {
      const label = document.createElement('label');
      label.style.cursor = 'pointer';
      label.innerHTML = `<input type="radio" name="q${idx}" value="${i}"> ${opt}`;
      opts.appendChild(label);
    });
    div.appendChild(opts);
    container.appendChild(div);
  });
}

function buildNav() {
  const nav = document.getElementById('navButtons');
  nav.innerHTML = '';
  QUESTIONS.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.textContent = idx + 1;
    btn.onclick = () => gotoQuestion(idx);
    nav.appendChild(btn);
  });
}

function gotoQuestion(idx) {
  currentQuestion = idx;
  QUESTIONS.forEach((_, i) => document.getElementById('q' + i).style.display = (i === idx ? 'block' : 'none'));
  document.querySelectorAll('#navButtons button').forEach((b, i) => b.classList.toggle('active', i === idx));
  refreshNavAnswered();
}

function refreshNavAnswered() {
  document.querySelectorAll('#navButtons button').forEach((b, i) => {
    if (answers[i] !== null) { b.style.borderColor = '#28a745'; b.style.color = '#28a745'; b.style.fontWeight = '700'; }
    else { b.style.borderColor = ''; b.style.color = ''; b.style.fontWeight = ''; }
  });
}

/* =========================
   Timer
   ========================= */
function startTimer() {
  document.getElementById('timer').textContent = 'Time: ' + formatTime(remaining);
  timerInterval = setInterval(() => {
    remaining--;
    document.getElementById('timer').textContent = 'Time: ' + formatTime(remaining);
    if (remaining <= 0) { clearInterval(timerInterval); submitQuiz('Time is up'); }
  }, 1000);
}

function collectAnswers() {
  QUESTIONS.forEach((_, idx) => {
    const sel = document.querySelector(`input[name=q${idx}]:checked`);
    answers[idx] = sel ? parseInt(sel.value) : null;
  });
  refreshNavAnswered();
}

function showModal(html) {
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('overlay').style.display = 'flex';
}

function closeModal() { document.getElementById('overlay').style.display = 'none'; }

function submitQuiz(reason) {
  if (autoSubmitted) return;
  autoSubmitted = true;
  clearInterval(timerInterval);
  collectAnswers();
  let correct = 0, incorrect = 0;
  if (disqualified) { correct = 0; incorrect = QUESTIONS.length; markAttempted('disqualified'); }
  else { QUESTIONS.forEach((q, i) => { if (answers[i] === q.a) correct++; else incorrect++; }); markAttempted('completed'); }

  let header = `<h4>Quiz Result</h4><p><strong>Reason:</strong> ${reason || 'User submitted'}</p>`;
  header += `<p>Total Questions: <strong>${QUESTIONS.length}</strong> | Correct: <strong>${correct}</strong> | Incorrect: <strong>${incorrect}</strong> | <span style="font-weight:800">Score: ${disqualified ? 0 : correct}</span></p><hr>`;

  let detail = '';
  QUESTIONS.forEach((q, i) => {
    let userAnsText = (answers[i] !== null) ? q.options[answers[i]] : 'Not Answered';
    let correctText = q.options[q.a];
    let blockClass = (!disqualified && answers[i] === q.a) ? 'correct' : 'incorrect';
    if (disqualified) blockClass = 'incorrect';
    detail += `<div class="${blockClass}"><strong>Q${i + 1}:</strong> ${q.q}<br>
               Your Answer: ${userAnsText}<br>
               Correct Answer: ${correctText}</div><br>`;
  });

  if (disqualified) {
    header = `<div style="display:flex;justify-content:space-between;align-items:center">
                <div><h4 style="margin:0">Disqualified — Score: 0</h4>
                <div class="muted-note">Reason: ${disqReason}</div></div>
                <div><span class="badge badge-disq">DISQUALIFIED</span></div>
              </div><hr>` + header;
  }

  showModal(header + detail);
  document.getElementById('statusBadge').innerHTML = disqualified ? '<span class="badge-disq">Disqualified</span>' : '<span class="badge badge-success">Completed</span>';
}

/* =========================
   Anti-cheat
   ========================= */
function markDisqualified(reason) { if (disqualified) return; disqualified = true; disqReason = reason; console.warn('Disqualified:', reason); }

window.addEventListener('contextmenu', e => { e.preventDefault(); });
window.addEventListener('copy', e => { markDisqualified('Copy action detected'); submitQuiz('Auto-submitted: Copy'); });
window.addEventListener('keydown', e => {
  const key = e.key; const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && (key === 'c' || key === 'C' || key === 'Insert')) { e.preventDefault(); markDisqualified('Keyboard copy'); submitQuiz('Auto-submitted: Copy shortcut'); return; }
  if (key === 'Escape' || key === '`') { e.preventDefault(); markDisqualified(`Disallowed key pressed: ${key}`); submitQuiz(`Auto-submitted: Disallowed key (${key})`); return; }
  if (ctrl && (key.toLowerCase() === 'a' || key.toLowerCase() === 's' || key.toLowerCase() === 'p')) { e.preventDefault(); markDisqualified(`Prohibited shortcut: Ctrl+${key.toUpperCase()}`); submitQuiz(`Auto-submitted: Ctrl+${key.toUpperCase()}`); return; }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { markDisqualified('Tab/window hidden'); submitQuiz('Auto-submitted: Tab/window hidden'); } });
window.addEventListener('blur', () => { markDisqualified('Window lost focus'); submitQuiz('Auto-submitted: Window blur'); });
window.addEventListener('beforeunload', e => { if (!autoSubmitted) { markDisqualified('Page unload/navigation'); submitQuiz('Auto-submitted: Page unload'); e.preventDefault(); e.returnValue = ''; return ''; } });
document.addEventListener('selectstart', e => { e.preventDefault(); });

/* =========================
   Event wiring
   ========================= */
document.getElementById('prevBtn').addEventListener('click', () => { if (currentQuestion > 0) gotoQuestion(currentQuestion - 1); });
document.getElementById('nextBtn').addEventListener('click', () => { if (currentQuestion < QUESTIONS.length - 1) gotoQuestion(currentQuestion + 1); });
document.getElementById('submitBtn').addEventListener('click', () => { if (confirm('Submit Quiz?')) { collectAnswers(); submitQuiz('User submitted'); } });
document.getElementById('closeModal').addEventListener('click', () => { closeModal(); });
document.addEventListener('change', e => { if (e.target && e.target.matches('input[type="radio"]')) { const name = e.target.getAttribute('name'); if (name && name.startsWith('q')) { const idx = parseInt(name.substring(1)); answers[idx] = parseInt(e.target.value); refreshNavAnswered(); } } });
document.addEventListener('keydown', e => { if (!isNaN(e.key) && e.key !== ' ') { const n = parseInt(e.key); if (n >= 1 && n <= QUESTIONS.length) gotoQuestion(n - 1); } });

/* =========================
   Init
   ========================= */
buildQuestions(); buildNav(); gotoQuestion(0); startTimer();
document.getElementById('quizContainer').focus();
document.getElementById('statusBadge').innerHTML = '<span class="badge badge-info">In Progress</span>';
