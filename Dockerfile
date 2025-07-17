## 1. Base Image
FROM node:18-alpine

## 2. Activate Corepack
RUN corepack enable

## 3. Set Working Directory
WORKDIR /app

## 4. Install Dependencies
COPY package.json pnpm-lock.yaml* ./

## 5. pnpm Install
RUN pnpm install

## 6. Expose Port
EXPOSE 3000

## 7. Start Application
CMD ["pnpm", "run", "dev"]