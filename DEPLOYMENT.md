# AWS S3 배포 가이드

이 문서는 AI SRT Corrector를 AWS S3에 정적 웹사이트로 배포하는 방법을 설명합니다.

## 📋 사전 요구사항

1. **AWS 계정**
   - AWS 계정이 필요합니다: https://aws.amazon.com/

2. **AWS CLI 설치**
   - Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
   - Mac: `brew install awscli`
   - Linux: `sudo apt-get install awscli`

3. **Node.js & npm**
   - 이미 설치되어 있어야 합니다

## 🔧 초기 설정

### 1. AWS CLI 설정

```bash
aws configure
```

다음 정보를 입력하세요:
- AWS Access Key ID: [IAM에서 발급받은 키]
- AWS Secret Access Key: [IAM에서 발급받은 시크릿]
- Default region name: us-east-1 (또는 원하는 리전)
- Default output format: json

### 2. S3 버킷 생성

#### 옵션 A: AWS 콘솔에서 생성
1. AWS 콘솔 접속 → S3 서비스
2. "버킷 만들기" 클릭
3. 버킷 이름 입력 (예: `my-srt-corrector`)
4. 리전 선택
5. "퍼블릭 액세스 차단" 설정 해제 (정적 웹사이트를 위해)
6. 버킷 생성

#### 옵션 B: CLI로 생성
```bash
# 버킷 생성
aws s3 mb s3://my-srt-corrector --region us-east-1

# 퍼블릭 액세스 차단 해제
aws s3api put-public-access-block --bucket my-srt-corrector --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### 3. 버킷 정책 설정

`s3-bucket-policy.json` 파일을 열고 `YOUR-BUCKET-NAME`을 실제 버킷 이름으로 변경:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-srt-corrector/*"
    }
  ]
}
```

정책 적용:
```bash
aws s3api put-bucket-policy --bucket my-srt-corrector --policy file://s3-bucket-policy.json
```

### 4. 정적 웹사이트 호스팅 활성화

```bash
aws s3 website s3://my-srt-corrector --index-document index.html --error-document index.html
```

## 🚀 배포하기

### Windows에서 배포

```powershell
# 환경 변수 설정
$env:S3_BUCKET_NAME = "my-srt-corrector"
$env:AWS_REGION = "us-east-1"

# 배포 실행
npm run deploy:win
```

또는:

```powershell
$env:S3_BUCKET_NAME = "my-srt-corrector"
.\deploy.ps1
```

### Mac/Linux에서 배포

```bash
# 스크립트 실행 권한 부여 (최초 1회)
chmod +x deploy.sh

# 환경 변수 설정 및 배포
S3_BUCKET_NAME=my-srt-corrector AWS_REGION=us-east-1 npm run deploy
```

또는:

```bash
S3_BUCKET_NAME=my-srt-corrector ./deploy.sh
```

## 🌐 배포된 사이트 접속

배포 후 다음 URL로 접속할 수 있습니다:

```
http://[버킷이름].s3-website-[리전].amazonaws.com
```

예시:
```
http://my-srt-corrector.s3-website-us-east-1.amazonaws.com
```

## 🔒 HTTPS 설정 (선택사항)

프로덕션 환경에서는 HTTPS를 사용하는 것이 권장됩니다.

### CloudFront 배포 생성

1. **CloudFront 콘솔 접속**
2. "배포 생성" 클릭
3. 설정:
   - Origin Domain: S3 버킷 웹사이트 엔드포인트 선택
   - Viewer Protocol Policy: "Redirect HTTP to HTTPS"
   - Price Class: 원하는 옵션 선택
   - Alternate Domain Names (CNAMEs): 커스텀 도메인 (선택사항)
   - SSL Certificate: AWS Certificate Manager에서 발급 또는 기본값 사용

4. **배포 생성 후 도메인 확인**
   - CloudFront URL: `https://[distribution-id].cloudfront.net`

### 커스텀 도메인 연결 (선택사항)

1. **AWS Certificate Manager에서 SSL 인증서 발급**
   - 리전: us-east-1 (CloudFront는 이 리전만 사용)
   - 도메인 검증 완료

2. **Route 53 또는 외부 DNS에서 CNAME 레코드 추가**
   ```
   www.yourdomain.com → [distribution-id].cloudfront.net
   ```

## 📝 배포 시 주의사항

### 1. .env.local 파일
- `.env.local` 파일은 배포되지 않습니다 (gitignore에 포함)
- 사용자가 직접 브라우저에서 API 키를 입력하도록 설계되었습니다

### 2. 캐시 관리
- JS/CSS 파일: 1년 캐시
- HTML 파일: 캐시 안 함 (항상 최신 버전)

### 3. 재배포
새로운 버전을 배포할 때:
```bash
# Windows
$env:S3_BUCKET_NAME = "my-srt-corrector"
npm run deploy:win

# Mac/Linux
S3_BUCKET_NAME=my-srt-corrector npm run deploy
```

CloudFront를 사용하는 경우 캐시 무효화:
```bash
aws cloudfront create-invalidation --distribution-id [YOUR-DISTRIBUTION-ID] --paths "/*"
```

## 💰 비용 관리

### S3 비용
- 스토리지: 약 1MB 미만 (거의 무료)
- 요청: GET 요청 기준 10,000건당 $0.0004
- 데이터 전송: 월 1GB 무료, 이후 GB당 $0.09

### CloudFront 비용 (사용 시)
- 데이터 전송: 월 1TB까지 GB당 $0.085
- 요청: 10,000건당 $0.01

**예상 비용**: 소규모 사용 시 월 1-5달러 이내

## 🔍 문제 해결

### 403 Forbidden 오류
- 버킷 정책이 올바르게 설정되었는지 확인
- 퍼블릭 액세스 차단이 해제되었는지 확인

### 빈 페이지 또는 404 오류
- 정적 웹사이트 호스팅이 활성화되었는지 확인
- index.html이 올바르게 업로드되었는지 확인

### 스크립트 실행 오류
- AWS CLI가 설치되었는지 확인: `aws --version`
- AWS 자격 증명이 설정되었는지 확인: `aws sts get-caller-identity`
- S3_BUCKET_NAME 환경 변수가 설정되었는지 확인

## 📚 추가 리소스

- [AWS S3 정적 웹사이트 호스팅 가이드](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [AWS CloudFront 문서](https://docs.aws.amazon.com/cloudfront/)
- [AWS CLI 문서](https://docs.aws.amazon.com/cli/)

## 🆘 지원

문제가 발생하면 GitHub Issues에 문의해주세요.
