# AI SRT Corrector

AI 기반 자막 교정 도구 - Google Gemini AI를 활용하여 SRT 자막 파일의 오타와 오류를 자동으로 찾아내고 수정합니다.

## ✨ 주요 기능

- 🤖 **AI 기반 오류 감지**: Google Gemini AI로 자막의 오타와 철자 오류 자동 감지
- ✏️ **직관적인 편집**: 자막을 클릭하여 바로 수정 가능
- 🎥 **비디오 동기화**: MP4 비디오와 자막을 동기화하여 재생
- 💡 **AI 제안**: 감지된 오류에 대한 수정 제안 제공
- 🌓 **다크 모드**: 눈에 편한 다크 모드 지원
- 🔒 **안전한 API 키 관리**: 브라우저 로컬 스토리지에 안전하게 저장
- 📥 **간편한 다운로드**: 수정된 자막 파일 다운로드

## 🚀 빠른 시작

### 사전 요구사항

- Node.js (v16 이상)
- Google Gemini API 키 ([발급 받기](https://aistudio.google.com/app/apikey))

### 로컬 실행

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **개발 서버 실행**
   ```bash
   npm run dev
   ```

3. **브라우저에서 열기**
   - 로컬: http://localhost:3000/
   - 첫 실행 시 Gemini API 키를 입력하세요

### 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 🌐 배포 방법

### 🚀 추천: CDN 배포 (무료 & 초간단!)

#### Netlify (가장 쉬움!)
1. `npm run build`
2. https://app.netlify.com/drop 접속
3. `dist` 폴더를 드래그 앤 드롭
4. 완료! 🎉

#### 다른 CDN 옵션
- **Vercel**: 매우 빠름, CLI로 `vercel` 명령 실행
- **Cloudflare Pages**: 무제한 대역폭
- **GitHub Pages**: GitHub 통합

📘 **자세한 CDN 가이드**: [CDN_DEPLOYMENT.md](CDN_DEPLOYMENT.md)

### AWS S3 배포 (고급)

**Windows:**
```powershell
$env:S3_BUCKET_NAME = "your-bucket-name"
npm run deploy:win
```

**Mac/Linux:**
```bash
S3_BUCKET_NAME=your-bucket-name npm run deploy
```

📘 **자세한 S3 가이드**: [DEPLOYMENT.md](DEPLOYMENT.md)

## 📖 사용 방법

1. **API 키 설정**
   - 첫 실행 시 Google Gemini API 키 입력
   - 브라우저에 안전하게 저장됩니다

2. **자막 파일 업로드**
   - SRT 파일을 업로드하세요
   - 비디오 파일(MP4)도 선택적으로 업로드 가능

3. **AI 분석 시작**
   - "Start Analysis" 버튼 클릭
   - AI가 자동으로 오류를 감지합니다

4. **오류 수정**
   - 왼쪽 오류 목록에서 선택하거나
   - 오른쪽 자막을 직접 클릭하여 수정

5. **다운로드**
   - 수정 완료 후 "Download" 버튼으로 저장

## 🛠️ 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **AI**: Google Gemini API
- **Styling**: Tailwind CSS (inline)
- **State Management**: React Hooks

## 📁 프로젝트 구조

```
ai-srt-corrector/
├── components/          # React 컴포넌트
│   ├── ApiKeySetup.tsx # API 키 입력 화면
│   └── icons.tsx       # 아이콘 컴포넌트
├── services/           # 비즈니스 로직
│   ├── geminiService.ts    # Gemini AI 연동
│   ├── srtParser.ts        # SRT 파싱
│   └── apiKeyStorage.ts    # API 키 관리
├── App.tsx             # 메인 앱 컴포넌트
├── types.ts            # TypeScript 타입 정의
├── deploy.sh           # Linux/Mac 배포 스크립트
├── deploy.ps1          # Windows 배포 스크립트
└── DEPLOYMENT.md       # 배포 가이드
```

## 🔧 개발

### 사용 가능한 스크립트

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run preview      # 빌드된 앱 미리보기
npm run deploy       # S3 배포 (Linux/Mac)
npm run deploy:win   # S3 배포 (Windows)
```

## 🔒 보안

- API 키는 브라우저의 localStorage에만 저장됩니다
- 서버로 전송되지 않으며, 사용자만 접근 가능합니다
- 언제든지 설정에서 삭제할 수 있습니다

## 📝 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 🤝 기여

이슈와 풀 리퀘스트는 언제나 환영합니다!

## 📧 문의

문제가 발생하면 GitHub Issues에 등록해주세요.
