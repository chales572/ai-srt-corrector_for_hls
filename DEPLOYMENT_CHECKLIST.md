# 🚀 S3 배포 체크리스트

## 📋 사전 준비 (1회만)

### 1. AWS 계정 및 CLI 설정
- [ ] AWS 계정 생성 완료
- [ ] AWS CLI 설치 완료
- [ ] `aws configure` 실행하여 자격 증명 설정 완료

### 2. S3 버킷 생성 및 설정
- [ ] S3 버킷 생성 (이름: `________________`)
- [ ] 퍼블릭 액세스 차단 해제
- [ ] `s3-bucket-policy.json`에서 `YOUR-BUCKET-NAME`을 실제 버킷 이름으로 변경
- [ ] 버킷 정책 적용: `aws s3api put-bucket-policy --bucket [버킷명] --policy file://s3-bucket-policy.json`
- [ ] 정적 웹사이트 호스팅 활성화: `aws s3 website s3://[버킷명] --index-document index.html --error-document index.html`

## 🔨 배포 전 체크리스트

### 로컬 테스트
- [ ] `npm run build` 실행하여 빌드 성공 확인
- [ ] `npm run preview` 실행하여 프로덕션 빌드 로컬 테스트
- [ ] API 키 입력 화면 정상 작동 확인
- [ ] SRT 파일 업로드 테스트
- [ ] AI 분석 기능 테스트 (실제 API 키 사용)
- [ ] 자막 편집 기능 테스트
- [ ] 다운로드 기능 테스트
- [ ] 다크모드 전환 테스트

### 파일 확인
- [ ] `dist` 폴더가 생성되었는지 확인
- [ ] `dist/index.html` 파일 존재 확인
- [ ] `dist/assets` 폴더 내 JS/CSS 파일 확인

## 🚀 배포 실행

### Windows 환경
```powershell
# 환경 변수 설정
$env:S3_BUCKET_NAME = "your-bucket-name"
$env:AWS_REGION = "us-east-1"

# 배포 실행
npm run deploy:win
```

### Mac/Linux 환경
```bash
# 배포 실행
S3_BUCKET_NAME=your-bucket-name AWS_REGION=us-east-1 npm run deploy
```

## ✅ 배포 후 확인

### 기본 확인
- [ ] 스크립트가 에러 없이 완료됨
- [ ] S3 버킷에 파일이 업로드되었는지 AWS 콘솔에서 확인
- [ ] 웹사이트 URL 접속: `http://[버킷명].s3-website-[리전].amazonaws.com`

### 기능 테스트 (프로덕션 환경)
- [ ] 페이지가 정상적으로 로드됨
- [ ] API 키 입력 화면 표시됨
- [ ] API 키 입력 후 메인 화면 진입 가능
- [ ] SRT 파일 업로드 가능
- [ ] 비디오 파일 업로드 가능 (선택사항)
- [ ] AI 분석 기능 정상 작동
- [ ] 자막 클릭하여 편집 가능
- [ ] 저장 및 다운로드 기능 정상 작동
- [ ] 설정에서 API 키 삭제/재설정 가능
- [ ] 다크모드 정상 작동
- [ ] 브라우저 새로고침 후에도 API 키 유지됨

### 성능 확인
- [ ] 페이지 로딩 속도 확인 (3초 이내 권장)
- [ ] 모바일 브라우저에서 테스트
- [ ] 다른 브라우저에서 테스트 (Chrome, Firefox, Safari 등)

## 🌐 CloudFront 설정 (선택사항 - HTTPS 사용)

- [ ] CloudFront 배포 생성
- [ ] S3 웹사이트 엔드포인트를 Origin으로 설정
- [ ] "Redirect HTTP to HTTPS" 활성화
- [ ] SSL 인증서 설정 (기본값 또는 ACM)
- [ ] CloudFront URL 접속 테스트: `https://[distribution-id].cloudfront.net`
- [ ] 모든 기능 재테스트

### 커스텀 도메인 (선택사항)
- [ ] Route 53 또는 외부 DNS에서 CNAME 레코드 추가
- [ ] CloudFront에서 Alternate Domain Names 설정
- [ ] ACM에서 SSL 인증서 발급 및 연결
- [ ] 커스텀 도메인으로 접속 테스트

## 🔄 재배포 프로세스

코드를 수정한 후 재배포할 때:

1. 로컬 테스트
   - [ ] `npm run build && npm run preview`로 로컬 테스트

2. 배포
   ```bash
   # Windows
   $env:S3_BUCKET_NAME = "your-bucket-name"
   npm run deploy:win

   # Mac/Linux
   S3_BUCKET_NAME=your-bucket-name npm run deploy
   ```

3. CloudFront 캐시 무효화 (CloudFront 사용 시)
   - [ ] `aws cloudfront create-invalidation --distribution-id [ID] --paths "/*"`

4. 재확인
   - [ ] 브라우저 캐시 삭제 후 접속 (Ctrl+Shift+R)
   - [ ] 변경사항 반영 확인

## 🐛 문제 해결

### 403 Forbidden 오류
- [ ] 버킷 정책 확인
- [ ] 퍼블릭 액세스 차단 설정 확인

### 404 Not Found 오류
- [ ] 정적 웹사이트 호스팅 활성화 확인
- [ ] index.html 파일 업로드 확인

### API 호출 실패
- [ ] 브라우저 콘솔에서 에러 메시지 확인
- [ ] API 키가 올바르게 입력되었는지 확인
- [ ] Gemini API 할당량 확인

### 스타일이 깨짐
- [ ] MIME 타입 설정 확인
- [ ] 브라우저 캐시 삭제 후 재시도

## 📝 배포 정보 기록

| 항목 | 정보 |
|------|------|
| 버킷 이름 | |
| 리전 | |
| 웹사이트 URL | |
| CloudFront URL | |
| 커스텀 도메인 | |
| 마지막 배포 날짜 | |
| 마지막 배포자 | |

## 💡 유용한 명령어

```bash
# S3 버킷 내용 확인
aws s3 ls s3://[버킷명] --recursive

# 특정 파일 삭제
aws s3 rm s3://[버킷명]/[파일경로]

# 버킷 전체 삭제 (주의!)
aws s3 rb s3://[버킷명] --force

# CloudFront 배포 목록
aws cloudfront list-distributions

# 버킷 정책 확인
aws s3api get-bucket-policy --bucket [버킷명]
```
