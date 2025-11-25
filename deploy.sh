#!/bin/bash

# AI SRT Corrector - S3 Deployment Script
# This script builds and deploys the application to AWS S3

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BUCKET_NAME="${S3_BUCKET_NAME:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
DIST_DIR="dist"

echo -e "${GREEN}🚀 AI SRT Corrector - S3 Deployment${NC}"
echo "======================================"

# Check if bucket name is provided
if [ -z "$BUCKET_NAME" ]; then
    echo -e "${RED}❌ Error: S3_BUCKET_NAME environment variable is not set${NC}"
    echo "Usage: S3_BUCKET_NAME=your-bucket-name ./deploy.sh"
    echo "Or: S3_BUCKET_NAME=your-bucket-name npm run deploy"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}🔍 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Error: AWS credentials not configured${NC}"
    echo "Please run: aws configure"
    exit 1
fi
echo -e "${GREEN}✓ AWS credentials verified${NC}"

# Build the application
echo -e "${YELLOW}📦 Building application...${NC}"
npm run build

if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}❌ Error: Build directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build completed${NC}"

# Upload to S3
echo -e "${YELLOW}☁️  Uploading to S3 bucket: $BUCKET_NAME${NC}"
aws s3 sync $DIST_DIR s3://$BUCKET_NAME \
    --region $AWS_REGION \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "*.json"

# Upload HTML files with no-cache
aws s3 sync $DIST_DIR s3://$BUCKET_NAME \
    --region $AWS_REGION \
    --cache-control "no-cache" \
    --exclude "*" \
    --include "*.html"

echo -e "${GREEN}✓ Files uploaded to S3${NC}"

# Set proper MIME types
echo -e "${YELLOW}🔧 Setting MIME types...${NC}"
aws s3 cp s3://$BUCKET_NAME/ s3://$BUCKET_NAME/ \
    --region $AWS_REGION \
    --recursive \
    --exclude "*" \
    --include "*.js" \
    --content-type "application/javascript" \
    --metadata-directive REPLACE

aws s3 cp s3://$BUCKET_NAME/ s3://$BUCKET_NAME/ \
    --region $AWS_REGION \
    --recursive \
    --exclude "*" \
    --include "*.css" \
    --content-type "text/css" \
    --metadata-directive REPLACE

echo -e "${GREEN}✓ MIME types configured${NC}"

# Get bucket website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "======================================"
echo -e "Website URL: ${GREEN}$WEBSITE_URL${NC}"
echo ""
echo "Next steps:"
echo "1. Configure bucket for static website hosting:"
echo "   aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html"
echo ""
echo "2. Make bucket public (if not already):"
echo "   aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://s3-bucket-policy.json"
echo "   (Remember to update YOUR-BUCKET-NAME in s3-bucket-policy.json first)"
echo ""
echo "3. Optional: Set up CloudFront for HTTPS and better performance"
echo ""
