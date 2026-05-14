let noteAiQuizzes = [];
window.currentBugDataInfo = null;
window.currentBugData = null;

const noteQuizApi = {
  generate: '/api/ai/quiz'
};

const quizSubjects = ['자료구조', '알고리즘', '운영체제', '네트워크', '데이터베이스'];

const difficultyLabels = {
  easy: '하',
  medium: '중',
  hard: '상'
};

const difficultyColors = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444'
};

const questionTypes = ['mcq', 'mcq', 'mcq', 'essay'];

if (!window.getAppNotes) {
  window.getAppNotes = function() {
    return window.notes || [];
  };
}

function injectQuizUI() {
  const page = document.getElementById('page-ai');
  if (!page) return;

  const existingArea = document.getElementById('noteQuizArea');
  if (existingArea) existingArea.remove();

  const quizArea = document.createElement('div');
  quizArea.id = 'noteQuizArea';
  quizArea.className = 'quiz-generate-area';

  const diffSelector = document.createElement('div');
  diffSelector.className = 'quiz-diff-selector';
  diffSelector.innerHTML = `
    <span>난이도 선택:</span>
    <label><input type="radio" name="quiz-diff-select" value="all" checked> 전체</label>
    <label class="easy"><input type="radio" name="quiz-diff-select" value="easy"> 하</label>
    <label class="medium"><input type="radio" name="quiz-diff-select" value="medium"> 중</label>
    <label class="hard"><input type="radio" name="quiz-diff-select" value="hard"> 상</label>
  `;

  const generateBtn = document.createElement('button');
  generateBtn.className = 'btn-primary';
  generateBtn.textContent = 'AI 예상문제 생성하기';
  generateBtn.onclick = toggleQuizInNote;

  const quizContainer = document.createElement('div');
  quizContainer.id = 'noteQuizContainer';
  quizContainer.style.display = 'none';

  quizArea.appendChild(diffSelector);
  quizArea.appendChild(generateBtn);
  quizArea.appendChild(quizContainer);

  const noteToolbar = page.querySelector('.note-toolbar');
  if (noteToolbar) {
    noteToolbar.insertAdjacentElement('afterend', quizArea);
  }
}

async function toggleQuizInNote(event) {
  const container = document.getElementById('noteQuizContainer');
  const btn = event?.target || document.querySelector('#noteQuizArea .btn-primary');
  if (!container || !btn) return;

  const selectedDiffRadio = document.querySelector('input[name="quiz-diff-select"]:checked');
  const selectedDiff = selectedDiffRadio ? selectedDiffRadio.value : 'all';

  if (noteAiQuizzes.length === 0 || btn.textContent.includes('생성')) {
    await generateQuizData(selectedDiff, btn);
    container.style.display = 'block';
    btn.textContent = 'AI 예상문제 접기';
    btn.style.background = '#475569';
    return;
  }

  if (container.style.display === 'none') {
    container.style.display = 'block';
    btn.textContent = 'AI 예상문제 접기';
    btn.style.background = '#475569';
  } else {
    container.style.display = 'none';
    btn.textContent = 'AI 예상문제 새로 생성하기';
    btn.style.background = 'var(--accent3)';
  }
}

setTimeout(injectQuizUI, 500);

async function generateQuizData(selectedDiff = 'all', btn = null) {
  const container = document.getElementById('noteQuizContainer');
  if (container) {
    container.innerHTML = '<div class="quiz-loading">AI 예상문제를 생성하는 중입니다...</div>';
  }

  const previousText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'AI 예상문제 생성 중...';
  }

  const request = buildQuizRequest(selectedDiff);

  try {
    const response = await fetch(noteQuizApi.generate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error(await response.text());

    const quiz = normalizeQuiz(await response.json(), request);
    noteAiQuizzes = [quiz];
    renderNoteQuizzes();
    showToast(`${quiz.subject} AI 예상문제가 생성되었습니다.`);
  } catch (error) {
    console.warn('AI quiz API failed. Falling back to local quiz.', error);
    noteAiQuizzes = [buildFallbackQuiz(request.subject, request.difficulty, request.type)];
    renderNoteQuizzes();
    showToast('API 연결이 어려워 임시 문제를 생성했습니다.', 'WARN');
  } finally {
    if (btn) {
      btn.disabled = false;
      if (previousText) btn.textContent = previousText;
    }
  }
}

function buildQuizRequest(selectedDiff) {
  const difficulty = selectedDiff === 'all'
    ? ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
    : selectedDiff;

  const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  const sourceText = buildQuizSourceText();
  const subject = getSelectedQuizSubject(sourceText);
  const recentQuestions = getRecentQuizQuestions(subject);

  return {
    subject,
    difficulty,
    type,
    sourceText: [
      buildSubjectSourceText(subject, sourceText),
      '',
      '최근 생성한 문제와 겹치지 않게 다른 개념, 다른 예시, 다른 함정으로 새 문제를 만들어주세요.',
      `최근 문제:\n${recentQuestions.join('\n')}`
    ].join('\n')
  };
}

function getSelectedQuizSubject(sourceText) {
  const currentFilter = window.currentNoteFilter || 'all';
  if (currentFilter !== 'all') {
    return normalizeQuizSubject(currentFilter);
  }

  const inferred = inferSubject(sourceText);
  if (quizSubjects.includes(inferred)) {
    return inferred;
  }

  return quizSubjects[Math.floor(Math.random() * quizSubjects.length)];
}

function buildQuizSourceText() {
  if (typeof pdfState !== 'undefined') {
    if (pdfState.summaryItems && pdfState.summaryItems.length > 0) return pdfState.summaryItems.join(' ');
    if (pdfState.summaryText) return pdfState.summaryText;
    if (pdfState.sourceText) return pdfState.sourceText;
  }

  const activeNotes = window.getAppNotes();
  if (activeNotes.length > 0) {
    return activeNotes
      .slice(0, 6)
      .map(note => `${note.subject || ''} ${note.title || ''} ${note.q || ''} ${note.correct || ''}`)
      .join(' ');
  }

  return '운영체제 프로세스 스레드 교착상태 TCP UDP 자료구조 스택 큐 트리 알고리즘 빅오 정렬 탐색 데이터베이스 SQL 정규화';
}

function buildSubjectSourceText(subject, sourceText) {
  const guide = {
    '자료구조': '자료구조 범위: 배열, 연결 리스트, 스택, 큐, 트리, 그래프, 힙, 해시 테이블.',
    '알고리즘': '알고리즘 범위: 시간 복잡도, 빅오, 정렬, 탐색, 재귀, DP, 그리디.',
    '운영체제': '운영체제 범위: 프로세스, 스레드, CPU 스케줄링, 메모리 관리, 교착상태.',
    '네트워크': '네트워크 범위: TCP, UDP, IP, HTTP, DNS, 패킷, 프로토콜 계층.',
    '데이터베이스': '데이터베이스 범위: SQL, 정규화, 인덱스, 트랜잭션, 키, 관계형 모델.'
  }[subject] || '컴퓨터공학 핵심 개념.';

  return `선택 과목: ${subject}\n${guide}\n학습 자료:\n${sourceText}`;
}

function inferSubject(text) {
  const source = text || '';
  if (/(TCP|UDP|DNS|HTTP|IP|패킷|프로토콜|네트워크)/i.test(source)) return '네트워크';
  if (/(프로세스|스레드|스케줄링|교착상태|운영체제|메모리|CPU)/i.test(source)) return '운영체제';
  if (/(트리|스택|큐|힙|그래프|배열|연결 리스트|자료구조)/i.test(source)) return '자료구조';
  if (/(DP|동적|탐색|정렬|알고리즘|빅오|복잡도|재귀)/i.test(source)) return '알고리즘';
  if (/(DB|데이터베이스|정규화|인덱스|SQL|트랜잭션)/i.test(source)) return '데이터베이스';
  return '';
}

function normalizeQuiz(rawQuiz, request) {
  const type = rawQuiz?.type === 'essay' ? 'essay' : 'mcq';
  const difficulty = normalizeDifficulty(rawQuiz?.difficulty || request.difficulty);
  const subject = normalizeQuizSubject(request.subject);
  const fallback = buildFallbackQuiz(subject, difficulty, type);
  const quiz = {
    id: Date.now(),
    type,
    subject,
    difficulty,
    keyword: rawQuiz?.keyword || subject,
    question: rawQuiz?.question || fallback.question,
    options: Array.isArray(rawQuiz?.options) ? rawQuiz.options.slice(0, 4) : fallback.options,
    answerIdx: Number.isInteger(rawQuiz?.answerIdx) ? rawQuiz.answerIdx : fallback.answerIdx,
    answer: rawQuiz?.answer || fallback.answer,
    explanation: rawQuiz?.explanation || fallback.explanation,
    source: rawQuiz?.source || 'openai'
  };

  if (quiz.type === 'mcq') {
    if (!quiz.options || quiz.options.length < 4) quiz.options = fallback.options;
    if (quiz.answerIdx < 0 || quiz.answerIdx >= quiz.options.length) quiz.answerIdx = fallback.answerIdx;
    quiz.answer = quiz.answer || quiz.options[quiz.answerIdx];
  } else {
    quiz.options = [];
    quiz.answerIdx = -1;
  }

  quiz.answerKeywords = buildAnswerKeywords(`${quiz.answer} ${quiz.explanation}`);
  rememberQuizQuestion(quiz.subject, quiz.question);
  return quiz;
}

function getRecentQuizQuestions(subject) {
  try {
    const saved = safeGetItem(`codemind_recent_quiz_questions_${subject}`);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.slice(-8) : [];
  } catch (error) {
    return [];
  }
}

function rememberQuizQuestion(subject, question) {
  if (!question) return;
  const recent = getRecentQuizQuestions(subject);
  recent.push(question);
  safeSetItem(`codemind_recent_quiz_questions_${subject}`, JSON.stringify(recent.slice(-8)));
}

function normalizeDifficulty(difficulty) {
  if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') return difficulty;
  if (difficulty === '하') return 'easy';
  if (difficulty === '중') return 'medium';
  if (difficulty === '상') return 'hard';
  return 'medium';
}

function normalizeQuizSubject(value) {
  if (typeof window.normalizeSubject === 'function') {
    return window.normalizeSubject(value);
  }
  return quizSubjects.includes(value) ? value : '운영체제';
}

function buildAnswerKeywords(answer) {
  return String(answer)
    .replace(/[.,()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .slice(0, 8);
}

function buildFallbackQuiz(subject = '운영체제', selectedDiff = 'medium', type = 'mcq') {
  const difficulty = normalizeDifficulty(selectedDiff === 'all' ? 'medium' : selectedDiff);
  const normalizedSubject = normalizeQuizSubject(subject);
  const pool = fallbackPool[normalizedSubject] || fallbackPool['운영체제'];
  const selected = pool[type === 'essay' ? 'essay' : 'mcq'];
  return {
    id: Date.now(),
    type: type === 'essay' ? 'essay' : 'mcq',
    subject: normalizedSubject,
    difficulty,
    keyword: selected.keyword,
    question: selected.question,
    options: selected.options || [],
    answerIdx: Number.isInteger(selected.answerIdx) ? selected.answerIdx : -1,
    answer: selected.answer,
    answerKeywords: buildAnswerKeywords(selected.answer),
    explanation: selected.explanation,
    source: 'client-fallback'
  };
}

const fallbackPool = {
  '자료구조': {
    mcq: {
      keyword: '스택과 큐',
      question: '스택이 큐보다 더 적합한 상황은 무엇인가요?',
      options: [
        '가장 최근에 추가한 작업을 먼저 되돌려야 할 때',
        '가장 오래 기다린 요청을 먼저 처리해야 할 때',
        '모든 원소를 자동으로 정렬해야 할 때',
        '인덱스로 임의 위치에 자주 접근해야 할 때'
      ],
      answerIdx: 0,
      answer: '가장 최근에 추가한 작업을 먼저 되돌려야 할 때',
      explanation: '스택은 LIFO 구조라서 최근 작업을 먼저 처리하는 undo, 함수 호출 관리에 적합합니다.'
    },
    essay: {
      keyword: '해시 테이블',
      question: '해시 테이블에서 충돌이 발생하는 이유와 이를 처리하는 대표 방법을 설명하세요.',
      answer: '서로 다른 키가 같은 해시 값 또는 같은 버킷으로 매핑될 때 충돌이 발생하며, 체이닝이나 개방 주소법으로 처리할 수 있습니다.',
      explanation: '좋은 답안은 충돌의 원인과 체이닝, 선형 조사 같은 해결 방법을 함께 설명해야 합니다.'
    }
  },
  '알고리즘': {
    mcq: {
      keyword: '시간 복잡도',
      question: '이진 탐색의 시간 복잡도가 O(log n)인 이유로 가장 알맞은 것은 무엇인가요?',
      options: [
        '탐색 범위를 매 단계 절반씩 줄이기 때문이다.',
        '모든 원소를 한 번씩 검사하기 때문이다.',
        '항상 두 번의 비교만 수행하기 때문이다.',
        '배열을 먼저 완전히 정렬하기 때문이다.'
      ],
      answerIdx: 0,
      answer: '탐색 범위를 매 단계 절반씩 줄이기 때문이다.',
      explanation: '이진 탐색은 정렬된 범위의 중앙을 기준으로 절반을 버리므로 입력이 커져도 단계 수가 로그 형태로 증가합니다.'
    },
    essay: {
      keyword: '동적 프로그래밍',
      question: '동적 프로그래밍이 중복 계산을 줄이는 원리를 피보나치 수열 예시로 설명하세요.',
      answer: '이미 계산한 하위 문제의 결과를 저장해 재사용하므로 같은 피보나치 값을 반복 계산하지 않습니다.',
      explanation: '좋은 답안은 하위 문제, 메모이제이션 또는 테이블 저장, 중복 제거를 포함해야 합니다.'
    }
  },
  '운영체제': {
    mcq: {
      keyword: '프로세스와 스레드',
      question: '스레드가 프로세스보다 가볍다고 말하는 이유로 옳은 것은 무엇인가요?',
      options: [
        '같은 프로세스 안의 Code, Data, Heap 영역을 공유하기 때문이다.',
        '스레드는 CPU를 전혀 사용하지 않기 때문이다.',
        '스레드는 항상 별도의 컴퓨터에서 실행되기 때문이다.',
        '스레드는 모든 메모리 영역을 독립적으로 가진다.'
      ],
      answerIdx: 0,
      answer: '같은 프로세스 안의 Code, Data, Heap 영역을 공유하기 때문이다.',
      explanation: '스레드는 같은 프로세스의 자원을 일부 공유하기 때문에 생성과 문맥 교환 비용이 상대적으로 작습니다.'
    },
    essay: {
      keyword: '교착상태',
      question: '교착상태가 발생하기 위한 네 가지 필요 조건을 설명하고, 한 조건을 제거하면 왜 예방이 가능한지 서술하세요.',
      answer: '상호 배제, 점유 대기, 비선점, 순환 대기가 모두 만족될 때 교착상태가 발생하며, 이 중 하나라도 깨면 순환적인 대기를 막을 수 있습니다.',
      explanation: '좋은 답안은 네 조건의 이름과 조건 제거가 예방으로 이어지는 이유를 함께 설명해야 합니다.'
    }
  },
  '네트워크': {
    mcq: {
      keyword: 'TCP와 UDP',
      question: '실시간 화상 통화에서 UDP가 자주 사용되는 이유로 가장 알맞은 것은 무엇인가요?',
      options: [
        '일부 손실을 감수하더라도 지연 시간을 줄이는 데 유리하기 때문이다.',
        '모든 패킷의 재전송을 반드시 보장하기 때문이다.',
        '연결 설정을 위해 항상 3-way handshake를 수행하기 때문이다.',
        '데이터 순서를 TCP보다 더 강하게 보장하기 때문이다.'
      ],
      answerIdx: 0,
      answer: '일부 손실을 감수하더라도 지연 시간을 줄이는 데 유리하기 때문이다.',
      explanation: 'UDP는 연결 설정과 신뢰성 보장 비용이 작아 실시간성이 중요한 서비스에 적합합니다.'
    },
    essay: {
      keyword: 'DNS',
      question: 'DNS가 없다면 사용자가 웹 사이트에 접속할 때 어떤 불편이 생기는지 설명하세요.',
      answer: '도메인 이름을 IP 주소로 바꿔주는 DNS가 없으면 사용자가 사람이 기억하기 어려운 IP 주소를 직접 알아야 합니다.',
      explanation: '좋은 답안은 도메인 이름, IP 주소 변환, 사용자 편의성을 함께 설명해야 합니다.'
    }
  },
  '데이터베이스': {
    mcq: {
      keyword: '정규화',
      question: '데이터베이스 정규화를 수행하는 주된 목적은 무엇인가요?',
      options: [
        '데이터 중복과 이상 현상을 줄이기 위해서',
        '모든 조회를 항상 느리게 만들기 위해서',
        '테이블을 반드시 하나로 합치기 위해서',
        '기본키를 사용하지 않기 위해서'
      ],
      answerIdx: 0,
      answer: '데이터 중복과 이상 현상을 줄이기 위해서',
      explanation: '정규화는 삽입, 삭제, 갱신 이상을 줄이고 데이터 일관성을 높이기 위해 테이블을 적절히 분해합니다.'
    },
    essay: {
      keyword: '인덱스',
      question: '인덱스가 조회 성능을 높일 수 있지만 쓰기 성능에는 부담이 될 수 있는 이유를 설명하세요.',
      answer: '인덱스는 검색 위치를 빠르게 찾도록 돕지만, 삽입과 수정 때 인덱스 구조도 함께 갱신해야 해서 추가 비용이 발생합니다.',
      explanation: '좋은 답안은 조회 최적화와 쓰기 시 유지 비용의 trade-off를 함께 설명해야 합니다.'
    }
  }
};

function renderNoteQuizzes() {
  const container = document.getElementById('noteQuizContainer');
  if (!container) return;

  container.innerHTML = noteAiQuizzes.map(q => {
    const diffLabel = difficultyLabels[q.difficulty] || q.difficulty;
    const diffColor = difficultyColors[q.difficulty] || '#64748b';
    const typeLabel = q.type === 'mcq' ? '객관식' : '서술형';
    const sourceLabel = q.source === 'openai' ? 'OpenAI 생성' : '임시 문제';
    const sourceColor = q.source === 'openai' ? '#2563eb' : '#64748b';

    return `
      <div class="note-card quiz-card" style="--ncolor:${typeof window.subjectColor === 'function' ? window.subjectColor(q.subject) : 'var(--accent3)'};">
        <div class="note-meta">
          <span class="quiz-title-line">
            [${escapeQuizHtml(q.subject)}] ${escapeQuizHtml(q.keyword)} 예상문제
            <span class="quiz-badge">${typeLabel}</span>
            <span class="quiz-badge" style="background:${diffColor};">난이도: ${diffLabel}</span>
            <span class="quiz-badge" style="background:${sourceColor};">${sourceLabel}</span>
          </span>
        </div>
        <div class="note-title">Q. ${escapeQuizHtml(q.question)}</div>
        <div class="quiz-options">
          ${q.type === 'mcq' ? renderMcqOptions(q) : renderEssayInput(q)}
        </div>
        <button class="btn-primary" id="submit-btn-${q.id}" onclick="submitNoteQuiz(${q.id}, event)">답안 제출 및 채점하기</button>
        <div id="note-quiz-result-${q.id}" class="quiz-result"></div>
      </div>
    `;
  }).join('');
}

function renderMcqOptions(q) {
  return q.options.map((option, index) => `
    <label class="quiz-option">
      <input type="radio" name="quiz-${q.id}" value="${index}">
      <span>${index + 1}. ${escapeQuizHtml(option)}</span>
    </label>
  `).join('');
}

function renderEssayInput(q) {
  return `<textarea id="essay-ans-${q.id}" class="quiz-essay" placeholder="여기에 답안을 서술해주세요."></textarea>`;
}

async function submitNoteQuiz(qId, event) {
  const q = noteAiQuizzes.find(item => item.id === qId);
  if (!q) return;

  const resultBox = document.getElementById(`note-quiz-result-${q.id}`);
  const submitBtn = event.target;
  let isCorrect = false;
  let userAnswerStr = '';
  let correctAnswerStr = '';

  if (q.type === 'mcq') {
    const selectedRadio = document.querySelector(`input[name="quiz-${q.id}"]:checked`);
    if (!selectedRadio) {
      showToast('답안을 먼저 선택해주세요.', 'WARN');
      return;
    }

    const selectedIdx = parseInt(selectedRadio.value, 10);
    userAnswerStr = q.options[selectedIdx];
    correctAnswerStr = q.options[q.answerIdx] || q.answer;
    isCorrect = selectedIdx === q.answerIdx;

    document.querySelectorAll(`input[name="quiz-${q.id}"]`).forEach(input => input.disabled = true);
    selectedRadio.closest('.quiz-option').classList.add(isCorrect ? 'correct' : 'wrong');

    const correctRadio = document.querySelector(`input[name="quiz-${q.id}"][value="${q.answerIdx}"]`);
    if (correctRadio) correctRadio.closest('.quiz-option').classList.add('correct');
  } else {
    const essayInput = document.getElementById(`essay-ans-${q.id}`);
    userAnswerStr = essayInput.value.trim();
    if (!userAnswerStr) {
      showToast('답안을 먼저 작성해주세요.', 'WARN');
      return;
    }

    const keywords = q.answerKeywords && q.answerKeywords.length ? q.answerKeywords : buildAnswerKeywords(q.answer || q.explanation);
    const matchCount = keywords.filter(keyword => userAnswerStr.includes(keyword)).length;
    isCorrect = matchCount >= Math.min(2, Math.max(1, keywords.length));
    correctAnswerStr = q.answer || q.explanation;

    essayInput.disabled = true;
    essayInput.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  submitBtn.style.display = 'none';
  resultBox.style.display = 'block';

  if (isCorrect) {
    resultBox.innerHTML = `
      <span class="eval-good">정답입니다.</span>
      <div style="margin-top:10px;"><strong>AI 해설:</strong> ${escapeQuizHtml(q.explanation)}</div>
    `;
    return;
  }

  resultBox.innerHTML = `
    <span class="eval-bad">오답입니다.</span>
    <div style="margin-top:10px;"><strong>AI 해설:</strong> ${escapeQuizHtml(q.explanation)}</div>
    <div class="saved-note-message">오답노트에 자동으로 저장되었습니다.</div>
  `;

  await saveWrongQuizNote(q, userAnswerStr, correctAnswerStr);
}

async function saveWrongQuizNote(q, userAnswerStr, correctAnswerStr) {
  const typeLabel = q.type === 'mcq' ? '객관식' : '서술형';
  const diffLabel = difficultyLabels[q.difficulty] || q.difficulty;
  const subject = normalizeQuizSubject(q.subject);
  const activeNotes = window.getAppNotes();
  const note = {
    id: Date.now(),
    subject,
    title: `AI 예상문제 오답 (${typeLabel} / 난이도: ${diffLabel})`,
    q: q.question,
    wrong: userAnswerStr,
    correct: `${correctAnswerStr}\n해설: ${q.explanation}`,
    date: buildQuizTodayString(),
    color: typeof window.subjectColor === 'function' ? window.subjectColor(subject) : 'var(--accent4)',
    questionType: q.type === 'mcq' ? 'mcq' : 'essay',
    optionsJson: q.type === 'mcq' ? JSON.stringify(q.options) : '',
    answerIdx: q.type === 'mcq' ? q.answerIdx : null,
    answerKeywordsJson: JSON.stringify(q.answerKeywords || buildAnswerKeywords(`${q.answer} ${q.explanation}`)),
    debugSolved: false,
    relapsed: false
  };

  let savedNote = note;
  if (typeof window.createNoteViaApi === 'function') {
    savedNote = await window.createNoteViaApi(note);
  }

  activeNotes.unshift(savedNote);
  window.saveAppNotes();
  refreshNotesAfterSave(subject);
}

function refreshNotesAfterSave(subject) {
  if (window.currentNoteFilter !== 'all' && window.currentNoteFilter !== subject) {
    window.currentNoteFilter = subject;
  }

  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  const activeFilterBtn = Array.from(document.querySelectorAll('.filter-btn'))
    .find(btn => btn.textContent.trim() === (window.currentNoteFilter === 'all' ? '전체' : window.currentNoteFilter));
  if (activeFilterBtn) activeFilterBtn.classList.add('active');

  if (typeof window.renderNotes === 'function') window.renderNotes(window.currentNoteFilter || 'all');
  if (typeof window.addCyberButtonsToCards === 'function') setTimeout(window.addCyberButtonsToCards, 100);
}

function buildQuizTodayString() {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
}

function escapeQuizHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
