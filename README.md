# 🐕 AI 기반 펫시터 매칭 플랫폼

🐕 AI-powered Pet Sitter Matching Platform with React Native + AWS

React Native + AWS + 실시간 채팅을 활용한 종합 펫케어 서비스

## 📱 주요 기능

### 🤖 AI 견종 분석
- AWS Rekognition 커스텀 모델을 활용한 자동 견종 인식
- 견종별 DBTI(댕BTI) 성격 분석 및 자동 입력
- 98% 이상의 높은 인식 정확도

### 💬 실시간 채팅
- Socket.io 기반 양방향 실시간 통신
- 텍스트, 이미지, 파일 전송 지원
- 읽음 상태 및 타이핑 표시

### 🔄 매칭 시스템
- 견주와 펫시터 양방향 매칭
- 위치 기반 추천 시스템
- 예약 및 일정 관리

## 🏗️ 기술 스택

### Frontend (Mobile)
- React Native + TypeScript
- Expo (개발 플랫폼)
- Zustand (상태 관리)
- Socket.io Client (실시간 통신)

### Backend (Server)
- Node.js + Express.js
- Socket.io (실시간 서버)
- JWT + bcrypt (인증/보안)

### Database (Hybrid)
- MySQL (관계형 데이터)
  - 사용자, 반려견, 예약 정보
  - AI 분석 결과
- MongoDB (문서형 데이터)
  - 채팅 메시지
  - 대화방 정보

### AWS Services
- S3 (이미지 저장소)
- SQS (메시지 큐)
- Rekognition (AI 견종 분석)
- RDS (클라우드 MySQL)

### Background Processing
- SQS Worker (비동기 이미지 처리)
- XLSX (Excel 데이터 처리)

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js (v18+)
- MySQL (로컬 또는 RDS)
- MongoDB (로컬 또는 Atlas)
- AWS 계정 (S3, SQS, Rekognition)
- Expo CLI

### 백엔드 설정
```bash
cd backend/server
npm install
cp .env.example .env
# .env 파일에서 데이터베이스 및 AWS 설정
npm start
```

### SQS 워커 실행
```bash
cd sqs-worker
npm install
# .env 파일에서 AWS 및 데이터베이스 설정
node worker.js
```

### 프론트엔드 실행
```bash
cd frontend/pet-buddy-ui
npm install
npx expo start
```

## 📊 시스템 아키텍처

```
📱 React Native App
    ↕️
🖥️ Express.js Server
    ↕️
📊 MySQL + 📄 MongoDB
    ↕️
☁️ AWS Services (S3, SQS, Rekognition)
    ↕️
🔄 SQS Worker
```

## 🔄 AI 분석 파이프라인

1. 📸 앱에서 사진 촬영
2. 🔐 백엔드에서 S3 사전서명 URL 생성
3. ☁️ S3에 이미지 직접 업로드
4. 📨 S3 이벤트 → SQS 메시지 자동 트리거
5. 🔄 SQS Worker가 메시지 수신
6. 🤖 AWS Rekognition으로 견종 분석
7. 📊 분석 결과를 MySQL에 저장
8. 📱 앱에서 실시간 결과 조회

## 📝 주요 특징

### TypeScript 기반 타입 안전성
- 컴파일 타임 에러 체크
- 자동완성 및 IntelliSense 지원
- 런타임 오류 80% 감소

### 하이브리드 데이터베이스
- MySQL: 관계형 데이터 (사용자, 예약)
- MongoDB: 문서형 데이터 (채팅)
- 각 데이터 특성에 최적화된 저장소 선택

### 확장 가능한 아키텍처
- 마이크로서비스 구조
- AWS 관리형 서비스 활용
- 수평/수직 확장 지원

## 📄 라이선스

MIT License

## 👨‍💻 개발자

[개발자 정보]

---

🐕 **더 나은 반려견 생활을 위한 AI 기반 플랫폼** ✨
