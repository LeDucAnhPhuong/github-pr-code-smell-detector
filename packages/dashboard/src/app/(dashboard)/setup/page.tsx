import { auth } from "@/lib/auth";
import { getInstallationsByUser } from "@/lib/db/installations";
import { appSlug } from "@/lib/github-app";
import { SetupStepper } from "@/components/setup/SetupStepper";
import { Troubleshooting } from "@/components/setup/Troubleshooting";
import { InstallAppButton } from "@/components/setup/InstallAppButton";
import Link from "next/link";
import { GitPullRequest, Settings, Trash2, Gauge } from "lucide-react";

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card card-body">
      <div className="row" style={{ gap: 8, marginBottom: 6 }}>
        <Icon className="w-4 h-4" style={{ color: "var(--ink-3)" }} />
        <h3 className="h2">{title}</h3>
      </div>
      <div className="secondary" style={{ fontSize: 13 }}>
        {children}
      </div>
    </div>
  );
}

export default async function SetupPage() {
  const session = await auth();
  const userId = session!.user.id;
  const installations = await getInstallationsByUser(userId);
  const connected = installations.length > 0;
  const slug = appSlug();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="between" style={{ marginBottom: 18 }}>
        <h1 className="h1">Bắt đầu với MergeTrack</h1>
        <span className="status">
          <span className="dot" style={{ background: connected ? "var(--ok-dot)" : "var(--idle-dot)" }} />
          {connected ? "Đã kết nối" : "Chưa kết nối"}
        </span>
      </div>

      {/* Stepper */}
      <div className="card" style={{ padding: 24, marginBottom: 18 }}>
        <SetupStepper slug={slug} connected={connected} />
      </div>

      {connected && (
        <div className="card card-body between" style={{ marginBottom: 18 }}>
          <p className="secondary" style={{ margin: 0, fontSize: 13 }}>
            App đã được cài ({installations.map((i) => i.accountLogin).join(", ")}). Quản lý repo trong mục Repositories.
          </p>
          <div className="row" style={{ gap: 10 }}>
            <InstallAppButton slug={slug} label="Thêm repo" />
            <Link href="/repositories" className="btn btn-secondary btn-sm">
              Tới Repositories
            </Link>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 18 }}>
        <Card title="Khi nào bot chạy?" icon={GitPullRequest}>
          Tự động khi có Pull request được mở / push thêm / mở lại. Trong dưới 1 phút, PR có
          <strong> 1 comment của bot</strong> (cập nhật tại chỗ ở lần push sau) và <strong>1 mục trong tab Checks</strong>.
          Kết quả cũng lưu trên dashboard.
        </Card>
        <Card title="Tuỳ chỉnh (tuỳ chọn)" icon={Settings}>
          Vào Repository → Config để bật/tắt rule, chỉnh ngưỡng, giới hạn đường dẫn, hoặc bật chế độ chặn merge khi có lỗi
          nghiêm trọng. Mặc định bot chỉ nhắc, không chặn.
        </Card>
        <Card title="Quản lý &amp; gỡ" icon={Trash2}>
          Thêm/bớt repo hoặc gỡ hẳn tại GitHub → Settings → Applications → (tên App) → Configure.
        </Card>
        <Card title="Hạn mức" icon={Gauge}>
          Mỗi gói có số lượt phân tích/tháng (Free 30 · Pro 100 · Team 1000). Hết hạn mức, PR mới hiện “Quota exceeded” và bot
          tạm dừng.
        </Card>
      </div>

      <p className="eyebrow" style={{ marginBottom: 12 }}>
        Sự cố thường gặp
      </p>
      <Troubleshooting />
    </div>
  );
}
