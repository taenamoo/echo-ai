## 1. Base Image
FROM node:18

RUN apt-get update

## 2. Activate Corepack
RUN corepack enable

## 2.1. Add netcat for health checks
RUN apt-get install -y netcat-traditional && rm -rf /var/lib/apt/lists/*

## 3. Set Working Directory
WORKDIR /app

## 3.1. Copy Corporate CA Certificate
COPY .devcontainer/certs/corporate-ca.crt /usr/local/share/ca-certificates/corporate-ca.crt

## 3.2. Install CA Certificates Package
RUN apt-get install -y ca-certificates

## 3.3. Update CA Certificates
RUN update-ca-certificates --fresh

## 3.4. Install AWS CLI v2 and AWS CDK v2
# - AWS CLI v2: official installer (requires curl + unzip)
# - AWS CDK v2: global npm package for cdk commands
RUN apt-get update \
  && apt-get install -y curl unzip \
  && curl -sSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip" \
  && unzip -q /tmp/awscliv2.zip -d /tmp \
  && /tmp/aws/install \
  && npm install -g aws-cdk@2 \
  && rm -rf /var/lib/apt/lists/* /tmp/aws /tmp/awscliv2.zip

## 4. Install Dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Pre-copy workspace manifests to leverage pnpm caching
COPY apps/spa/package.json apps/spa/
COPY packages/@echo-ai/auth/package.json packages/@echo-ai/auth/
COPY packages/@echo-ai/api-core/package.json packages/@echo-ai/api-core/
COPY packages/@echo-ai/aws-clients/package.json packages/@echo-ai/aws-clients/
COPY packages/@echo-ai/config/package.json packages/@echo-ai/config/
COPY packages/@echo-ai/core-domain/package.json packages/@echo-ai/core-domain/
COPY packages/@echo-ai/documents/package.json packages/@echo-ai/documents/
COPY services/api/package.json services/api/
COPY services/ai-processor/package.json services/ai-processor/

## 5. pnpm Install
# Set the store directory to a local path witnin the project
RUN pnpm config set store-dir .pnpm-store
RUN pnpm install

## 7. Include migration script (env is provided at runtime via env_file)
COPY scripts/migration/create-dynamodb-table.ts /app/scripts/migration/create-dynamodb-table.ts
COPY setting/bash/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

## 8. Expose Port
EXPOSE 3000

## 9. Start Application
CMD ["pnpm", "run", "dev"]
