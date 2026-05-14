const notesApi = {
  list: '/api/notes',
  create: '/api/notes',
  update: id => `/api/notes/${id}`,
  remove: id => `/api/notes/${id}`
};

const noteCategories = ['자료구조', '알고리즘', '운영체제', '네트워크', '데이터베이스'];

let notes = [];
let notesSyncTimer = null;
window.currentNoteFilter = 'all';

window.getAppNotes = function() {
  return notes;
};

window.saveAppNotes = function() {
  safeSetItem(`codemind_notes_${getActiveUserId()}`, JSON.stringify(notes));
  scheduleNotesSync();
};

async function loadNotesFromApi() {
  try {
    const response = await fetch(notesApi.list, {
      headers: buildUserHeaders()
    });
    if (!response.ok) throw new Error(await response.text());

    const loadedNotes = await response.json();
    notes.length = 0;
    if (Array.isArray(loadedNotes)) {
      loadedNotes.forEach(note => notes.push(normalizeNote(note)));
    }
    safeSetItem(`codemind_notes_${getActiveUserId()}`, JSON.stringify(notes));
  } catch (error) {
    console.warn('Notes API load failed. Falling back to localStorage.', error);
    loadNotesFromLocalStorage();
  }

  renderNotes(window.currentNoteFilter || 'all');
}

function loadNotesFromLocalStorage() {
  const savedNotes = safeGetItem(`codemind_notes_${getActiveUserId()}`);
  notes.length = 0;
  if (!savedNotes) return;

  try {
    const parsed = JSON.parse(savedNotes);
    if (Array.isArray(parsed)) {
      parsed.forEach(note => notes.push(normalizeNote(note)));
    }
  } catch (error) {
    console.warn('Saved notes could not be parsed.', error);
  }
}

async function createNoteViaApi(note) {
  const normalized = normalizeNote(note);
  const createPayload = { ...normalized, id: null };

  try {
    const response = await fetch(notesApi.create, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        ...buildUserHeaders()
      },
      body: JSON.stringify(createPayload)
    });

    if (!response.ok) throw new Error(await response.text());
    return normalizeNote(await response.json());
  } catch (error) {
    console.warn('Notes API save failed. Keeping note locally.', error);
    return { ...normalized, localOnly: true };
  }
}

async function updateNoteViaApi(note) {
  if (!note || note.localOnly || !note.id) return note;

  try {
    const response = await fetch(notesApi.update(note.id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        ...buildUserHeaders()
      },
      body: JSON.stringify(note)
    });

    if (!response.ok) throw new Error(await response.text());
    return normalizeNote(await response.json());
  } catch (error) {
    console.warn('Notes API update failed. Keeping local state.', error);
    return note;
  }
}

function scheduleNotesSync() {
  clearTimeout(notesSyncTimer);
  notesSyncTimer = setTimeout(syncPersistedNotes, 700);
}

async function syncPersistedNotes() {
  const persistedNotes = notes.filter(note => !note.localOnly && note.id);
  await Promise.all(persistedNotes.map(updateNoteViaApi));
}

function renderNotes(filter = 'all') {
  const grid = document.getElementById('notesGrid');
  if (!grid) return;

  const normalizedFilter = filter || 'all';
  const filtered = normalizedFilter === 'all'
    ? notes
    : notes.filter(note => normalizeSubject(note.subject) === normalizedFilter);

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">NOTE</div>
        <h3>아직 저장된 오답이 없습니다</h3>
        <p>AI 예상문제를 풀고 틀리면 선택한 과목의 오답노트에 자동으로 저장됩니다.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(note => `
    <div class="note-card" style="--ncolor:${note.color || 'var(--accent4)'}">
      <div class="note-meta">
        <span class="note-subject" style="background:${softColor(note.color || 'var(--accent4)')};color:${note.color || 'var(--accent4)'}">${escapeNoteHtml(normalizeSubject(note.subject))}</span>
        <span class="note-date">${escapeNoteHtml(note.date)}</span>
      </div>
      <div class="note-title">${escapeNoteHtml(note.title)}</div>
      <div class="note-q">${escapeNoteHtml(note.q)}</div>
      <div class="note-wrong">내 답: ${escapeNoteHtml(note.wrong)}</div>
      <div class="note-correct">정답: ${escapeNoteHtml(note.correct)}</div>
    </div>
  `).join('');
}

function filterNotes(value, element) {
  window.currentNoteFilter = value || 'all';
  document.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
  if (element) element.classList.add('active');
  renderNotes(window.currentNoteFilter);
}

function normalizeNote(note) {
  const subject = normalizeSubject(note.subject || `${note.title || ''} ${note.q || ''} ${note.correct || ''}`);
  return {
    id: note.id || Date.now(),
    subject,
    title: note.title || '오답노트',
    q: note.q || '',
    wrong: note.wrong || '',
    correct: note.correct || '',
    date: note.date || buildTodayString(),
    color: note.color || subjectColor(subject),
    questionType: normalizeQuestionType(note),
    optionsJson: note.optionsJson || '',
    answerIdx: Number.isInteger(note.answerIdx) ? note.answerIdx : null,
    answerKeywordsJson: note.answerKeywordsJson || '',
    debugSolved: Boolean(note.debugSolved),
    relapsed: Boolean(note.relapsed),
    cooldownUntil: note.cooldownUntil || null,
    userId: note.userId || getActiveUserId(),
    localOnly: Boolean(note.localOnly)
  };
}

function normalizeQuestionType(note) {
  const raw = String(note.questionType || note.type || '').toLowerCase();
  const title = String(note.title || '');
  if (raw === 'blank' || title.includes('빈칸')) return 'blank';
  if (raw === 'mcq' || title.includes('객관식')) return 'mcq';
  if (raw === 'essay' || title.includes('서술형')) return 'essay';
  return 'essay';
}

function normalizeSubject(value) {
  const text = String(value || '');
  if (/(TCP|UDP|DNS|HTTP|IP|패킷|프로토콜|네트워크)/i.test(text)) return '네트워크';
  if (/(프로세스|스레드|스케줄링|교착상태|운영체제|메모리|CPU)/i.test(text)) return '운영체제';
  if (/(트리|스택|큐|힙|그래프|배열|연결 리스트|자료구조)/i.test(text)) return '자료구조';
  if (/(DP|동적|탐색|정렬|알고리즘|빅오|복잡도|재귀)/i.test(text)) return '알고리즘';
  if (/(DB|데이터베이스|정규화|인덱스|SQL|트랜잭션)/i.test(text)) return '데이터베이스';
  return noteCategories.includes(text) ? text : '운영체제';
}

function subjectColor(subject) {
  return {
    '자료구조': '#ef6c73',
    '알고리즘': '#f59e0b',
    '운영체제': '#3b82f6',
    '네트워크': '#10b981',
    '데이터베이스': '#8b5cf6'
  }[subject] || 'var(--accent4)';
}

function getActiveUserId() {
  return typeof window.getCurrentUserId === 'function' ? window.getCurrentUserId() : 'guest';
}

function buildUserHeaders() {
  return {
    'X-User-Id': getActiveUserId()
  };
}

function buildTodayString() {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
}

function softColor(color) {
  if (color.startsWith('#')) return `${color}22`;
  return 'rgba(252,129,129,0.12)';
}

function escapeNoteHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.loadNotesFromApi = loadNotesFromApi;
window.createNoteViaApi = createNoteViaApi;
window.updateNoteViaApi = updateNoteViaApi;
window.renderNotes = renderNotes;
window.filterNotes = filterNotes;
window.escapeNoteHtml = escapeNoteHtml;
window.normalizeSubject = normalizeSubject;
window.subjectColor = subjectColor;
window.normalizeQuestionType = normalizeQuestionType;
