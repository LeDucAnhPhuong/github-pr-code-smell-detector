# 06 — Trang hướng dẫn người dùng setup (in-app page)

> Mục tiêu: một **trang thật trong web app** (`/setup`) hướng người dùng mới đi từ "vừa đăng nhập" → "đã cài GitHub App và thấy bot comment". Không phải tài liệu rời — đây là màn hình onboarding tích hợp, dùng đúng design tokens hiện có.

## Vị trí & route

| Thứ | Giá trị |
|---|---|
| Route | `src/app/(dashboard)/setup/page.tsx` (Server Component) |
| Nằm trong nhóm | `(dashboard)` → tự có Sidebar + TopBar |
| Khi nào hiện | (1) link "Hướng dẫn cài đặt" trên Sidebar; (2) **auto-redirect** từ `/` và `/repositories` khi user **chưa có installation nào** |
| Tài nguyên dùng | design tokens trong `globals.css` (`--color-*`, `--radius-card`…), `lucide-react`, theo style hiện có ở `repositories/page.tsx` |

## Điều kiện hiển thị (logic)

Server Component đọc DB:
```ts
const session = await auth();
const installations = await getInstallationsByUser(session.user.id); // helper mới ở src/lib/db
const connected = installations.length > 0;
```
- `connected === false` → hiển thị trạng thái **"Chưa kết nối"** (stepper + CTA cài App).
- `connected === true` → hiển thị trạng thái **"Đã kết nối"** (tóm tắt + link sang Repositories), giữ trang làm tài liệu tham khảo.

> Empty-state ở `repositories/page.tsx` (hiện đang gọi `ConnectRepoModal`) đổi thành nút **"Cài GitHub App"** trỏ tới `/setup` hoặc trực tiếp tới URL cài App.

## Bố cục trang (sections)

```
┌──────────────────────────────────────────────────────────┐
│  Bắt đầu với Code Smell Detector            [Trạng thái]   │  ← header + badge connected/chưa
├──────────────────────────────────────────────────────────┤
│  STEPPER 3 bước (card)                                     │
│   ① Đăng nhập GitHub            ✓ (đã xong vì đang ở đây)  │
│   ② Cài GitHub App   [ Cài GitHub App ▸ ]  ← CTA chính     │
│   ③ Chọn repo & xong                                       │
├──────────────────────────────────────────────────────────┤
│  "Khi nào bot chạy?"  — giải thích PR → comment + check    │
│  "Tuỳ chỉnh (tuỳ chọn)" — link tới Repository → Config     │
│  "Quản lý & gỡ"  · "Hạn mức"  · "Sự cố thường gặp" (accordion) │
└──────────────────────────────────────────────────────────┘
```

## CTA "Cài GitHub App"

- Là `<a>` (hoặc client button) trỏ tới:
  ```
  https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new?state=<token>
  ```
- `state` ký với `userId` (xem `04` mục C). Slug đọc từ ENV; với Server Component có thể truyền xuống qua prop hoặc đọc `process.env` phía server.
- Sau khi cài, GitHub gọi `/api/github/setup` (file `04`) → redirect về `/repositories?installed=1`.

## Nội dung chữ (copy) cho từng section

> Tái dùng các đoạn dưới đây làm text trong component. Ngắn gọn, không thuật ngữ thừa.

**Bước 2 — Cài GitHub App:**
> "Bấm nút bên dưới, chọn repo muốn theo dõi rồi bấm Install. Ứng dụng xin quyền đọc mã nguồn, đọc/ghi Pull request (để comment) và Checks. **Không** xin quyền ghi code."

**Khi nào bot chạy:**
> "Tự động mỗi khi có Pull request được mở / push thêm / mở lại. Sau vài giây đến dưới 1 phút, PR sẽ có **1 comment của bot** (cập nhật tại chỗ ở các lần push sau) và **1 mục trong tab Checks**. Mọi kết quả cũng lưu trên dashboard."

**Tuỳ chỉnh:**
> "Vào Repository → Config để bật/tắt rule, chỉnh ngưỡng, giới hạn đường dẫn, hoặc bật chế độ chặn merge khi có lỗi nghiêm trọng. Mặc định bot chỉ nhắc, không chặn."

**Quản lý & gỡ:**
> "Thêm/bớt repo hoặc gỡ hẳn tại GitHub → Settings → Applications → (tên App) → Configure."

**Hạn mức:**
> "Mỗi gói có số lượt phân tích/tháng (Free 30 · Pro 100 · Team 1000). Hết hạn mức, PR mới hiện 'Quota exceeded' và bot tạm dừng."

**Sự cố thường gặp (accordion):**
| Hiện tượng | Xử lý |
|---|---|
| PR không có comment | Repo chưa được chọn khi cài App, hoặc hết quota |
| Comment báo lỗi quyền | Gỡ & cài lại App (bản đã cập nhật quyền) |
| Không có Check run | Gói hiện tại tắt check annotation, hoặc thiếu quyền Checks |
| Bot phân tích nhầm file | Chỉnh target/exclude paths trong Config |

## Sidebar

Thêm 1 mục vào `src/components/layout/Sidebar.tsx` (mảng `nav`):
```ts
{ href: "/setup", label: "Hướng dẫn cài đặt", icon: Rocket }, // hoặc icon BookOpen
```
Đặt ngay dưới "Dashboard" để user mới dễ thấy.

## Component đề xuất

| File | Vai trò |
|---|---|
| `src/app/(dashboard)/setup/page.tsx` | Server Component: đọc trạng thái connected, render layout + truyền slug |
| `src/components/setup/InstallAppButton.tsx` | Client: nút CTA (có thể disable + spinner khi điều hướng) |
| `src/components/setup/SetupStepper.tsx` | Hiển thị 3 bước, đánh dấu ✓ theo trạng thái |
| `src/components/setup/Troubleshooting.tsx` | Accordion (dùng `@radix-ui/react-collapsible` đã có trong deps) |

## Checklist

- [ ] Helper `getInstallationsByUser(userId)` trong `src/lib/db`
- [ ] `src/app/(dashboard)/setup/page.tsx` + 3 component con
- [ ] CTA trỏ đúng URL cài App với `state` an toàn
- [ ] Auto-redirect `/` và `/repositories` về `/setup` khi chưa có installation
- [ ] Đổi empty-state `repositories/page.tsx` sang nút "Cài GitHub App"
- [ ] Thêm mục Sidebar "Hướng dẫn cài đặt"
- [ ] Dùng design tokens hiện có (không hardcode màu mới)

## Tiêu chí hoàn thành

- [ ] User mới sau khi đăng nhập được đưa tới `/setup`, thấy stepper + nút Cài App.
- [ ] Bấm nút → sang GitHub cài → quay lại `/repositories` thấy repo (luồng `04` hoạt động).
- [ ] User đã kết nối vào `/setup` thấy trạng thái "Đã kết nối" + link Repositories.
- [ ] Giao diện đồng bộ với phần còn lại (tokens, spacing như `repositories/page.tsx`).
