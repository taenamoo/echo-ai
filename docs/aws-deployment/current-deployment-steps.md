# 현재 배포 단계 (AWS 수동 배포)

> [!TIP] 자동화 도우미
> `scripts/deploy/aws-manual-deploy.sh` 스크립트를 사용하면 각 CDK 또는 S3 단계를 손으로 실행하지 않고도 인프라와 SPA 업데이트를 순차적으로 수행할 수 있습니다.
> 이 도우미는 `--guided`, `--skip-build`와 같은 기존 플래그를 그대로 지원하며, `--two-phase` 스위치를 추가해 두 단계로 나눠 실행할 수 있습니다.
> Shared/API 스택에서 SPA 동기화 후 비밀 값을 한 번 더 갱신해야 한다면 `--update-secrets-twice` 플래그를 함께 전달하세요.

## 두 단계 배포 흐름

새로운 `--two-phase` 옵션을 활성화하면 스크립트는 릴리스를 의도적으로 두 번의 실행으로 나눕니다.

1. **1단계 – Shared/API 프로비저닝**: `--phase=1`과 함께 스크립트를 실행하여 Shared와 API 스택을 배포하고, 필요한 경우 `--guided` 응답을 적용한 뒤(`--update-secrets-twice`가 지정된 경우 비밀을 두 번 새로 고침), SPA 업로드나 CloudFront 무효화 전에 종료합니다. 이렇게 하면 프런트엔드 빌드 전에 엔드포인트 URL이 확정됩니다.
2. **2단계 – SPA 재빌드 및 자산 동기화**: API 엔드포인트를 확인한 뒤 `--phase=2`로 스크립트를 다시 실행하면 SPA 빌드 단계에서 해당 엔드포인트를 주입할 수 있습니다. UI 산출물이 생성되면 스크립트가 이를 S3에 업로드하고 CloudFront를 무효화합니다.

예시 명령어 순서는 다음과 같습니다.

```bash
# 1단계: 인프라를 프로비저닝하고 API 엔드포인트를 확인합니다.
scripts/deploy/aws-manual-deploy.sh --guided --two-phase --phase=1 --update-secrets-twice

# 2단계: 확인된 엔드포인트로 SPA를 재빌드하고 자산을 동기화합니다.
scripts/deploy/aws-manual-deploy.sh --guided --two-phase --phase=2 --update-secrets-twice
```

## 대안 워크플로

`--two-phase`를 생략하면 기존의 단일 실행 흐름을 계속 사용할 수 있습니다.

```bash
scripts/deploy/aws-manual-deploy.sh --guided
```

빠른 인프라 전용 반복이 필요하다면, 단일 실행과 두 단계 실행 모두에서 `--guided` 프롬프트와 함께 `--skip-build`를 조합하세요.

```bash
scripts/deploy/aws-manual-deploy.sh --guided --skip-build
```

스크립트는 배포 시나리오에 맞는 이 플래그 조합을 그대로 지원합니다.
