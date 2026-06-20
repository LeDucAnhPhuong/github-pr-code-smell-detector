import { Check } from "lucide-react";
import { InstallAppButton } from "./InstallAppButton";

interface SetupStepperProps {
  slug: string;
  connected: boolean;
}

function StepDot({ done, n }: { done: boolean; n: number }) {
  return (
    <div
      className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-semibold"
      style={{
        backgroundColor: done ? "var(--color-primary)" : "var(--color-surface-muted)",
        color: done ? "#fff" : "var(--color-text-muted)",
      }}
    >
      {done ? <Check className="w-4 h-4" /> : n}
    </div>
  );
}

export function SetupStepper({ slug, connected }: SetupStepperProps) {
  return (
    <ol className="space-y-5">
      <li className="flex items-start gap-3">
        <StepDot done n={1} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Đăng nhập GitHub
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Bạn đã đăng nhập — gói Free được kích hoạt tự động.
          </p>
        </div>
      </li>

      <li className="flex items-start gap-3">
        <StepDot done={connected} n={2} />
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Cài GitHub App
          </p>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Bấm nút bên dưới, chọn repo muốn theo dõi rồi bấm Install. App xin quyền đọc mã nguồn,
            đọc/ghi Pull request (để comment) và Checks. <strong>Không</strong> xin quyền ghi code.
          </p>
          {!connected && <InstallAppButton slug={slug} />}
        </div>
      </li>

      <li className="flex items-start gap-3">
        <StepDot done={connected} n={3} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Chọn repo &amp; xong
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Repo đã chọn sẽ xuất hiện trong mục Repositories. Không cần tạo file workflow.
          </p>
        </div>
      </li>
    </ol>
  );
}
