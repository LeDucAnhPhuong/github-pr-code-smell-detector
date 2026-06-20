# Hướng Dẫn Deploy Production (Docker + Traefik)

> Triển khai web dashboard + worker bằng Docker, Traefik làm reverse proxy +
> tự cấp TLS qua Let's Encrypt theo domain. Cập nhật: 2026-06-19.

## Kiến trúc

```
Internet ──443──▶ Traefik ──▶ web (Next.js standalone, :3000)
                    │
                    └─ tự xin & gia hạn cert Let's Encrypt cho ${DOMAIN}

                 (mạng nội bộ, KHÔNG mở ra host)
   web ─┬─▶ postgres:5432
        └─▶ redis:6379  ◀── worker (BullMQ)
   migrate (chạy 1 lần: prisma migrate deploy) → xong rồi web/worker mới khởi động
```

| File | Vai trò |
|---|---|
| `Dockerfile` | Image đa-target: `runner` (web standalone) + `worker` (worker & migrate) |
| `docker-compose.prod.yml` | Stack: traefik, postgres, redis, migrate, web, worker |
| `.env.production.example` | Mẫu biến môi trường production |
| `.dockerignore` | Loại `node_modules`/`.next`/secrets khỏi build context |

## Yêu cầu trước khi deploy

1. **Server** có Docker Engine + Docker Compose v2 (Linux khuyến nghị).
2. **Domain** đã trỏ bản ghi `A`/`AAAA` về IP server (Let's Encrypt HTTP-01 cần điều này).
3. **Mở cổng 80 và 443** trên firewall (80 dùng cho ACME challenge + redirect).
4. **GitHub OAuth App** và **GitHub App** đã đăng ký với URL theo domain thật
   (xem callback/webhook URL trong `.env.production.example`).

## Các bước

```bash
# 1. Lấy code lên server
git clone <repo> && cd github-pr-code-smell-detector

# 2. Tạo file env và điền giá trị thật
cp .env.production.example .env.production
#    - DOMAIN, ACME_EMAIL
#    - POSTGRES_PASSWORD + DATABASE_URL (mật khẩu phải khớp nhau)
#    - NEXTAUTH_SECRET  (openssl rand -base64 32)
#    - AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
#    - GITHUB_APP_* (nếu dùng PR comment bot)

# 3. Build & chạy (migrate tự chạy trước web/worker)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 4. Seed dữ liệu nền (plans + rules + frameworks + categories) — chạy MỘT lần
docker compose -f docker-compose.prod.yml --env-file .env.production \
  run --rm migrate npm run db:seed -w packages/web
```

Mở `https://<DOMAIN>` → lần đầu Traefik xin cert (mất vài giây). Đăng nhập GitHub.

## Vận hành

```bash
# Xem trạng thái + log
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f traefik

# Cập nhật phiên bản mới
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
#   (service `migrate` tự apply migration mới trước khi web khởi động lại)

# Dừng (giữ dữ liệu) / xoá sạch volume
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

## Ghi chú & cảnh báo

- **Postgres/Redis không mở ra host** — chỉ truy cập trong mạng `internal`. Muốn
  backup DB: `docker compose ... exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB`.
- **Cert lưu ở `./letsencrypt/acme.json`** — Traefik tự tạo & gia hạn. Backup thư mục
  này; đặt quyền `600` nếu Traefik cảnh báo.
- **Rate limit Let's Encrypt:** khi thử nghiệm nhiều lần, thêm
  `--certificatesresolvers.le.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory`
  vào `command` của `traefik` để dùng môi trường staging, xong mới bỏ ra.
- **AUTH_TRUST_HOST=true** đã bật để Auth.js v5 hoạt động sau proxy. Đảm bảo
  `AUTH_URL=https://${DOMAIN}` (compose đã set tự động).

## ⚠️ Còn stub — chưa "đủ" production về tính năng

Hạ tầng Docker/Traefik đã sẵn sàng, nhưng phần logic vẫn còn:

- **Worker chưa nối analyzer** → job phân tích trả về **0 findings**
  (`packages/web/worker/processors/analysis.processor.ts`). Đây là tính năng lõi.
- Code context ở Finding Detail là placeholder.
- Một số nút (Re-run, Sync PRs, Cancel subscription…) còn stub.
- `dist/action.js` của analyzer chưa build & commit (chỉ ảnh hưởng GitHub Action, không ảnh hưởng web).

Deploy được để demo/staging; muốn chạy thật end-to-end cần xử lý các mục trên.
