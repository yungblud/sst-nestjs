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

## 월간 예상 비용 (ap-northeast-2 서울 리전 기준)

> 아래 비용은 최소 사양 기준 추정치이며, 실제 비용은 트래픽과 사용량에 따라 달라집니다.

### 서비스별 비용 상세

| 서비스 | 과금 기준 | 월간 예상 비용 | 비고 |
|--------|-----------|----------------|------|
| **VPC** | 무료 | $0 | VPC 자체는 무료 |
| **NAT Gateway** | 시간당 $0.059 + 데이터 GB당 $0.059 | **$45 ~ $60** | 24/7 운영 시 고정비 높음 |
| **ECS Cluster** | 무료 | $0 | 클러스터 자체는 무료 |
| **Fargate (vCPU)** | 시간당 $0.05056/vCPU | **$9 ~ $37** | 0.25~1 vCPU 기준 |
| **Fargate (Memory)** | 시간당 $0.00553/GB | **$2 ~ $8** | 0.5~2 GB 기준 |
| **Application Load Balancer** | 시간당 $0.0280 + LCU | **$22 ~ $30** | 기본 고정비 + 트래픽 |
| **ECR** | GB당 $0.10 | **$1 ~ $3** | 이미지 저장 용량 |
| **CloudWatch Logs** | 수집 GB당 $0.76, 보관 GB당 $0.033 | **$1 ~ $10** | 로그 양에 따라 변동 |
| **데이터 전송 (아웃바운드)** | GB당 $0.126 (첫 10TB) | **$0 ~ $15** | 트래픽에 따라 변동 |

### 시나리오별 월간 총 비용

#### 최소 사양 (개발/테스트용)
```
Fargate: 0.25 vCPU, 0.5GB RAM, 1개 태스크
트래픽: 낮음 (< 10GB/월)
```

| 항목 | 비용 |
|------|------|
| NAT Gateway | $45 |
| Fargate | $11 |
| ALB | $22 |
| ECR + Logs | $3 |
| **합계** | **약 $80 ~ $90/월** |

#### 기본 프로덕션 (소규모)
```
Fargate: 0.5 vCPU, 1GB RAM, 2개 태스크
트래픽: 중간 (50GB/월)
```

| 항목 | 비용 |
|------|------|
| NAT Gateway | $48 |
| Fargate | $44 |
| ALB | $28 |
| ECR + Logs | $8 |
| 데이터 전송 | $6 |
| **합계** | **약 $130 ~ $150/월** |

#### 스케일업 프로덕션 (중규모)
```
Fargate: 1 vCPU, 2GB RAM, 4개 태스크
트래픽: 높음 (200GB/월)
```

| 항목 | 비용 |
|------|------|
| NAT Gateway | $57 |
| Fargate | $176 |
| ALB | $35 |
| ECR + Logs | $15 |
| 데이터 전송 | $25 |
| **합계** | **약 $300 ~ $350/월** |

### 비용 절감 팁

| 방법 | 절감 효과 | 적용 방법 |
|------|----------|----------|
| **NAT Gateway 제거** | ~$45/월 | 퍼블릭 서브넷에 배포 (보안 트레이드오프) |
| **Fargate Spot 사용** | 최대 70% | 중단 가능한 워크로드에 적합 |
| **Savings Plans** | 최대 50% | 1년/3년 약정 |
| **개발환경 스케줄링** | ~60% | 업무 시간에만 운영 |
| **로그 보관 기간 단축** | ~$5/월 | 7일 또는 14일로 설정 |

### 프리 티어 (신규 계정 12개월)

| 서비스 | 무료 제공량 |
|--------|-------------|
| ALB | 750시간/월 |
| ECR | 500MB 스토리지 |
| CloudWatch | 5GB 로그 수집 |
| 데이터 전송 | 100GB/월 (아웃바운드) |

> **주의**: NAT Gateway와 Fargate는 프리 티어에 포함되지 않습니다.

---

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
