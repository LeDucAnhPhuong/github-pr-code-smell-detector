import { Users, GitBranch, Activity, CreditCard, AlertTriangle } from "lucide-react";
import {
  getAdminStats,
  getAnalysisStatusCounts,
  getRecentAnalyses,
} from "@github-pr-code-smell-detector/core/db/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

const statusStyles: Record<AnalysisStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  RUNNING: "bg-[#EFF6FF] text-[#1D4ED8] dark:bg-transparent dark:text-blue-400",
  COMPLETED: "bg-[#ECFDF3] text-[#067647] dark:bg-transparent dark:text-emerald-400",
  FAILED: "bg-[#FEF2F2] text-[#B42318] dark:bg-transparent dark:text-red-400",
};

function StatusPill({ status }: { status: AnalysisStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export default async function AdminOverviewPage() {
  const [stats, statusCounts, recent] = await Promise.all([
    getAdminStats(),
    getAnalysisStatusCounts(),
    getRecentAnalyses(),
  ]);

  const cards = [
    { label: "Người dùng", value: stats.users, icon: Users },
    { label: "Repositories", value: stats.repositories, icon: GitBranch },
    { label: "Lượt phân tích", value: stats.analyses, icon: Activity },
    { label: "Gói đang bật", value: stats.activePlans, icon: CreditCard },
    { label: "Findings", value: stats.findings, icon: AlertTriangle },
  ];

  const statusOrder: AnalysisStatus[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED"];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Số liệu hệ thống MergeTrack.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-semibold tabular-nums">{c.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Trạng thái phân tích</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            {statusOrder.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <StatusPill status={s} />
                <span className="text-sm font-medium tabular-nums">{statusCounts[s].toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Phân tích gần đây</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recent.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Chưa có phân tích nào.</div>
              )}
              {recent.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {a.pullRequest.repository.fullName}{" "}
                      <span className="text-muted-foreground">#{a.pullRequest.prNumber}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{a.pullRequest.title}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusPill status={a.status as AnalysisStatus} />
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {new Date(a.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
