#!/bin/bash   
   
# CloudWatch and Monitoring Setup   
   
INSTANCE_ID=$1   
REGION=${AWS_REGION:-us-east-1}   
   
if [ -z "$INSTANCE_ID" ]; then   
    echo "Usage: ./monitoring-setup.sh <instance-id>"   
    exit 1   
fi   
   
echo "Setting up monitoring for instance: $INSTANCE_ID"   
   
# CloudWatch agent configuration   
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'   
{   
  "metrics": {   
    "namespace": "SkyRoute",   
    "metrics_collected": {   
      "cpu": {   
        "measurement": [   
          {   
            "name": "cpu_usage_idle",   
            "rename": "CPU_IDLE",   
            "unit": "Percent"   
          },   
          {   
            "name": "cpu_usage_iowait",   
            "rename": "CPU_IOWAIT",   
            "unit": "Percent"   
          }   
        ],   
        "metrics_collection_interval": 60,   
        "totalcpu": false   
      },   
      "disk": {   
        "measurement": [   
          {   
            "name": "used_percent",   
            "rename": "DISK_USED_PERCENT",   
            "unit": "Percent"   
          }   
        ],   
        "metrics_collection_interval": 60,   
        "resources": [   
          "/"   
        ]   
      },   
      "mem": {   
        "measurement": [   
          {   
            "name": "mem_used_percent",   
            "rename": "MEM_USED_PERCENT",   
            "unit": "Percent"   
          }   
        ],   
        "metrics_collection_interval": 60   
      }   
    }   
  },   
  "logs": {   
    "logs_collected": {   
      "files": {   
        "collect_list": [   
          {   
            "file_path": "/var/log/docker.log",   
            "log_group_name": "/aws/skyroute/docker",   
            "log_stream_name": "{instance_id}"   
          },   
          {   
            "file_path": "/var/log/syslog",   
            "log_group_name": "/aws/skyroute/system",   
            "log_stream_name": "{instance_id}"   
          }   
        ]   
      }   
    }   
  }   
}   
EOF   
   
echo "✅ Monitoring configuration created"   
 