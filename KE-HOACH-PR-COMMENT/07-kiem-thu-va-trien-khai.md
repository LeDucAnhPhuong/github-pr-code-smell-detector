# 07 — Kiểm thử & triển khai

## A. Test webhook ở local

GitHub không gọi được `localhost`. Dùng một trong hai:

- **smee.io** (đơn giản): tạo channel tại https://smee.io → đặt **Webhook URL** của App = URL smee → chạy proxy:
  ```bash
  npx smee-client --url https://smee.io/<id> --target http://localhost:3000/api/webhooks/github
  ```
- **ngrok**: `ngrok http 3000` → lấy URL `https://xxxx.ngrok.io` → đặt làm Webhook URL của App.

> Setup URL (`/api/github/setup`) cũng phải trỏ về domain public này khi test luồng cài App.

## B. Checklist ENV (`packages/web/.env`)

```dotenv
DATABASE_URL=...            # Docker pg:5433 (đã có)
REDIS_URL=...               # 6379 (đã có)
NEXTAUTH_SECRET=...         # (đã có)
AUTH_GITHUB_ID=...          # OAuth login (đã có)
AUTH_GITHUB_SECRET=...      # OAuth login (đã có)
# MỚI — GitHub App (từ file 01)
GITHUB_APP_ID=...
GITHUB_APP_SLUG=...
GITHUB_APP_WEBHOOK_SECRET=...   # thay cho GITHUB_WEBHOOK_SECRET
GITHUB_APP_PRIVATE_KEY=...
# (tuỳ chọn) GITHUB_APP_CLIENT_ID / GITHUB_APP_CLIENT_SECRET
```

- [ ] Cập nhật `.env.example` tương ứng.
- [ ] Build analyzer trước khi chạy worker: `npm run build -w packages/analyzer`.

## C. Kịch bản kiểm thử end-to-end

1. **Cài App:** đăng nhập web → bấm Cài App → chọn repo test → về dashboard thấy repo. *(KT: DB có `GithubInstallation` + `Repository.installationId`.)*
2. **Mở PR** trên repo test (sửa 1 file `.tsx` cố ý vi phạm rule, vd component quá dài).
3. **Quan sát:** webhook tới worker → trong < 1 phút:
   - PR có **comment bot** (đúng findings).
   - Tab **Checks** có “Code Smell Detector”.
   - Dashboard: `PrAnalysis` COMPLETED, có Finding/ChangedFile/EvaluationResult/Report.
   - `SubscriptionUsage` +1.
4. **Push thêm commit:** comment **được cập nhật** (không tạo comment mới); có `PrAnalysis` mới.
5. **Hết quota:** ép quota về 0 → PR mới hiện FAILED “Quota exceeded”, không comment.
6. **Blocking:** bật blocking trong config → finding `error` làm Check **fail**.

## D. Unit/Integration test nên thêm

- analyzer: test `GitHubContentProvider.read` (mock octokit) + `analyze()` với `contentProvider` mock (không đụng đĩa).
- web: test webhook xử lý event `installation` (upsert idempotent) và `pull_request` (enqueue đúng `installationId`).
- worker: test `mapFinding`/`buildAnalyzerConfig` (thuần, dễ test).

## E. Thứ tự rollout

```
1. Merge thay đổi analyzer (02) — không phá CLI/Action, an toàn.
2. Migrate DB (03).
3. Tạo App + ENV (01) trên môi trường đích.
4. Bật webhook handler mới + onboarding (04) — sau lưng feature flag nếu muốn.
5. Bật worker thật (05) thay stub.
6. Hiện nút "Cài App" + docs (06) cho user.
```

## F. Rollback

- Worker: giữ nhánh stub cũ; nếu lỗi diện rộng, trỏ processor về stub (job vẫn COMPLETED 0 finding) trong khi điều tra.
- Webhook: event lạ luôn trả 200 `ignored` → không làm GitHub retry dồn.
- App: có thể tắt webhook "Active" ở GitHub để dừng toàn bộ luồng tức thì.

## G. Bảo mật & vận hành

- [ ] `GITHUB_APP_PRIVATE_KEY` không commit; chỉ qua secret manager/ENV.
- [ ] Installation token ngắn hạn — **không lưu DB**, mint mỗi lần dùng trong worker.
- [ ] Verify chữ ký webhook bằng `timingSafeEqual` (đã có) với secret của App.
- [ ] Giới hạn retry BullMQ + backoff để tránh bão job khi GitHub/API lỗi.
- [ ] Log không in token.

## Tiêu chí hoàn thành (nghiệm thu)

- [ ] Toàn bộ kịch bản C chạy đúng trên môi trường có webhook public.
- [ ] CLI + GitHub Action cũ vẫn hoạt động (không hồi quy).
- [ ] Tài liệu `06` đã hiển thị cho user mới chưa có installation.
