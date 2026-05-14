const problems = [
  {
    id: 1,
    title: '두 수의 합',
    diff: 'easy',
    desc: '정수 배열 nums와 목표 정수 target이 주어졌을 때, 두 수의 합이 target이 되는 두 인덱스를 반환하세요.',
    input: 'nums = [2, 7, 11, 15], target = 9',
    output: '[0, 1]',
    solved: true,
    code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

print(two_sum([2, 7, 11, 15], 9))`
  },
  {
    id: 2,
    title: '유효한 괄호',
    diff: 'easy',
    desc: '괄호 문자열이 올바르게 닫혀있는지 확인하는 함수를 작성하세요.',
    input: 's = "()[]{}"',
    output: 'True',
    solved: true,
    code: `def is_valid(s):
    stack = []
    pairs = {')':'(', '}':'{', ']':'['}
    for c in s:
        if c in '([{':
            stack.append(c)
        elif stack and stack[-1] == pairs[c]:
            stack.pop()
        else:
            return False
    return len(stack) == 0

print(is_valid("()[]{}"))`
  },
  {
    id: 3,
    title: '이진 탐색',
    diff: 'mid',
    desc: '정렬된 배열에서 target 값의 인덱스를 이진 탐색으로 찾으세요.',
    input: 'nums = [-1,0,3,5,9,12], target = 9',
    output: '4',
    solved: false,
    code: `def binary_search(nums, target):
    left, right = 0, len(nums) - 1

    # 여기에 코드를 작성하세요
    pass

print(binary_search([-1,0,3,5,9,12], 9))`
  },
  {
    id: 4,
    title: '최장 공통 부분수열',
    diff: 'hard',
    desc: '두 문자열이 주어졌을 때 LCS(Longest Common Subsequence)의 길이를 DP로 구하세요.',
    input: 'text1 = "abcde", text2 = "ace"',
    output: '3',
    solved: false,
    code: `def lcs(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # 여기에 코드를 작성하세요
    pass

print(lcs("abcde", "ace"))`
  }
];

let currentDiff = 'easy';
let currentProblem = problems[0];

function renderProblems() {
  const list = document.getElementById('problemList');
  if (!list) return;

  const filtered = problems.filter(problem => problem.diff === currentDiff);
  list.innerHTML = filtered.map(problem => `
    <div class="pitem ${problem.id === currentProblem.id ? 'selected' : ''}" onclick="selectProblem(${problem.id})">
      <div class="pitem-status ${problem.solved ? 'solved' : 'unsolved'}"></div>
      <div class="pitem-title">${problem.title}</div>
      <div class="pitem-num">#${problem.id}</div>
    </div>
  `).join('');
}

function selectProblem(id) {
  currentProblem = problems.find(problem => problem.id === id) || problems[0];
  document.getElementById('pTitle').textContent = currentProblem.title;
  document.getElementById('pDesc').textContent = currentProblem.desc;
  document.getElementById('pInput').textContent = currentProblem.input;
  document.getElementById('pOutput').textContent = currentProblem.output;
  document.getElementById('pDiff').textContent = { easy: '쉬움', mid: '보통', hard: '어려움' }[currentProblem.diff];
  document.getElementById('pDiff').className = `p-badge ${currentProblem.diff}`;
  document.getElementById('codeEditor').value = currentProblem.code;
  document.getElementById('editorOutput').innerHTML = '<div class="output-label">출력</div><div class="output-line info">실행 버튼을 눌러 코드를 실행하세요.</div>';
  renderProblems();
  const descTab = document.querySelectorAll('.ptab')[1];
  if (descTab) switchProbTab('desc', descTab);
}

function setDiff(diff, element) {
  currentDiff = diff;
  document.querySelectorAll('.diff-chip').forEach(chip => chip.classList.remove('active'));
  if (element) element.classList.add('active');
  const first = problems.find(problem => problem.diff === diff);
  if (first) selectProblem(first.id);
  else renderProblems();
}

function switchProbTab(tab, element) {
  document.querySelectorAll('.ptab').forEach(item => item.classList.remove('active'));
  if (element) element.classList.add('active');
  document.getElementById('ptab-list').style.display = tab === 'list' ? 'block' : 'none';
  document.getElementById('ptab-desc').style.display = tab === 'desc' ? 'block' : 'none';
}

function runCode() {
  const code = document.getElementById('codeEditor').value;
  const out = document.getElementById('editorOutput');
  out.innerHTML = '<div class="output-label">출력</div>';

  const outputs = {
    1: '[0, 1]\n\n테스트 통과 (3/3)',
    2: 'True\n\n테스트 통과 (5/5)',
    3: code.includes('pass') ? 'None\n\n코드를 완성해주세요.' : '4\n\n테스트 통과 (4/4)',
    4: code.includes('pass') ? 'None\n\n코드를 완성해주세요.' : '3\n\n테스트 통과 (3/3)'
  };

  const result = outputs[currentProblem.id] || '실행 완료';
  setTimeout(() => {
    out.innerHTML = `<div class="output-label">출력</div>${result.split('\n').map(line =>
      `<div class="output-line ${line.includes('완성') ? 'err' : line.includes('통과') ? 'ok' : ''}">${line}</div>`
    ).join('')}`;
  }, 300);
}

function submitCode() {
  runCode();
  setTimeout(() => showToast('코드가 제출되었습니다.'), 500);
}

document.addEventListener('DOMContentLoaded', () => {
  renderProblems();
  selectProblem(1);
});
