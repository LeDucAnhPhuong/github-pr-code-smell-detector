import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("setup");
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  return (
    <ol className="space-y-5">
      <li className="flex items-start gap-3">
        <StepDot done n={1} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {t("step1Title")}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("step1Body")}
          </p>
        </div>
      </li>

      <li className="flex items-start gap-3">
        <StepDot done={connected} n={2} />
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {t("step2Title")}
          </p>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
            {t.rich("step2Body", { strong })}
          </p>
          {!connected && <InstallAppButton slug={slug} />}
        </div>
      </li>

      <li className="flex items-start gap-3">
        <StepDot done={connected} n={3} />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {t("step3Title")}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("step3Body")}
          </p>
        </div>
      </li>
    </ol>
  );
}
