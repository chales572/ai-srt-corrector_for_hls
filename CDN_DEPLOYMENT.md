# 🌐 CDN 배포 가이드 (무료 & 초간단!)

CDN을 통한 배포는 **S3보다 훨씬 쉽고 빠르며 무료**입니다!
아래 옵션 중 하나를 선택하세요.

---

## 🚀 Option 1: Netlify (가장 추천!)

### 특징
- ✅ **완전 무료** (월 100GB 대역폭)
- ✅ 자동 HTTPS
- ✅ Git 푸시만으로 자동 배포
- ✅ 글로벌 CDN
- ✅ 설정 필요 없음

### 배포 방법

#### A. 드래그 앤 드롭 (가장 쉬움!)

1. **빌드하기**
   ```bash
   npm run build
   ```

2. **Netlify 접속**
   - https://app.netlify.com/ 접속
   - GitHub/GitLab/Email로 가입 (무료)

3. **배포하기**
   - "Sites" → "Add new site" → "Deploy manually"
   - `dist` 폴더를 드래그 앤 드롭
   - 완료! 몇 초 후 URL 생성됨

4. **커스텀 도메인 (선택)**
   - Site settings → Domain management
   - 무료 서브도메인 변경 또는 커스텀 도메인 연결

#### B. Git 연동 (자동 배포)

1. **GitHub에 코드 푸시**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Netlify에서 Import**
   - https://app.netlify.com/
   - "Add new site" → "Import an existing project"
   - GitHub 선택 → 저장소 선택
   - Build settings (자동 감지됨):
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Deploy!

3. **완료!**
   - `main` 브랜치에 푸시할 때마다 자동 배포
   - URL: `https://your-site-name.netlify.app`

---

## 🔥 Option 2: Vercel

### 특징
- ✅ 완전 무료
- ✅ 매우 빠름 (Edge Network)
- ✅ 자동 HTTPS
- ✅ Next.js 제작사 (최적화)

### 배포 방법

#### A. CLI로 배포 (빠름!)

1. **Vercel CLI 설치**
   ```bash
   npm i -g vercel
   ```

2. **배포**
   ```bash
   cd ai-srt-corrector
   vercel
   ```
   - 계정 로그인 (GitHub/GitLab/Email)
   - 질문에 Enter 연타 (자동 감지)
   - 완료!

3. **프로덕션 배포**
   ```bash
   vercel --prod
   ```

#### B. Git 연동

1. **GitHub에 코드 푸시**

2. **Vercel에서 Import**
   - https://vercel.com/new
   - GitHub 저장소 선택
   - Deploy 클릭
   - 완료!

3. **URL 확인**
   - `https://your-project.vercel.app`

---

## 📘 Option 3: GitHub Pages

### 특징
- ✅ 완전 무료
- ✅ GitHub 통합
- ✅ 자동 배포
- ⚠️ 공개 저장소만 무료 (Private는 GitHub Pro 필요)

### 배포 방법

1. **GitHub 저장소 생성**
   - 저장소를 GitHub에 푸시

2. **GitHub Actions 설정**
   - 이미 `.github/workflows/deploy.yml` 생성됨!
   - 저장소 → Settings → Pages
   - Source: "GitHub Actions" 선택

3. **배포**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

4. **URL 확인**
   - `https://[username].github.io/[repository-name]/`

### 주의사항
- `vite.config.ts`에 base 경로 추가 필요:
  ```typescript
  export default defineConfig({
    base: '/repository-name/',
    // ... 기존 설정
  })
  ```

---

## ☁️ Option 4: Cloudflare Pages

### 특징
- ✅ 완전 무료
- ✅ 무제한 대역폭
- ✅ 매우 빠른 글로벌 CDN
- ✅ DDoS 보호

### 배포 방법

1. **Cloudflare Pages 접속**
   - https://pages.cloudflare.com/
   - 가입 (무료)

2. **Git 연동**
   - "Create a project"
   - GitHub 저장소 선택
   - Framework preset: "None" (Vite 자동 감지)
   - Build command: `npm run build`
   - Build output: `dist`
   - Deploy!

3. **URL 확인**
   - `https://your-project.pages.dev`

---

## 📊 비교표

| 서비스 | 난이도 | 속도 | 무료 한도 | 자동 배포 | 추천도 |
|--------|--------|------|-----------|-----------|---------|
| **Netlify** | ⭐ 가장 쉬움 | 빠름 | 100GB/월 | ✅ | ⭐⭐⭐⭐⭐ |
| **Vercel** | 쉬움 | 매우 빠름 | 100GB/월 | ✅ | ⭐⭐⭐⭐⭐ |
| **GitHub Pages** | 보통 | 보통 | 무제한* | ✅ | ⭐⭐⭐⭐ |
| **Cloudflare** | 쉬움 | 매우 빠름 | 무제한 | ✅ | ⭐⭐⭐⭐⭐ |
| **AWS S3** | 어려움 | 보통 | 5GB/월 | ❌ | ⭐⭐⭐ |

*GitHub Pages: 월 100GB 소프트 리밋

---

## 🎯 어떤 것을 선택해야 할까?

### 추천 순서

1. **Netlify** - 가장 쉽고 빠르게 시작하고 싶다면
   - 드래그 앤 드롭만으로 배포 가능
   - 초보자에게 가장 친절함

2. **Vercel** - 성능이 중요하다면
   - 전세계에서 가장 빠른 로딩 속도
   - 개발자 경험 최고

3. **Cloudflare Pages** - 트래픽이 많을 것 같다면
   - 무제한 대역폭
   - DDoS 보호

4. **GitHub Pages** - 이미 GitHub을 사용 중이라면
   - 저장소와 통합
   - 추가 계정 불필요

---

## 🚀 5분 완성 가이드 (Netlify)

가장 빠른 방법:

```bash
# 1. 빌드
npm run build

# 2. Netlify 사이트 접속
# https://app.netlify.com/drop

# 3. dist 폴더를 드래그 앤 드롭

# 완료! 🎉
```

URL이 생성되고 바로 접속 가능합니다!

---

## 🔄 재배포 방법

### Netlify/Vercel/Cloudflare (Git 연동)
```bash
git add .
git commit -m "Update"
git push
```
→ 자동으로 배포됨!

### 수동 배포 (드래그 앤 드롭)
```bash
npm run build
```
→ `dist` 폴더를 다시 드래그 앤 드롭

---

## 💡 Pro Tips

1. **커스텀 도메인**
   - 모든 서비스에서 무료로 커스텀 도메인 연결 가능
   - 자동 HTTPS 인증서 발급

2. **환경 변수**
   - 필요 없음! API 키는 사용자가 브라우저에 직접 입력

3. **미리보기 배포**
   - PR마다 자동으로 미리보기 URL 생성 (Netlify/Vercel)

4. **분석**
   - 대부분의 서비스가 기본 분석 제공 (무료)

5. **속도 최적화**
   - 이미 최적화되어 있음! (Vite 빌드 + CDN)

---

## 🆘 문제 해결

### 페이지가 로드되지 않음
- 빌드가 성공했는지 확인: `npm run build`
- `dist` 폴더가 생성되었는지 확인

### 404 오류
- SPA 리다이렉트 설정 확인:
  - Netlify: `netlify.toml` 파일 있음 ✅
  - Vercel: `vercel.json` 파일 있음 ✅

### CORS 오류
- API 키가 올바른지 확인
- 브라우저 콘솔에서 에러 메시지 확인

---

## 📝 요약

| 단계 | Netlify | Vercel | AWS S3 |
|------|---------|--------|---------|
| 설정 시간 | 2분 | 3분 | 30분+ |
| 난이도 | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 비용 | 무료 | 무료 | 유료 |
| HTTPS | 자동 | 자동 | 추가 설정 |
| 자동 배포 | ✅ | ✅ | ❌ |

**결론: CDN이 훨씬 낫습니다!** 특히 Netlify나 Vercel 추천! 🚀

---

## 🎓 더 알아보기

- [Netlify 문서](https://docs.netlify.com/)
- [Vercel 문서](https://vercel.com/docs)
- [GitHub Pages 문서](https://docs.github.com/pages)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages)
