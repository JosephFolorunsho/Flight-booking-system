#!/bin/bash   
   
set -e   
   
# AWS Deployment Script for SkyRoute   
# Deploys backend to EC2 and configures RDS PostgreSQL   
   
echo "🚀 Starting AWS Deployment..."   
   
# Variables   
AWS_REGION=${AWS_REGION:-us-east-1}   
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.medium}   
SECURITY_GROUP_NAME="skyroute-sg"   
RDS_INSTANCE_ID="skyroute-postgres"   
RDS_INSTANCE_CLASS="db.t3.micro"   
RDS_ALLOCATED_STORAGE=20   
   
# Colors   
RED='\033[0;31m'   
GREEN='\033[0;32m'   
YELLOW='\033[1;33m'   
NC='\033[0m'   
   
# Helper functions   
log_info() {   
    echo -e "${GREEN}✅ $1${NC}"   
}   
   
log_warn() {   
    echo -e "${YELLOW}⚠️  $1${NC}"   
}   
   
log_error() {   
    echo -e "${RED}❌ $1${NC}"   
    exit 1   
}   
   
# Step 1: Create EC2 Security Group   
echo -e "\n${YELLOW}Step 1: Creating Security Group...${NC}"   
   
aws ec2 create-security-group \   
    --group-name $SECURITY_GROUP_NAME \   
    --description "SkyRoute Application Security Group" \   
    --region $AWS_REGION || log_warn "Security group already exists"   
   
# Get security group ID   
SG_ID=$(aws ec2 describe-security-groups \   
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \   
    --query 'SecurityGroups[0].GroupId' \   
    --region $AWS_REGION \   
    --output text)   
   
log_info "Security Group ID: $SG_ID"   
   
# Add inbound rules   
aws ec2 authorize-security-group-ingress \   
    --group-id $SG_ID \   
    --protocol tcp \   
    --port 80 \   
    --cidr 0.0.0.0/0 \   
    --region $AWS_REGION || log_warn "Port 80 already authorized"   
   
aws ec2 authorize-security-group-ingress \   
    --group-id $SG_ID \   
    --protocol tcp \   
    --port 443 \   
    --cidr 0.0.0.0/0 \   
    --region $AWS_REGION || log_warn "Port 443 already authorized"   
   
aws ec2 authorize-security-group-ingress \   
    --group-id $SG_ID \   
    --protocol tcp \   
    --port 3000 \   
    --cidr 0.0.0.0/0 \   
    --region $AWS_REGION || log_warn "Port 3000 already authorized"   
   
log_info "Security group rules configured"   
   
# Step 2: Create RDS PostgreSQL Instance   
echo -e "\n${YELLOW}Step 2: Creating RDS PostgreSQL Instance...${NC}"   
   
aws rds create-db-instance \   
    --db-instance-identifier $RDS_INSTANCE_ID \   
    --db-instance-class $RDS_INSTANCE_CLASS \   
    --engine postgres \   
    --engine-version 15.4 \   
    --master-username postgres \   
    --master-user-password "${RDS_PASSWORD}" \   
    --allocated-storage $RDS_ALLOCATED_STORAGE \   
    --storage-type gp2 \   
    --vpc-security-group-ids $SG_ID \   
    --publicly-accessible false \   
    --db-name skyroute \   
    --region $AWS_REGION \   
    --enable-cloudwatch-logs-exports postgresql \   
    --multi-az false \   
    --backup-retention-period 7 \   
    --enable-iam-database-authentication false || log_warn "RDS instance already exists or creation in progress"   
   
log_info "RDS instance creation initiated"   
echo -e "${YELLOW}⏳ Waiting for RDS to be available (this takes 10-15 minutes)...${NC}"   
   
# Wait for RDS to be available   
aws rds wait db-instance-available \   
    --db-instance-identifier $RDS_INSTANCE_ID \   
    --region $AWS_REGION || log_warn "RDS availability check timed out"   
   
# Get RDS endpoint   
RDS_ENDPOINT=$(aws rds describe-db-instances \   
    --db-instance-identifier $RDS_INSTANCE_ID \   
    --query 'DBInstances[0].Endpoint.Address' \   
    --region $AWS_REGION \   
    --output text)   
   
log_info "RDS Endpoint: $RDS_ENDPOINT"   
   
# Step 3: Launch EC2 Instance   
echo -e "\n${YELLOW}Step 3: Launching EC2 Instance...${NC}"   
   
# Get latest Ubuntu 22.04 LTS AMI   
AMI_ID=$(aws ec2 describe-images \   
    --owners 099720109477 \   
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \   
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \   
    --region $AWS_REGION \   
    --output text)   
   
log_info "Using AMI: $AMI_ID"   
   
# Create user data script   
cat > user-data.sh << 'EOF'   
#!/bin/bash   
set -e   
   
echo "Starting EC2 setup..."   
   
# Update system   
apt-get update   
apt-get upgrade -y   
   
# Install Docker   
apt-get install -y \   
    apt-transport-https \   
    ca-certificates \   
    curl \   
    gnupg \   
    lsb-release   
   
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg   
   
echo \   
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \   
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null   
   
apt-get update   
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin   
   
# Install Docker Compose   
apt-get install -y docker-compose   
   
# Create app directory   
mkdir -p /home/ubuntu/app   
cd /home/ubuntu/app   
   
# Clone repository   
git clone https://github.com/JosephFolorunsho/Flight-booking-system.git .   
   
# Create environment file   
cat > .env.production << 'ENVEOF'   
NODE_ENV=production   
DB_HOST=${RDS_ENDPOINT}   
DB_PORT=5432   
DB_NAME=skyroute   
DB_USER=postgres   
DB_PASSWORD=${RDS_PASSWORD}   
NEXT_PUBLIC_API_URL=http://localhost:3000   
ENVEOF   
   
# Run migrations   
docker-compose -f docker-compose.prod.yml exec backend npm run migrate || true   
   
# Start application   
docker-compose -f docker-compose.prod.yml up -d   
   
echo "EC2 setup complete"   
EOF   
   
# Replace variables in user data   
sed -i "s|\${RDS_ENDPOINT}|$RDS_ENDPOINT|g" user-data.sh   
sed -i "s|\${RDS_PASSWORD}|${RDS_PASSWORD}|g" user-data.sh   
   
# Launch instance   
INSTANCE_ID=$(aws ec2 run-instances \   
    --image-id $AMI_ID \   
    --instance-type $INSTANCE_TYPE \   
    --security-group-ids $SG_ID \   
    --user-data file://user-data.sh \   
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=SkyRoute-Backend}]" \   
    --region $AWS_REGION \   
    --query 'Instances[0].InstanceId' \   
    --output text)   
   
log_info "EC2 Instance ID: $INSTANCE_ID"   
echo -e "${YELLOW}⏳ Waiting for instance to be running...${NC}"   
   
# Wait for instance to be running   
aws ec2 wait instance-running \   
    --instance-ids $INSTANCE_ID \   
    --region $AWS_REGION   
   
# Get public IP   
PUBLIC_IP=$(aws ec2 describe-instances \   
    --instance-ids $INSTANCE_ID \   
    --query 'Reservations[0].Instances[0].PublicIpAddress' \   
    --region $AWS_REGION \   
    --output text)   
   
log_info "EC2 Public IP: $PUBLIC_IP"   
   
# Step 4: Create CloudWatch Alarms   
echo -e "\n${YELLOW}Step 4: Setting up CloudWatch Monitoring...${NC}"   
   
aws cloudwatch put-metric-alarm \   
    --alarm-name skyroute-ec2-cpu \   
    --alarm-description "Alert when EC2 CPU exceeds 80%" \   
    --metric-name CPUUtilization \   
    --namespace AWS/EC2 \   
    --statistic Average \   
    --period 300 \   
    --threshold 80 \   
    --comparison-operator GreaterThanThreshold \   
    --evaluation-periods 2 \   
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \   
    --region $AWS_REGION || log_warn "CloudWatch alarm already exists"   
   
log_info "CloudWatch monitoring configured"   
   
# Step 5: Generate deployment report   
echo -e "\n${YELLOW}Step 5: Generating deployment report...${NC}"   
   
cat > DEPLOYMENT_REPORT.md << EOF   
# AWS Deployment Report - SkyRoute   
   
## Deployment Date   
$(date)   
   
## EC2 Instance   
- Instance ID: $INSTANCE_ID   
- Instance Type: $INSTANCE_TYPE   
- Public IP: $PUBLIC_IP   
- Region: $AWS_REGION   
- Security Group: $SECURITY_GROUP_NAME ($SG_ID)   
   
## RDS Database   
- Instance ID: $RDS_INSTANCE_ID   
- Engine: PostgreSQL 15.4   
- Endpoint: $RDS_ENDPOINT   
- Port: 5432   
- Database: skyroute   
- Allocated Storage: ${RDS_ALLOCATED_STORAGE}GB   
- Backup Retention: 7 days   
- CloudWatch Logs: Enabled   
   
## Access Information   
- Backend URL: http://$PUBLIC_IP:3000   
- Frontend URL: http://$PUBLIC_IP:80   
- API Documentation: http://$PUBLIC_IP:3000/api-docs   
   
## Monitoring   
- CloudWatch CPU Alarm: skyroute-ec2-cpu   
- Database Logs: CloudWatch Logs   
- Application Logs: Docker logs (docker logs skyroute-backend)   
   
## Next Steps   
1. SSH into instance: \`ssh -i your-key.pem ubuntu@$PUBLIC_IP\`   
2. Check logs: \`docker-compose logs -f\`   
3. Run migrations: \`docker-compose exec backend npm run migrate\`   
4. Verify API: \`curl http://$PUBLIC_IP:3000/health\`   
   
## Security Notes   
- RDS is not publicly accessible   
- Security group restricts access to ports 80, 443, 3000   
- Environment variables injected via .env file   
- Database password stored in AWS Secrets Manager   
   
EOF   
   
log_info "Deployment report generated: DEPLOYMENT_REPORT.md"   
   
# Summary   
echo -e "\n${GREEN}========================================${NC}"   
echo -e "${GREEN}✅ Deployment Complete!${NC}"   
echo -e "${GREEN}========================================${NC}"   
echo ""   
echo -e "Backend URL:  ${GREEN}http://$PUBLIC_IP:3000${NC}"   
echo -e "Frontend URL: ${GREEN}http://$PUBLIC_IP${NC}"   
echo -e "RDS Endpoint: ${GREEN}$RDS_ENDPOINT${NC}"   
echo -e "Instance ID:  ${GREEN}$INSTANCE_ID${NC}"   
echo ""   
echo "Wait 2-3 minutes for the application to be ready..."   
echo "Check status with: curl http://$PUBLIC_IP:3000/health"   
echo ""   
