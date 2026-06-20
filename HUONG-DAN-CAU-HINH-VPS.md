# Hướng Dẫn Cấu Hình VPS (Build Image Ở Local → Chạy Trên VPS)

> Dành cho mô hình: **bạn build Docker image trên máy local**, chuyển image sang
> VPS rồi chạy stack production ở đó. Cập nhật: 2026-06-20.
>
> Khác với `HUONG-DAN-DEPLOY.md` (build trực tiếp trên server bằng `up --build`),
> tài liệu này giả định **VPS KHÔNG build** — nên cấu hình VPS có thể nhỏ hơn nhiều.

---

## 1. Vì sao "build ở local" giúp VPS nhẹ đi

Bước ngốn tài nguyên nhất của project này là **`next build`** (biên dịch Next.js 16)
và `npm ci` (cài full dev-deps) — có thể cần **2–4 GB RAM** và CPU cao trong vài phút.
Nếu build ngay trên VPS bằng `up -d --build`, bạn buộc phải mua VPS ≥ 4 GB RAM chỉ
để vượt qua bước build (dù lúc chạy không cần nhiều như vậy).

Khi build ở local, VPS chỉ còn việc **chạy container đã đóng gói sẵn** → yêu cầu
RAM/CPU giảm mạnh. Đây là lý do nên tách build và run.

---

## 2. Stack chạy trên VPS gồm những gì

| Service | Image | RAM lúc idle (ước lượng) | Ghi chú |
|---|---|---|---|
| `traefik` | traefik:v3.3 | ~50–100 MB | Reverse proxy + TLS Let's Encrypt, mở cổng 80/443 |
| `postgres` | postgres:17 | ~100–200 MB | Dữ liệu lưu volume `pgdata`, lớn dần theo số PR/finding |
| `redis` | redis:7 | ~20–50 MB | Hàng đợi BullMQ |
| `web` | image của bạn (target `runner`) | ~150–300 MB | Next.js standalone, Node 24, cổng nội bộ 3000 → `app.mergetrack.site` |
| `landing` | image của bạn (target `landing-runner`) | ~120–200 MB | Next.js tĩnh, cổng nội bộ 3000 → apex `mergetrack.site` (+ `www`) |
| `worker` | image của bạn (target `worker`) | ~150–300 MB | BullMQ worker; **tăng vọt** CPU/RAM khi clone repo + parse AST lúc phân tích |
| `migrate` | image của bạn (target `worker`) | chạy 1 lần rồi tắt | Chạy `prisma migrate deploy` trước khi web/worker khởi động |

> Tổng RAM lúc "nghỉ" rơi vào khoảng **0.6–1 GB**, nhưng **worker khi chạy job
> phân tích** (git clone + duyệt cây cú pháp React) sẽ tạo đỉnh tải — cần dư RAM/CPU
> để không bị OOM.

---

## 3. Cấu hình VPS khuyến nghị

| Mức | vCPU | RAM | Disk (SSD) | Dùng cho |
|---|---|---|---|---|
| **Tối thiểu (demo/thử nghiệm)** | 1 vCPU | **2 GB** + 2 GB swap | 25 GB | Ít người dùng, 1 job phân tích tại 1 thời điểm |
| **Khuyến nghị (production nhỏ)** | 2 vCPU | **4 GB** | 40 GB | Nhiều repo, job chạy đồng thời mượt hơn |
| **Thoải mái** | 2–4 vCPU | 8 GB | 80 GB | Nhiều tổ chức/PR, ít lo OOM khi tải cao |

**Khuyến nghị thực tế:** chọn **2 vCPU / 4 GB / 40 GB SSD**. Đây là mức "an toàn rẻ"
phổ biến (DigitalOcean, Hetzner, Vultr, AWS Lightsail… đều có gói tầm này).

### Lưu ý quan trọng cho mức tối thiểu 2 GB
- **Bắt buộc bật swap** (xem mục 7). Postgres + worker khi tải cao dễ chạm trần RAM;
  swap giúp tránh container bị kernel kill (OOM).
- Chỉ nên cho **1 worker** và tránh phân tích nhiều PR cùng lúc.
- Nếu repo cần phân tích lớn → đỉnh RAM của worker có thể vượt 2 GB, hãy nâng lên 4 GB.

---

## 4. Hệ điều hành & phần mềm cần có trên VPS

- **OS:** Linux 64-bit — khuyến nghị **Ubuntu 22.04/24.04 LTS** hoặc Debian 12.
- **Docker Engine** + **Docker Compose v2** (`docker compose`, không phải `docker-compose`).
- **Kiến trúc CPU:** phải **khớp với image bạn build**. Máy local (Windows/Mac amd64)
  build ra image `linux/amd64` → VPS cũng phải là **amd64 (x86_64)**.
  Nếu mua VPS **ARM** (ví dụ Ampere/Graviton) thì khi build ở local phải ép nền tảng:
  `docker buildx build --platform linux/amd64 ...` (hoặc `linux/arm64` cho VPS ARM).

Cài Docker nhanh trên Ubuntu:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # đăng nhập lại để dùng docker không cần sudo
```

---

## 5. Chuyển image từ local sang VPS — 2 cách

Project build ra **một image đa-target** (`Dockerfile` có target `runner` và `worker`).
Cần đưa cả hai target lên VPS. Có 2 cách:

### Cách A — Dùng Container Registry (khuyến nghị)
Đẩy lên registry (Docker Hub, GHCR, hoặc registry riêng), VPS `pull` về.

```bash
# === TRÊN MÁY LOCAL (ở thư mục gốc monorepo) ===
# Build 3 target thành 3 tag riêng
docker build -t <registry>/csd-web:latest    --target runner .
docker build -t <registry>/csd-worker:latest --target worker .
# Landing: NEXT_PUBLIC_* được nhúng lúc BUILD nên phải truyền --build-arg
docker build -t <registry>/csd-landing:latest --target landing-runner \
  --build-arg NEXT_PUBLIC_DASHBOARD_URL=https://app.mergetrack.site \
  --build-arg NEXT_PUBLIC_SITE_URL=https://mergetrack.site .

docker push <registry>/csd-web:latest
docker push <registry>/csd-worker:latest
docker push <registry>/csd-landing:latest
```

```bash
# === TRÊN VPS ===
docker login <registry>     # nếu registry private
docker pull <registry>/csd-web:latest
docker pull <registry>/csd-worker:latest
```

### Cách B — `docker save` / `docker load` (không cần registry)
Phù hợp khi không muốn dùng registry; nhược điểm là file `.tar` khá nặng.

```bash
# === TRÊN MÁY LOCAL ===
docker build -t csd-web:latest    --target runner .
docker build -t csd-worker:latest --target worker .

docker save csd-web:latest csd-worker:latest | gzip > csd-images.tar.gz
scp csd-images.tar.gz user@<VPS_IP>:~/
```

```bash
# === TRÊN VPS ===
gunzip -c csd-images.tar.gz | docker load
```

---

## 6. File compose chạy trên VPS (dùng image build sẵn, KHÔNG build)

File `docker-compose.prod.yml` hiện tại dùng `build:` (build trên server). Khi đã có
image sẵn, hãy tạo bản **`docker-compose.vps.yml`** thay `build:` bằng `image:`.
Phần thay đổi cho 3 service `migrate`, `web`, `worker`:

```yaml
  migrate:
    image: <registry>/csd-worker:latest   # hoặc csd-worker:latest nếu dùng Cách B
    command: ["npm", "run", "db:deploy", "-w", "packages/dashboard"]
    # ... (giữ nguyên environment / depends_on / networks như file gốc)

  web:
    image: <registry>/csd-web:latest       # hoặc csd-web:latest
    # ... (giữ nguyên environment / labels traefik / depends_on / networks)

  worker:
    image: <registry>/csd-worker:latest    # hoặc csd-worker:latest
    # ... (giữ nguyên environment / depends_on / networks)
```

> Các service `traefik`, `postgres`, `redis` giữ nguyên (chúng dùng image public).
> Phần `environment`, `labels`, `networks`, `volumes` của file gốc **giữ y nguyên**.

Chạy trên VPS:
```bash
# 1. Đưa file compose + .env.production + thư mục letsencrypt lên VPS
#    (KHÔNG cần toàn bộ source code — chỉ cần image + 2 file này)
cp .env.production.example .env.production   # rồi điền giá trị thật

# 2. Khởi động (KHÔNG có --build vì image đã có sẵn)
docker compose -f docker-compose.vps.yml --env-file .env.production up -d

# 3. Seed dữ liệu nền — chạy MỘT lần đầu tiên
docker compose -f docker-compose.vps.yml --env-file .env.production \
  run --rm migrate npm run db:seed -w packages/dashboard
```

> ⚠️ Vì bạn không clone source lên VPS, hãy chuẩn bị sẵn `docker-compose.vps.yml` và
> `.env.production`. Biến môi trường cần điền: `DOMAIN`, `ACME_EMAIL`,
> `POSTGRES_PASSWORD` + `DATABASE_URL` (mật khẩu phải khớp), `NEXTAUTH_SECRET`
> (`openssl rand -base64 32`), `AUTH_GITHUB_*`, và `GITHUB_APP_*` nếu dùng PR comment bot.

---

## 7. Tinh chỉnh VPS để chạy ổn ở mức RAM thấp

### Bật swap (rất nên làm với VPS 2 GB)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab   # giữ swap sau reboot
```

### Mở firewall đúng cổng
Chỉ cần mở **80** và **443** (Traefik). Postgres/Redis **không** mở ra ngoài.
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Giới hạn RAM cho container (tùy chọn, tránh 1 service ăn hết máy)
Có thể thêm vào từng service trong compose:
```yaml
    deploy:
      resources:
        limits:
          memory: 768M      # ví dụ giới hạn web; worker nên để cao hơn
```

---

## 8. Ước lượng dung lượng đĩa

| Hạng mục | Dung lượng |
|---|---|
| Docker Engine + image hệ thống | ~1–2 GB |
| Image `web` + `worker` của bạn | ~0.5–1 GB (worker là full image nên nặng hơn) |
| Image postgres/redis/traefik | ~0.5 GB |
| Volume Postgres (`pgdata`) | Tăng dần theo số PR/finding — dự phòng vài GB |
| Log + temp khi worker clone repo | Bùng phát tạm thời — dự phòng vài GB |

→ **25 GB SSD** đủ cho demo; **40 GB** thoải mái cho production nhỏ.

---

## 9. Checklist nhanh

- [ ] VPS Linux amd64 (Ubuntu 22.04/24.04), **2 vCPU / 4 GB** (hoặc tối thiểu 1 vCPU / 2 GB + swap).
- [ ] Đã cài Docker Engine + Compose v2.
- [ ] Kiến trúc image build ở local **khớp** kiến trúc VPS (amd64 ↔ amd64).
- [ ] DNS đã trỏ về IP VPS: `app.mergetrack.site` (web), `mergetrack.site` + `www.mergetrack.site` (landing); mở cổng 80 & 443.
- [ ] Đã đẩy image `csd-web` + `csd-worker` + `csd-landing` lên VPS (Cách A hoặc B).
- [ ] **Đăng ký lại** GitHub OAuth callback + GitHub App webhook/setup URL sang `app.mergetrack.site` (dashboard đã đổi domain).
- [ ] Có `docker-compose.vps.yml` (dùng `image:`) + `.env.production` đã điền đủ.
- [ ] Đã bật swap nếu RAM ≤ 2 GB.
- [ ] Chạy `up -d` → seed DB 1 lần → mở `https://<DOMAIN>` kiểm tra.

---

> **Nhắc lại giới hạn hiện tại của project** (xem `HUONG-DAN-DEPLOY.md`): worker chưa
> nối analyzer nên job phân tích còn trả **0 findings** — hạ tầng deploy được nhưng
> tính năng lõi vẫn cần hoàn thiện.
