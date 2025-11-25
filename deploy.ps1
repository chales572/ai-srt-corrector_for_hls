# AI SRT Corrector - S3 Deployment Script for Windows
# This script builds and deploys the application to AWS S3

param(
    [string]$BucketName = $env:S3_BUCKET_NAME,
    [string]$Region = $env:AWS_REGION
)

# Set default region if not provided
if ([string]::IsNullOrEmpty($Region)) {
    $Region = "us-east-1"
}

$ErrorActionPreference = "Stop"

Write-Host "🚀 AI SRT Corrector - S3 Deployment" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Check if bucket name is provided
if ([string]::IsNullOrEmpty($BucketName)) {
    Write-Host "❌ Error: S3_BUCKET_NAME environment variable is not set" -ForegroundColor Red
    Write-Host "Usage: `$env:S3_BUCKET_NAME='your-bucket-name'; npm run deploy:win" -ForegroundColor Yellow
    Write-Host "Or: `$env:S3_BUCKET_NAME='your-bucket-name'; .\deploy.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "❌ Error: AWS CLI is not installed" -ForegroundColor Red
    Write-Host "Please install AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
Write-Host "🔍 Checking AWS credentials..." -ForegroundColor Yellow
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✓ AWS credentials verified" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: AWS credentials not configured" -ForegroundColor Red
    Write-Host "Please run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Build the application
Write-Host "📦 Building application..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: Build directory not found" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed" -ForegroundColor Green

# Upload to S3
Write-Host "☁️  Uploading to S3 bucket: $BucketName" -ForegroundColor Yellow

# Upload all files with long cache
aws s3 sync dist s3://$BucketName `
    --region $Region `
    --delete `
    --cache-control "public, max-age=31536000" `
    --exclude "*.html" `
    --exclude "*.json"

# Upload HTML files with no-cache
aws s3 sync dist s3://$BucketName `
    --region $Region `
    --cache-control "no-cache" `
    --exclude "*" `
    --include "*.html"

Write-Host "✓ Files uploaded to S3" -ForegroundColor Green

# Set proper MIME types
Write-Host "🔧 Setting MIME types..." -ForegroundColor Yellow

aws s3 cp s3://$BucketName/ s3://$BucketName/ `
    --region $Region `
    --recursive `
    --exclude "*" `
    --include "*.js" `
    --content-type "application/javascript" `
    --metadata-directive REPLACE

aws s3 cp s3://$BucketName/ s3://$BucketName/ `
    --region $Region `
    --recursive `
    --exclude "*" `
    --include "*.css" `
    --content-type "text/css" `
    --metadata-directive REPLACE

Write-Host "✓ MIME types configured" -ForegroundColor Green

# Get bucket website URL
$WebsiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "Website URL: $WebsiteUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure bucket for static website hosting:" -ForegroundColor White
Write-Host "   aws s3 website s3://$BucketName --index-document index.html --error-document index.html" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Make bucket public (if not already):" -ForegroundColor White
Write-Host "   Update YOUR-BUCKET-NAME in s3-bucket-policy.json to: $BucketName" -ForegroundColor Gray
Write-Host "   aws s3api put-bucket-policy --bucket $BucketName --policy file://s3-bucket-policy.json" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Optional: Set up CloudFront for HTTPS and better performance" -ForegroundColor White
Write-Host ""
