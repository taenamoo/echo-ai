# Dev 배포용 GitHub OIDC IAM Role 가이드

이 문서는 GitHub Actions에서 OIDC로 Assume하여 Dev 스택을 배포하기 위한 IAM Role 구성 예시를 제공한다.

## 1) 신뢰 정책(Trust Policy)
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:<ORG_OR_USER>/<REPO>:ref:refs/heads/develop",
            "repo:<ORG_OR_USER>/<REPO>:pull_request"
          ]
        }
      }
    }
  ]
}
```

## 2) 권한 정책(Managed/Inline Policy 예시)
최소 권한으로 CloudFormation 배포, S3 업로드, CloudFront 무효화, iam:PassRole 제한을 허용한다.

```
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": [
        "cloudformation:CreateStack", "cloudformation:UpdateStack", "cloudformation:DeleteStack",
        "cloudformation:CreateChangeSet", "cloudformation:ExecuteChangeSet", "cloudformation:Describe*", "cloudformation:List*"
      ], "Resource": "*" },
    { "Effect": "Allow", "Action": [
        "s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"
      ], "Resource": [
        "arn:aws:s3:::<UI_BUCKET>", "arn:aws:s3:::<UI_BUCKET>/*"
      ] },
    { "Effect": "Allow", "Action": [
        "cloudfront:CreateInvalidation", "cloudfront:GetDistribution", "cloudfront:ListDistributions"
      ], "Resource": "*" },
    { "Effect": "Allow", "Action": [
        "iam:PassRole"
      ], "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cdk-*" }
  ]
}
```

## 3) GitHub 설정
- 리포 Secrets
  - `AWS_ROLE_TO_ASSUME_DEV`: 위 롤 ARN
- 워크플로 변수(필요 시)
  - `AWS_REGION`: ap-northeast-2 (기본값 있음)

## 4) 워크플로 연동
- `.github/workflows/dev-deploy.yml`는 OIDC로 자격 설정 후 CloudFormation Outputs를 조회해 UI 빌드/배포 변수를 자동 주입한다.

## 5) 보안 권고
- `StringLike` 조건을 활용해 배포 가능한 브랜치를 `develop` 등으로 제한한다.
- `iam:PassRole` 범위를 CDK 부트스트랩 롤 등 필요한 리소스로만 한정한다.
- 운영 계정/리전에선 별도 롤을 사용하고, Dev 롤과 권한/태그를 분리한다.

