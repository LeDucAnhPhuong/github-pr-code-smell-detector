# 01 — Tạo & cấu hình GitHub App

> Đây là việc làm **một lần** phía nhà cung cấp dịch vụ (bạn), trên giao diện GitHub. Kết quả là một bộ ENV để web/worker dùng.

## Mục tiêu

Có 1 GitHub App đại diện cho dịch vụ, đủ quyền: **đọc nội dung file**, **đọc danh sách file của PR**, **ghi comment**, **ghi check run**; và **tự gửi webhook** khi có PR.

## Bước 1 — Đăng ký App

GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**.

| Trường | Giá trị |
|---|---|
| **GitHub App name** | ví dụ `code-smell-detector` (tên này tạo ra `tên[bot]` khi comment) |
| **Homepage URL** | `http://localhost:3000` (dev) / domain thật (prod) |
| **Callback URL** (OAuth của App, tùy chọn) | `http://localhost:3000/api/auth/callback/github` nếu muốn dùng App cho cả login |
| **Setup URL** | `http://localhost:3000/api/github/setup` · tick **Redirect on update** |
| **Webhook → Active** | ✅ bật |
| **Webhook URL** | `http://localhost:3000/api/webhooks/github` (dev: dùng smee/ngrok — xem `07`) |
| **Webhook secret** | sinh chuỗi ngẫu nhiên mạnh → lưu vào ENV `GITHUB_APP_WEBHOOK_SECRET` |

## Bước 2 — Repository permissions (Permissions & events)

| Quyền | Mức | Dùng để |
|---|---|---|
| **Contents** | Read-only | `GitHubContentProvider` tải nội dung file để parse |
| **Pull requests** | Read & write | đọc list file của PR + **ghi comment** |
| **Checks** | Read & write | tạo **Check run** (pass/fail + annotation) |
| **Metadata** | Read-only (mặc định) | bắt buộc |

## Bước 3 — Subscribe to events

- ✅ **Pull request** (mở/sync/reopen → kích hoạt phân tích)
- ✅ **Installation target** / **Installation repositories** (theo dõi user cài/gỡ, thêm/bớt repo)

## Bước 4 — Where can this App be installed

- Dev: "Only on this account". Prod: "Any account".

## Bước 5 — Lấy thông tin bí mật

Sau khi tạo App:
1. Ghi lại **App ID** (số).
2. Ghi lại **Client ID** (và tạo **Client secret** nếu dùng App cho login).
3. Mục **Private keys → Generate a private key** → tải file `.pem`. **Đây là khoá ký JWT để cấp installation token** — giữ tuyệt mật.
4. Ghi lại **App slug** (phần trong URL `github.com/apps/<slug>`), dùng cho nút "Install".

## Bước 6 — Khai báo ENV

Thêm vào `packages/web/.env` (và `.env.example`):

```dotenv
# GitHub App
GITHUB_APP_ID="123456"
GITHUB_APP_SLUG="code-smell-detector"
GITHUB_APP_CLIENT_ID="Iv1.xxxxxxxx"
GITHUB_APP_CLIENT_SECRET="xxxxxxxx"          # nếu dùng App cho login
GITHUB_APP_WEBHOOK_SECRET="<chuỗi ở Bước 1>"  # THAY cho GITHUB_WEBHOOK_SECRET cũ
# Private key: để nguyên xuống dòng bằng \n, hoặc trỏ tới file
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
# (tuỳ chọn) GITHUB_APP_PRIVATE_KEY_PATH="./secrets/app.private-key.pem"
```

> Webhook handler hiện đọc `GITHUB_WEBHOOK_SECRET`. Trong `04` ta đổi sang `GITHUB_APP_WEBHOOK_SECRET` (hoặc giữ tên cũ nhưng gán giá trị webhook secret của App). Thống nhất **một** tên để tránh nhầm.

## Checklist

- [ ] Tạo App với đủ quyền Contents(R), Pull requests(RW), Checks(RW), Metadata(R)
- [ ] Subscribe event Pull request + Installation
- [ ] Đặt Webhook URL + secret; Setup URL `/api/github/setup`
- [ ] Generate private key (.pem) và lưu an toàn
- [ ] Điền đủ ENV ở `packages/web/.env`

## Tiêu chí hoàn thành

- [ ] Có thể "Install" App lên 1 repo test và thấy GitHub gửi webhook `installation` tới Webhook URL (kiểm bằng smee/ngrok ở `07`).
