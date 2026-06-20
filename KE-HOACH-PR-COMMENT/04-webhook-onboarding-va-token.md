# 04 — Webhook App, luồng cài đặt (onboarding) & cấp installation token

> Phần "đầu vào" của web: nhận sự kiện từ App, gắn installation với user, và biết cách **mint token** để worker dùng. File code chính nằm trong `packages/web/src`.

## A. Helper cấp installation token

**Dependency mới:** `@octokit/auth-app` (thêm vào `packages/web/package.json`).

**File mới:** `src/lib/github-app.ts`

```ts
import { createAppAuth } from "@octokit/auth-app";

function privateKey(): string {
  // hỗ trợ cả dạng \n trong ENV lẫn key thật
  return (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

/** Cấp installation access token (ngắn hạn ~1h) cho 1 installationId. */
export async function getInstallationToken(installationId: number): Promise<string> {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: privateKey(),
  });
  const { token } = await auth({ type: "installation", installationId });
  return token;
}
```

> Worker sẽ gọi `getInstallationToken(installationId)` rồi đưa token cho `analyzer` (`GitHubChangedFileProvider`, `GitHubContentProvider`, `publishPrResults`).

## B. Webhook handler — mở rộng `src/app/api/webhooks/github/route.ts`

Hiện tại file này verify bằng `GITHUB_WEBHOOK_SECRET`, chỉ xử lý event `pull_request`. Thay đổi:

1. **Đổi secret** sang `GITHUB_APP_WEBHOOK_SECRET` (giá trị webhook secret của App ở `01`). Logic verify HMAC giữ nguyên.
2. **Xử lý thêm các event installation** (để đồng bộ DB tự động):

```ts
if (event === "installation" || event === "installation_repositories") {
  // payload.installation.id, .account.login, .account.type
  // action: "created" | "deleted" | "suspend" | "unsuspend" | "added" | "removed"
  // → upsert GithubInstallation; thêm/bớt Repository theo repositories(_added/_removed)
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
```

3. **Event `pull_request`**: giữ gần như nguyên logic hiện có (quota → upsert PR → tạo `PrAnalysis` → enqueue kèm `installationId`). Lưu ý: tra `Repository` theo `fullName` **và** `installationId` để chắc chắn đúng repo đã kết nối qua App.

> Vì App **tự gửi** webhook, ta **không cần** đăng ký webhook thủ công per-repo nữa (bỏ phần dùng `webhookId/webhookSecret`).

## C. Luồng onboarding (user cài App)

### Nút "Cài GitHub App"
Trên trang kết nối repo (thay cho `ConnectRepoModal` cũ), thêm nút dẫn tới:

```
https://github.com/apps/<GITHUB_APP_SLUG>/installations/new?state=<token>
```
- `state` = chuỗi ký gắn với `userId` đang đăng nhập (chống CSRF; có thể là JWT ngắn hạn hoặc giá trị lưu tạm trong session/DB).

### Setup callback — **route mới** `src/app/api/github/setup/route.ts`
GitHub redirect về đây sau khi cài (URL đã khai ở `01`):

```
GET /api/github/setup?installation_id=123&setup_action=install&state=<token>
```
Xử lý:
1. Xác thực `state` → suy ra `userId` (đối chiếu user đang đăng nhập).
2. `getInstallationToken(installation_id)` → tạo Octokit → gọi `GET /installation/repositories` lấy danh sách repo của installation.
3. Upsert `GithubInstallation { installationId, accountLogin, accountType, userId }`.
4. Upsert các `Repository` (githubId, owner, name, fullName, defaultBranch, isPrivate, **installationId**, userId).
5. Redirect về `/repositories` (kèm thông báo thành công).

> Có thể nhận song song từ webhook `installation.created`; viết upsert **idempotent** để không trùng.

## D. Đổi cấu hình OAuth (tuỳ chọn nhưng nên)

Khi đã có App lo quyền thao tác repo, scope OAuth ở `src/lib/auth.ts` có thể **thu hẹp** từ `repo` xuống `read:user user:email` (login chỉ để biết user là ai). Quyền ghi PR/checks giờ đến từ installation token. → Giảm rủi ro bảo mật, đỡ làm user e ngại khi cấp quyền.

## Checklist

- [ ] `@octokit/auth-app` + `src/lib/github-app.ts` (`getInstallationToken`)
- [ ] Webhook: đổi secret sang App, xử lý event `installation*`, giữ `pull_request`
- [ ] Route `GET /api/github/setup` (map installation ↔ user, nạp repo)
- [ ] Nút "Cài GitHub App" với `state` an toàn
- [ ] (tuỳ chọn) thu hẹp scope OAuth

## Tiêu chí hoàn thành

- [ ] Cài App lên 1 repo test → DB có `GithubInstallation` + các `Repository` với `installationId` đúng.
- [ ] `getInstallationToken(id)` trả token, gọi thử `GET /installation/repositories` thành công.
