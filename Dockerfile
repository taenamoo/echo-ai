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

## 4. Install Dependencies
COPY package.json pnpm-lock.yaml* ./

## 5. pnpm Install
# Set the store directory to a local path witnin the project
RUN pnpm config set store-dir .pnpm-store
RUN pnpm install

## 7. Set Environment Variables
COPY .env.local /app/.env.local
COPY scripts/create-dynamodb-table.ts /app/scripts/create-dynamodb-table.ts
COPY setting/bash/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

## 8. Expose Port
EXPOSE 3000

## 9. Start Application
CMD ["pnpm", "run", "dev"]