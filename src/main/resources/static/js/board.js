let posts = [
  { id: 1, category: 'exam', title: '2025년 운영체제 중간고사 복기본 공유', author: '컴공20_김선배', date: '2시간 전', views: 128, likes: 42, hasFile: true },
  { id: 2, category: 'qna', title: '자료구조 세그먼트 트리 구현 질문 있습니다.', author: '코딩꿈나무', date: '5시간 전', views: 89, likes: 5, hasFile: false },
  { id: 3, category: 'career', title: '인턴십 면접 후기 및 준비 팁', author: '취업성공', date: '1일 전', views: 562, likes: 110, hasFile: true },
  { id: 4, category: 'exam', title: '데이터베이스 정규화 연습문제 답안지', author: 'DB마스터', date: '2일 전', views: 245, likes: 38, hasFile: true }
];

function renderBoard(filter = 'all') {
  const list = document.getElementById('postList');
  if (!list) return;

  const filtered = filter === 'all' ? posts : posts.filter(post => post.category === filter);
  const categoryNames = { exam: '자료공유', qna: '질문답변', career: '진로취업' };

  list.innerHTML = filtered.map(post => `
    <div class="post-item" onclick="showToast('게시글 상세 페이지는 준비 중입니다.')">
      <div class="post-stats">
        <div class="stat-box">
          <div class="stat-val">${post.likes}</div>
          <div class="stat-label">추천</div>
        </div>
      </div>
      <div class="post-main">
        <div class="post-title">
          <span class="post-badge">${categoryNames[post.category]}</span>
          ${post.title}
        </div>
        <div class="post-info">
          <span class="post-author">${post.author}</span>
          <span>${post.date}</span>
          <span>조회 ${post.views}</span>
        </div>
      </div>
      ${post.hasFile ? '<div class="file-badge">자료 포함</div>' : ''}
    </div>
  `).join('');
}

function filterBoard(value, element) {
  document.querySelectorAll('.btab').forEach(tab => tab.classList.remove('active'));
  if (element) element.classList.add('active');
  renderBoard(value);
}

function openBoardModal() {
  showToast('글쓰기 기능은 준비 중입니다.');
}

document.addEventListener('DOMContentLoaded', () => {
  renderBoard();
});
