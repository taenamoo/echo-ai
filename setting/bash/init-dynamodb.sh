#!/bin/sh

# AWS CLI가 로컬 DynamoDB를 대상으로 하도록 설정합니다.
AWS_ENDPOINT_URL=http://dynamodb-local:8000
TABLE_NAME="EchoAI-Main-Table"

echo "Waiting for dynamodb-local to be ready..."
# nc (netcat)을 사용하여 dynamodb-local의 8000번 포트가 열릴 때까지 기다립니다.
while ! nc -z dynamodb-local 8000; do
  sleep 0.1
done
echo "DynamoDB is ready."

echo "Checking if table '$TABLE_NAME' exists..."
# 테이블이 이미 존재하는지 확인합니다.
TABLE_EXISTS=$(aws dynamodb list-tables --endpoint-url $AWS_ENDPOINT_URL --query "TableNames" | grep $TABLE_NAME)

if [ -z "$TABLE_EXISTS" ]; then
    echo "Table '$TABLE_NAME' does not exist. Creating table..."
    # 테이블이 없으면, 스키마에 따라 새로 생성합니다.
    aws dynamodb create-table \
        --table-name $TABLE_NAME \
        --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=email,AttributeType=S \
        --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes '[{"IndexName":"EmailIndex","KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url $AWS_ENDPOINT_URL
    echo "Table '$TABLE_NAME' created."
else
    echo "Table '$TABLE_NAME' already exists. Skipping creation."
fi
