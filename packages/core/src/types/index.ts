// Shared TypeScript types (not Prisma-generated)

export type UserRole = "USER" | "ADMIN";

export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type Severity = "error" | "warning" | "info";

// BullMQ job payload
export interface AnalysisJob {
  prAnalysisId: string;
  repoId: string;
  prNumber: number;
  commitSha: string;
  installationId: number;
}

// BullMQ job payload — Project Overview indexing (plan 02)
export interface OverviewJob {
  repositoryId: string;
  installationId: number;
  /** Optional target commit; defaults to the default branch head at run time. */
  sha?: string;
  /** Whether to backfill open PRs once the overview is READY (first index). */
  backfill?: boolean;
}

// Standard API response shapes
export type ApiSuccess<T> = { data: T };
export type ApiError = { error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Session user extension (adds role to Auth.js session)
declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}
