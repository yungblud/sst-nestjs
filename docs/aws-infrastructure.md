# AWS Infrastructure Documentation

이 문서는 `sst.config.ts`를 기반으로 배포되는 AWS 서비스들을 설명합니다.

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                           VPC                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    ECS Cluster                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              ECS Service (Fargate)              │  │  │
│  │  │                                                 │  │  │
│  │  │   ┌─────────────┐      ┌──────────────────┐    │  │  │
│  │  │   │     ALB     │      │  NestJS Container │    │  │  │
│  │  │   │  (port 80)  │ ───► │    (port 3000)    │    │  │  │
│  │  │   └─────────────┘      └──────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 사용되는 AWS 서비스

### 1. Amazon VPC (Virtual Private Cloud)

```typescript
const vpc = new sst.aws.Vpc(process.env.AWS_VPC);
```

- **용도**: 네트워크 격리 및 보안
- **기능**:
  - 프라이빗 서브넷과 퍼블릭 서브넷 자동 생성
  - NAT Gateway 설정
  - 인터넷 게이트웨이 연결

### 2. Amazon ECS Cluster

```typescript
const cluster = new sst.aws.Cluster(process.env.AWS_CLUSTER, { vpc });
```

- **용도**: 컨테이너 오케스트레이션
- **기능**:
  - 컨테이너 서비스들의 논리적 그룹핑
  - VPC 내에서 네트워크 격리 실행

### 3. Amazon ECS Service (Fargate)

```typescript
new sst.aws.Service(process.env.AWS_SERVICE, {
  cluster,
  loadBalancer: {
    ports: [{ listen: '80/http', forward: '3000/http' }],
  },
  dev: {
    command: 'pnpm run start:dev',
  },
});
```

- **용도**: NestJS 애플리케이션 컨테이너 실행
- **실행 환경**: AWS Fargate (서버리스)
- **포트 설정**:
  - 외부 접근: `80/http` (ALB)
  - 내부 포워딩: `3000/http` (NestJS 애플리케이션)

#### 포함된 AWS 리소스
| 리소스 | 설명 |
|--------|------|
| **Application Load Balancer (ALB)** | HTTP 트래픽 분산 및 라우팅 |
| **Target Group** | ECS 태스크에 트래픽 전달 |
| **ECS Task Definition** | 컨테이너 스펙 정의 |
| **ECS Task** | 실제 실행되는 컨테이너 인스턴스 |
| **ECR Repository** | Docker 이미지 저장소 (자동 생성) |
| **Security Groups** | 네트워크 접근 제어 |
| **IAM Roles** | 서비스 실행 권한 |
| **CloudWatch Logs** | 로그 수집 및 모니터링 |

## 환경 변수

배포에 필요한 환경 변수 (`.env`):

| 변수명 | 설명 |
|--------|------|
| `AWS_REGION` | AWS 리전 (예: `ap-northeast-2`) |
| `AWS_PROFILE` | AWS CLI 프로파일명 |
| `AWS_VPC` | VPC 리소스명 |
| `AWS_CLUSTER` | ECS 클러스터명 |
| `AWS_SERVICE` | ECS 서비스명 |

## Stage별 동작

| Stage | `removal` | `protect` |
|-------|-----------|-----------|
| production | retain | true |
| 그 외 | remove | false |

- **production**: 리소스 삭제 방지, 실수로 인한 삭제 보호
- **개발/스테이징**: `sst remove` 시 리소스 완전 삭제

## 배포 명령어

```bash
# 개발 모드 (로컬)
pnpm sst dev

# 스테이징 배포
pnpm sst deploy --stage staging

# 프로덕션 배포
pnpm sst deploy --stage production

# 리소스 삭제 (production 제외)
pnpm sst remove --stage staging
```
