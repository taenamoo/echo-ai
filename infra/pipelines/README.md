# infra/pipelines

CI/CD 파이프라인 정의를 위한 디렉터리입니다. GitHub Actions 혹은 CodeBuild 워크플로를 통해 모노레포 패키지를 빌드하고, ECR/ECS 또는 Lambda로 배포하는 절차를 정리합니다.

## TODO
- [ ] develop 브랜치용 CI 파이프라인 설계
- [ ] Lambda/Fargate 아티팩트 업로드 스텝 정의
- [ ] 배포 후 통합 테스트 및 알림 구성
