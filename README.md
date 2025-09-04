This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Dev (Docker + LocalStack + DynamoDB Local)

1) Copy env file

```bash
cp .env.local.example .env.local
```

2) Start stack

```bash
docker compose up -d --build
```

Services
- App: http://localhost:3001
- DynamoDB Local: http://localhost:8998
- DynamoDB Admin UI: http://localhost:8999
- LocalStack (S3): http://localhost:4566

3) Verify resources

```bash
# LocalStack logs
docker logs echo-ai-localstack | grep 'LocalStack Init'

# S3 bucket in LocalStack (inside container)
docker exec -it echo-ai-localstack awslocal s3 ls

# DynamoDB tables
aws --endpoint-url http://localhost:8998 dynamodb list-tables
```

Notes
- S3 bucket name is from `.env.local` `S3_BUCKET_NAME`.
- On first boot, DynamoDB tables are auto-created by `dynamodb-init` service.
- If ports are in use, adjust them in `docker-compose.yml`.

### Auth configuration

* Required env vars in `.env.local`:
  * `JWT_SECRET` — used to sign/verify access tokens. Missing this will throw at runtime in server utilities to avoid insecure defaults. In development, set any non-empty value (example: `JWT_SECRET=TEST`).
* Token expiry: access tokens default to 1 hour.
* Standardized 401 messages: '인증 토큰이 없습니다.' | '만료된 토큰입니다.' | '유효하지 않은 토큰입니다.'
* Frontend handling: a shared Axios instance (`src/lib/axios`) clears invalid/expired tokens and redirects to `/auth/login?reason=expired`. It also emits a `window` event `auth:session-expired` so the UI can show a toast/modal if desired.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
