const pdfSamples = {
  os: `운영체제에서 프로세스는 실행 중인 프로그램을 의미한다. 프로세스는 독립적인 메모리 공간을 가지며 운영체제로부터 자원을 할당받는다. 스레드는 프로세스 내부에서 실행되는 흐름 단위이며 같은 프로세스 안의 스레드들은 Code, Data, Heap 영역을 공유하고 Stack은 독립적으로 가진다. CPU 스케줄링은 여러 프로세스에 CPU를 배분하는 방식이며 FCFS, SJF, Round Robin 방식이 있다. 교착상태는 두 개 이상의 프로세스가 서로의 자원을 기다리며 무한정 대기하는 상태이다.`,
  network: `TCP는 연결 지향형 프로토콜로 신뢰성 있는 데이터 전송을 보장한다. UDP는 비연결형 프로토콜로 속도는 빠르지만 순서 보장과 재전송 기능이 없다. IP는 목적지까지 패킷을 전달하는 역할을 하며, HTTP는 웹에서 클라이언트와 서버가 데이터를 주고받기 위한 응용 계층 프로토콜이다. DNS는 도메인 이름을 IP 주소로 변환한다.`
};

let pdfState = {
  sourceText: '',
  summaryText: '',
  summaryItems: [],
  keywords: [],
  blanks: [],
  reverseQuestion: '',
  activeKeyword: '',
  activeBlank: null,
  summaryId: 0
};

const pdfApi = {
  upload: '/api/pdf/upload',
  summary: '/api/pdf/summary',
  quiz: '/api/pdf/quiz',
  reverseQuestion: '/api/pdf/reverse-question',
  evaluateAnswer: '/api/pdf/evaluate-answer',
  memo: '/api/pdf/memo',
  memoList: summaryId => `/api/pdf/memo/${summaryId || 0}`
};

function loadSamplePdfText(type) {
  const textarea = document.getElementById('pdfSourceText');
  textarea.value = pdfSamples[type] || '';
  pdfState.sourceText = textarea.value;
  showToast('예시 학습 자료를 불러왔습니다.');
}

async function loadPdfTextFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const textarea = document.getElementById('pdfSourceText');
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      showToast('PDF 텍스트를 추출하는 중입니다...');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(pdfApi.upload, {
        method: 'POST',
        body: formData
      });

      const data = await readJsonOrText(response);
      if (!response.ok) {
        throw new Error(data.message || data.error || String(data));
      }

      const extractedText = (data.text || '').trim();
      if (!extractedText) {
        throw new Error('PDF에서 텍스트를 추출하지 못했습니다. 이미지/스캔 PDF라면 OCR 처리가 필요합니다.');
      }

      textarea.value = extractedText;
      pdfState.sourceText = extractedText;
      pdfState.summaryId = data.summaryId || 0;
      showToast(`PDF 텍스트를 불러왔습니다. (${extractedText.length.toLocaleString()}자)`);
      return;
    } catch (error) {
      console.error(error);
      showToast(error.message || 'PDF를 읽지 못했습니다.', 'WARN');
      return;
    } finally {
      event.target.value = '';
    }
  }

  const reader = new FileReader();
  reader.onload = e => {
    textarea.value = e.target.result;
    pdfState.sourceText = textarea.value;
    showToast('텍스트 파일을 불러왔습니다.');
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
}

async function readJsonOrText(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

function splitSentences(text) {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?다])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function extractKeywords(text) {
  const candidates = [
    '프로세스', '스레드', 'CPU 스케줄링', '스케줄링', '교착상태', '메모리', '자원', '운영체제',
    'TCP', 'UDP', 'IP', 'HTTP', 'DNS', '패킷', '프로토콜', '클라이언트', '서버',
    '자료구조', '알고리즘', '트리', '스택', '큐', '빅오', '데이터베이스', '정규화', '인덱스'
  ];
  return candidates.filter(keyword => text.includes(keyword)).slice(0, 8);
}

function buildLocalSummary(text) {
  return splitSentences(text)
    .slice(0, 4)
    .map(sentence => sentence.replace(/\s+/g, ' '));
}

async function postText(url, text) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: text
  });
  if (!response.ok) throw new Error(await response.text());
  return response.text();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await response.text());
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

async function generatePdfSummary() {
  const text = document.getElementById('pdfSourceText').value.trim();
  if (!text) {
    showToast('먼저 학습 자료를 입력해주세요.', 'WARN');
    return;
  }

  pdfState.sourceText = text;
  let summaryText = '';

  try {
    showToast('AI 요약을 생성하는 중입니다...');
    summaryText = await postText(pdfApi.summary, text);
  } catch (error) {
    console.warn('Summary API failed. Falling back to local summary.', error);
    summaryText = buildLocalSummary(text).join('\n');
    showToast('요약 API 연결이 어려워 로컬 요약을 표시합니다.', 'WARN');
  }

  pdfState.summaryText = summaryText;
  pdfState.summaryItems = buildLocalSummary(summaryText || text);
  if (!pdfState.summaryItems.length && summaryText) {
    pdfState.summaryItems = summaryText.split('\n').map(line => line.trim()).filter(Boolean);
  }
  pdfState.keywords = extractKeywords(`${text} ${summaryText}`);

  document.getElementById('pdfSummaryOutput').innerHTML = `
    <ul class="summary-list">
      ${pdfState.summaryItems.map(item => `<li>${escapePdfHtml(item)}</li>`).join('')}
    </ul>
  `;

  document.getElementById('pdfKeywordOutput').innerHTML = pdfState.keywords.length
    ? pdfState.keywords.map(keyword => `<span class="keyword-chip">${escapePdfHtml(keyword)}</span>`).join('')
    : '핵심 키워드를 찾지 못했습니다.';

  showToast('요약과 핵심 키워드를 생성했습니다.');
}

async function generateBlankQuiz() {
  const text = (pdfState.summaryText || document.getElementById('pdfSourceText').value).trim();
  if (!text) {
    showToast('먼저 학습 자료를 입력해주세요.', 'WARN');
    return;
  }

  let questions = [];
  try {
    showToast('AI 빈칸 문제를 생성하는 중입니다...');
    const quiz = await postJson(pdfApi.quiz, text);
    if (quiz.question && quiz.answer) {
      questions = [{ keyword: quiz.answer, question: quiz.question }];
    }
  } catch (error) {
    console.warn('Quiz API failed. Falling back to local quiz.', error);
  }

  if (!questions.length) {
    if (!pdfState.summaryItems.length || !pdfState.keywords.length) {
      await generatePdfSummary();
    }

    questions = pdfState.keywords.slice(0, 3).map(keyword => {
      const source = pdfState.summaryItems.find(sentence => sentence.includes(keyword))
        || pdfState.sourceText.split('.').find(sentence => sentence.includes(keyword));
      return source ? { keyword, question: source.replace(keyword, '____').trim() } : null;
    }).filter(Boolean);
  }

  pdfState.blanks = questions;
  pdfState.activeBlank = questions[0] || null;

  document.getElementById('blankQuizArea').innerHTML = questions.length ? questions.map((question, index) => `
    <div class="blank-item">
      <div class="blank-q"><strong>문제 ${index + 1}.</strong> ${escapePdfHtml(question.question)}</div>
      <div class="blank-answer-row">
        <input class="blank-input" id="blankAnswer${index}" placeholder="핵심 키워드를 입력하세요">
        <button class="btn-secondary" onclick="checkBlankAnswer(${index})">정답 확인</button>
      </div>
      <div class="blank-result" id="blankResult${index}">정답을 입력해보세요.</div>
    </div>
  `).join('') : '생성 가능한 빈칸 문제가 없습니다.';

  showToast('빈칸 문제가 생성되었습니다.');
}

async function checkBlankAnswer(index) {
  const question = pdfState.blanks[index];
  if (!question) return;

  const value = document.getElementById(`blankAnswer${index}`).value.trim();
  const result = document.getElementById(`blankResult${index}`);
  if (!value) {
    result.innerHTML = '<span class="eval-bad">답을 먼저 입력해주세요.</span>';
    return;
  }

  pdfState.activeKeyword = question.keyword;
  pdfState.activeBlank = question;

  if (value === question.keyword) {
    result.innerHTML = `<span class="eval-good">정답입니다.</span> 핵심 개념 <strong>${escapePdfHtml(question.keyword)}</strong>를 정확히 기억했습니다.`;
  } else {
    result.innerHTML = `<span class="eval-bad">오답입니다.</span> 정답은 <strong>${escapePdfHtml(question.keyword)}</strong>입니다. 오답노트에 저장했습니다.`;
    await savePdfBlankWrongNote(question, value);
  }
}

async function savePdfBlankWrongNote(question, userAnswer) {
  if (typeof window.createNoteViaApi !== 'function') return;

  const subject = inferPdfSubject(`${pdfState.sourceText} ${question.keyword}`);
  const note = {
    subject,
    title: 'PDF 빈칸 복습 오답',
    q: question.question,
    wrong: userAnswer,
    correct: question.keyword,
    date: buildPdfTodayString(),
    color: typeof window.subjectColor === 'function' ? window.subjectColor(subject) : 'var(--accent4)',
    questionType: 'blank',
    optionsJson: '',
    answerIdx: null,
    answerKeywordsJson: JSON.stringify([question.keyword]),
    debugSolved: false,
    relapsed: false
  };

  const savedNote = await window.createNoteViaApi(note);
  window.getAppNotes().unshift(savedNote);
  window.saveAppNotes();
  if (typeof window.renderNotes === 'function') window.renderNotes(window.currentNoteFilter || 'all');
}

async function generateReverseQuestion() {
  const activeBlank = pdfState.activeBlank || pdfState.blanks[0];
  const keyword = pdfState.activeKeyword || activeBlank?.keyword || pdfState.keywords[0];
  if (!keyword) {
    showToast('먼저 요약 또는 빈칸 문제를 생성해주세요.', 'WARN');
    return;
  }

  try {
    showToast('AI 역질문을 생성하는 중입니다...');
    pdfState.reverseQuestion = await postJson(pdfApi.reverseQuestion, {
      summary: pdfState.summaryText || pdfState.summaryItems.join(' '),
      question: activeBlank?.question || `${keyword} 개념을 설명해보세요.`,
      answer: keyword
    });
  } catch (error) {
    console.warn('Reverse question API failed. Falling back to local question.', error);
    pdfState.reverseQuestion = buildLocalReverseQuestion(keyword);
  }

  document.getElementById('reverseQuestionArea').innerHTML = `
    <div class="reverse-q">AI 역질문: ${escapePdfHtml(pdfState.reverseQuestion)}</div>
    <div style="color:var(--text2);font-size:13px;line-height:1.6;">직접 설명하면서 이해의 빈틈을 확인해보세요.</div>
  `;

  showToast('AI 역질문이 생성되었습니다.');
}

function buildLocalReverseQuestion(keyword) {
  const questionMap = {
    '프로세스': '프로세스와 스레드의 차이를 메모리와 자원 공유 관점에서 설명해보세요.',
    '스레드': '스레드가 프로세스보다 가벼운 이유와 자원 공유의 장단점을 설명해보세요.',
    '교착상태': '교착상태가 왜 발생하는지, 어떤 조건이 충족되어야 하는지 설명해보세요.',
    'TCP': 'TCP가 UDP보다 느릴 수 있는데도 많이 쓰이는 이유를 설명해보세요.',
    'UDP': 'UDP가 실시간 서비스에 적합한 이유를 사례와 함께 설명해보세요.',
    'DNS': 'DNS가 없다면 사용자가 웹 서비스를 이용할 때 어떤 불편이 생기는지 설명해보세요.'
  };
  return questionMap[keyword] || `${keyword} 개념을 자신의 말로 설명해보세요.`;
}

async function evaluateReverseAnswer() {
  const answer = document.getElementById('reverseAnswerInput').value.trim();
  const box = document.getElementById('reverseEvalArea');
  const keyword = pdfState.activeKeyword || pdfState.activeBlank?.keyword || pdfState.keywords[0] || '';

  if (!answer) {
    showToast('설명을 입력해주세요.', 'WARN');
    return;
  }

  let feedback = '';
  try {
    showToast('설명을 평가하는 중입니다...');
    feedback = await postJson(pdfApi.evaluateAnswer, {
      summary: pdfState.summaryText || pdfState.summaryItems.join(' '),
      reverseQuestion: pdfState.reverseQuestion || buildLocalReverseQuestion(keyword),
      userAnswer: answer
    });
  } catch (error) {
    console.warn('Evaluation API failed. Falling back to local evaluation.', error);
    feedback = buildLocalEvaluation(keyword, answer);
  }

  box.style.display = 'block';
  box.innerHTML = `
    <div class="reverse-q">설명 평가 결과</div>
    <div style="color:var(--text2);font-size:13.5px;line-height:1.7;">${escapePdfHtml(String(feedback)).replace(/\n/g, '<br>')}</div>
  `;

  showToast('설명 평가 피드백이 생성되었습니다.');
}

function buildLocalEvaluation(keyword, answer) {
  const checks = {
    '프로세스': ['실행', '프로그램', '메모리'],
    '스레드': ['실행', '공유', '프로세스'],
    '교착상태': ['대기', '자원', '프로세스'],
    'TCP': ['신뢰', '연결', '순서'],
    'UDP': ['비연결', '빠르', '실시간'],
    'DNS': ['도메인', 'IP', '변환']
  };

  const expected = checks[keyword] || [keyword];
  const matched = expected.filter(item => answer.includes(item));
  const missing = expected.filter(item => !answer.includes(item));
  let level = '보완 필요';
  if (matched.length >= Math.max(2, expected.length - 1)) level = '이해 양호';
  if (matched.length === expected.length) level = '이해 우수';

  return [
    `평가: ${level}`,
    `잘 언급한 요소: ${matched.length ? matched.join(', ') : '핵심 요소를 더 보강해야 합니다.'}`,
    `보완이 필요한 요소: ${missing.length ? missing.join(', ') : '없음'}`,
    missing.length
      ? `피드백: ${keyword}를 설명할 때 ${missing.join(', ')} 관점까지 포함하면 더 정확합니다.`
      : '피드백: 핵심 포인트를 고르게 설명했습니다.'
  ].join('\n');
}

async function saveStudyMemo() {
  const input = document.getElementById('studyMemoInput');
  const content = input.value.trim();
  if (!content) {
    showToast('메모 내용을 먼저 입력해주세요.', 'WARN');
    return;
  }

  const memo = {
    summaryId: String(pdfState.summaryId || 0),
    memoContent: content
  };

  try {
    const response = await fetch(pdfApi.memo, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-User-Id': typeof window.getCurrentUserId === 'function' ? window.getCurrentUserId() : 'guest'
      },
      body: JSON.stringify(memo)
    });
    if (!response.ok) throw new Error(await response.text());
    input.value = '';
    showToast('학습 메모를 저장했습니다.');
    await loadStudyMemos();
  } catch (error) {
    console.warn('Memo API failed. Saving locally.', error);
    saveLocalMemo(content);
    input.value = '';
    renderStudyMemos(getLocalMemos());
    showToast('메모를 브라우저에 임시 저장했습니다.', 'WARN');
  }
}

async function loadStudyMemos() {
  try {
    const response = await fetch(pdfApi.memoList(pdfState.summaryId || 0), {
      headers: {
        'X-User-Id': typeof window.getCurrentUserId === 'function' ? window.getCurrentUserId() : 'guest'
      }
    });
    if (!response.ok) throw new Error(await response.text());
    const memos = await response.json();
    renderStudyMemos(Array.isArray(memos) ? memos : []);
  } catch (error) {
    renderStudyMemos(getLocalMemos());
  }
}

function saveLocalMemo(content) {
  const memos = getLocalMemos();
  memos.unshift({
    id: Date.now(),
    memoContent: content,
    createdAt: new Date().toISOString()
  });
  safeSetItem(`codemind_memos_${getMemoUserId()}`, JSON.stringify(memos.slice(0, 30)));
}

function getLocalMemos() {
  try {
    const parsed = JSON.parse(safeGetItem(`codemind_memos_${getMemoUserId()}`) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getMemoUserId() {
  return typeof window.getCurrentUserId === 'function' ? window.getCurrentUserId() : 'guest';
}

function renderStudyMemos(memos) {
  const list = document.getElementById('studyMemoList');
  if (!list) return;
  if (!memos.length) {
    list.textContent = '저장된 메모가 아직 없습니다.';
    return;
  }

  list.innerHTML = memos.map(memo => `
    <div class="memo-item">
      <div>${escapePdfHtml(memo.memoContent || '')}</div>
      <span class="memo-date">${formatMemoDate(memo.createdAt)}</span>
    </div>
  `).join('');
}

function formatMemoDate(value) {
  if (!value) return '방금 전';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '방금 전';
  return date.toLocaleString();
}

function inferPdfSubject(text) {
  if (/(TCP|UDP|DNS|HTTP|IP|패킷|프로토콜|네트워크)/i.test(text)) return '네트워크';
  if (/(프로세스|스레드|교착상태|스케줄링|운영체제)/i.test(text)) return '운영체제';
  if (/(트리|스택|큐|자료구조)/i.test(text)) return '자료구조';
  if (/(DP|탐색|정렬|알고리즘|빅오)/i.test(text)) return '알고리즘';
  if (/(데이터베이스|정규화|인덱스|SQL)/i.test(text)) return '데이터베이스';
  return '운영체제';
}

function buildPdfTodayString() {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
}

function escapePdfHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  loadStudyMemos();
});
