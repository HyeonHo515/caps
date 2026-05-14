# CodeMind

컴퓨터공학과 학생을 위한 CS 학습 플랫폼입니다. PDF나 텍스트 자료를 넣으면 핵심 내용을 요약하고, AI 예상문제를 생성하며, 틀린 문제를 오답노트에 저장해 다시 복습할 수 있습니다. 코딩 연습과 커뮤니티 화면도 함께 제공해 전공 공부 흐름을 한 곳에서 이어갈 수 있도록 구성했습니다.

## 주요 기능

### PDF 요약 및 학습 자료 정리

- PDF 파일 또는 텍스트 자료 업로드
- PDFBox 기반 PDF 텍스트 추출
- 핵심 문장 요약, 핵심 키워드 추출
- 요약 내용을 바탕으로 빈칸 복습 문제 생성
- AI 역질문과 설명 평가 기능
- 학습 메모 저장 기능

### AI 예상문제 생성

- 자료구조, 알고리즘, 운영체제, 네트워크, 데이터베이스 과목 분류
- 객관식과 서술형 예상문제 생성
- 난이도 선택: 하, 중, 상, 전체
- OpenAI API 연결 시 실제 AI 기반 문제 생성
- API 호출 실패 또는 키 미설정 시 로컬 fallback 문제 제공

### 오답노트 및 복습

- 틀린 문제 자동 저장
- 사용자별 오답노트 분리
- 과목별 필터링
- 객관식, 서술형, 빈칸 문제 유형 유지
- 오답 디버깅 모드 제공
- 정답 키워드 기반 재채점
- 나만의 복습 시험지 출력 기능

### 코딩 연습

- 자료구조와 알고리즘 연습 문제 제공
- 문제 설명, 입력 예시, 출력 예시, 코드 에디터 UI
- 난이도별 문제 목록
- 실행 및 제출 흐름 프로토타입

### 커뮤니티

- 시험 자료 공유
- 질문 답변
- 진로/취업 정보 공유
- 게시글 목록과 카테고리 필터 UI

## 기술 스택

- Backend: Java 21, Spring Boot 4, Spring Web MVC, Spring Data JPA
- Database: H2
- PDF: Apache PDFBox
- AI: OpenAI Chat Completions API
- Frontend: HTML, CSS, Vanilla JavaScript
- Build: Gradle

## 프로젝트 구조

```text
src/main/java/com/capstone/capstone
├── controller     # API 컨트롤러
├── domain         # JPA 엔티티
├── dto            # 요청/응답 DTO
├── repository     # JPA Repository
└── service        # PDF, AI, 요약, 오답노트 비즈니스 로직

src/main/resources/static
├── index.html
├── css/style.css
└── js
    ├── ai-chat.js
    ├── board.js
    ├── coding.js
    ├── core.js
    ├── custom-exam.js
    ├── debug-review.js
    ├── main.js
    ├── note-quiz.js
    ├── notes.js
    └── pdf-study.js
```

## 실행 방법

### 1. 설정 파일 생성

`src/main/resources/application.properties` 파일은 API 키 보호를 위해 Git에 포함하지 않습니다. 로컬에서 아래 파일을 직접 만들어 주세요.

```properties
spring.application.name=capstone
server.port=8080

spring.datasource.url=jdbc:h2:mem:codemind
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

spring.h2.console.enabled=true

spring.servlet.multipart.max-file-size=20MB
spring.servlet.multipart.max-request-size=20MB

openai.api.key=open api key 넣기
```

`openai.api.key` 값에 본인의 OpenAI API 키를 넣으면 AI 요약, 예상문제, 서술형 채점 기능이 API 기반으로 동작합니다.

### 2. 서버 실행

Windows 기준:

```powershell
.\gradlew.bat bootRun
```

macOS/Linux 기준:

```bash
./gradlew bootRun
```

### 3. 브라우저 접속

```text
http://localhost:8080/
```

## 주요 API

- `POST /api/pdf/extract`  
  PDF 파일에서 텍스트를 추출합니다.

- `POST /api/ai/chat`  
  학습 질문, 요약, 역질문, 서술형 채점 등에 사용하는 AI 채팅 API입니다.

- `POST /api/ai/quiz`  
  과목, 난이도, 문제 유형에 맞는 AI 예상문제를 생성합니다.

- `GET /api/wrong-notes`  
  사용자별 오답노트 목록을 조회합니다.

- `POST /api/wrong-notes`  
  틀린 문제를 오답노트에 저장합니다.

- `PUT /api/wrong-notes/{id}`  
  오답노트의 디버깅 상태, 재발 상태, 문제 정보를 갱신합니다.

- `DELETE /api/wrong-notes/{id}`  
  오답노트를 삭제합니다.

## 보안 및 주의사항

- `src/main/resources/application.properties`는 Git에 올리지 않습니다.
- OpenAI API 키를 GitHub에 커밋하지 마세요.
- 현재 DB는 H2 기반 개발용 설정입니다.
- 실제 배포 시에는 MySQL 같은 외부 DB와 환경변수 기반 설정으로 분리하는 것을 권장합니다.
- 이미지 기반 또는 스캔 PDF는 텍스트 추출이 어려울 수 있으며, 이 경우 OCR 기능이 추가로 필요합니다.

## 향후 개선 아이디어

- MySQL 연동
- 실제 회원가입/로그인 인증
- 사용자별 학습 기록 대시보드
- PDF OCR 처리
- 문제 생성 품질 개선을 위한 프롬프트 고도화
- 커뮤니티 게시글 작성/상세/댓글 기능
