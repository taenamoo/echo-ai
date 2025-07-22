## 1. Base Image
FROM node:18-alpine

## 2. Activate Corepack
RUN corepack enable

## 3. Set Working Directory
WORKDIR /app

## 4. Install Dependencies
COPY package.json pnpm-lock.yaml* ./

## 5. pnpm Install
# Set the store directory to a local path witnin the project
RUN pnpm config set store-dir .pnpm-store
RUN pnpm install

## 6. Expose Port
EXPOSE 3000

## 7. Start Application
CMD ["pnpm", "run", "dev"]