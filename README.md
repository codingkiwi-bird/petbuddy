# AI 기반 펫시터 매칭 플랫폼

AI 기반 견종 인식 및 성격 분석을 활용한 종합 펫케어 서비스

## 📱 주요 기능

### AI 견종 분석
- AWS Rekognition 커스텀 모델을 활용한 자동 견종 인식
- 견종별 DBTI(댕BTI) 성격 분석 및 자동 입력

### 매칭 시스템
- 견주와 펫시터 양방향 매칭
- 예약 및 일정 관리


##  설치 및 실행

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

##  라이선스

MIT License
