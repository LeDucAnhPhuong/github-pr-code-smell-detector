import "dotenv/config";
import { PrismaClient, Severity } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed subscription plans
  // Prices are in VND (whole dong). Editable later in Admin → Plans.
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Free" },
    update: { price: 0, tokenQuota: 4_000_000 },
    create: {
      name: "Free",
      price: 0,
      repositoryLimit: 3,
      analysisQuota: 30,
      tokenQuota: 4_000_000,
      hasCheckAnnotations: false,
      hasHistoricalReports: false,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Pro" },
    update: { price: 199000, tokenQuota: 30_000_000 },
    create: {
      name: "Pro",
      price: 199000,
      repositoryLimit: 25,
      analysisQuota: 100,
      tokenQuota: 30_000_000,
      hasCheckAnnotations: true,
      hasHistoricalReports: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: "Team" },
    update: { price: 499000, tokenQuota: 300_000_000 },
    create: {
      name: "Team",
      price: 499000,
      repositoryLimit: 100,
      analysisQuota: 1000,
      tokenQuota: 300_000_000,
      hasCheckAnnotations: true,
      hasHistoricalReports: true,
    },
  });

  console.log("Seeded subscription plans:", freePlan.name, proPlan.name, "Team");

  // Seed frameworks
  const reactFramework = await prisma.framework.upsert({
    where: { name: "React" },
    update: {},
    create: {
      name: "React",
      supportedExtensions: [".jsx", ".tsx", ".js", ".ts"],
    },
  });

  const expressFramework = await prisma.framework.upsert({
    where: { name: "Express" },
    update: {},
    create: {
      name: "Express",
      supportedExtensions: [".js", ".ts"],
    },
  });

  const generalFramework = await prisma.framework.upsert({
    where: { name: "General JS/TS" },
    update: {},
    create: {
      name: "General JS/TS",
      supportedExtensions: [".js", ".jsx", ".ts", ".tsx"],
    },
  });

  console.log("Seeded frameworks");

  // Seed categories
  const frontendCategory = await prisma.category.upsert({
    where: { name: "Frontend Maintainability" },
    update: {},
    create: {
      name: "Frontend Maintainability",
      description: "Rules that flag frontend components growing too large or complex to maintain.",
      defaultSeverity: Severity.warning,
    },
  });

  const backendCategory = await prisma.category.upsert({
    where: { name: "Backend Maintainability" },
    update: {},
    create: {
      name: "Backend Maintainability",
      description: "Rules that flag backend code structure issues in Express apps.",
      defaultSeverity: Severity.warning,
    },
  });

  const complexityCategory = await prisma.category.upsert({
    where: { name: "Complexity" },
    update: {},
    create: {
      name: "Complexity",
      description: "Rules that flag code that is overly complex or hard to read.",
      defaultSeverity: Severity.warning,
    },
  });

  const errorHandlingCategory = await prisma.category.upsert({
    where: { name: "Error Handling" },
    update: {},
    create: {
      name: "Error Handling",
      description: "Rules that flag missing or inadequate error handling patterns.",
      defaultSeverity: Severity.error,
    },
  });

  await prisma.category.upsert({
    where: { name: "Configuration Safety" },
    update: {},
    create: {
      name: "Configuration Safety",
      description: "Rules that flag hard-coded configuration values that should be environment variables.",
      defaultSeverity: Severity.warning,
    },
  });

  console.log("Seeded categories");

  // Seed React rules
  await prisma.rule.upsert({
    where: { id: "react/no-large-component" },
    update: {},
    create: {
      id: "react/no-large-component",
      name: "Large Component",
      description: "Flags React components that exceed the maximum line threshold.",
      whyItMatters:
        "Large components are harder to understand, test, and maintain. They often signal that a component is doing too much and should be split into smaller, focused components.",
      frameworkId: reactFramework.id,
      categoryId: frontendCategory.id,
      defaultSeverity: Severity.warning,
      defaultThreshold: 150,
    },
  });

  await prisma.rule.upsert({
    where: { id: "react/too-many-props" },
    update: {},
    create: {
      id: "react/too-many-props",
      name: "Too Many Props",
      description: "Flags React components that receive more props than the configured maximum.",
      whyItMatters:
        "Components with many props are tightly coupled and hard to reuse. Grouping related props into objects or breaking the component apart improves cohesion.",
      frameworkId: reactFramework.id,
      categoryId: frontendCategory.id,
      defaultSeverity: Severity.warning,
      defaultThreshold: 7,
    },
  });

  await prisma.rule.upsert({
    where: { id: "react/too-many-states" },
    update: {},
    create: {
      id: "react/too-many-states",
      name: "Too Many States",
      description: "Flags React components with excessive useState hook calls.",
      whyItMatters:
        "Many independent state variables often indicate that state logic should be extracted into useReducer or a custom hook, making the component easier to understand.",
      frameworkId: reactFramework.id,
      categoryId: complexityCategory.id,
      defaultSeverity: Severity.warning,
      defaultThreshold: 5,
    },
  });

  await prisma.rule.upsert({
    where: { id: "react/complex-jsx" },
    update: {},
    create: {
      id: "react/complex-jsx",
      name: "Complex JSX",
      description: "Flags JSX with nesting depth exceeding the configured threshold.",
      whyItMatters:
        "Deeply nested JSX is hard to read and typically signals that nested sections should be extracted into separate components.",
      frameworkId: reactFramework.id,
      categoryId: complexityCategory.id,
      defaultSeverity: Severity.info,
      defaultThreshold: 5,
    },
  });

  await prisma.rule.upsert({
    where: { id: "react/inline-function-overuse" },
    update: {},
    create: {
      id: "react/inline-function-overuse",
      name: "Inline Function Overuse",
      description: "Flags JSX elements with excessive inline arrow functions in props.",
      whyItMatters:
        "Inline functions create new function references on every render, causing unnecessary re-renders in child components. Extracting handlers improves performance and readability.",
      frameworkId: reactFramework.id,
      categoryId: complexityCategory.id,
      defaultSeverity: Severity.warning,
      defaultThreshold: 3,
    },
  });

  await prisma.rule.upsert({
    where: { id: "react/mixed-responsibility" },
    update: {},
    create: {
      id: "react/mixed-responsibility",
      name: "Mixed Responsibility",
      description: "Flags React components that mix UI rendering with API calls and business logic.",
      whyItMatters:
        "Components that handle data fetching, business logic, and rendering are harder to test and reuse. Separating concerns into custom hooks or service modules leads to cleaner architecture.",
      frameworkId: reactFramework.id,
      categoryId: frontendCategory.id,
      defaultSeverity: Severity.warning,
      defaultThreshold: undefined,
    },
  });

  console.log("Seeded React rules");

  // Seed Express rules (post-MVP placeholders)
  await prisma.rule.upsert({
    where: { id: "express/long-function" },
    update: {},
    create: {
      id: "express/long-function",
      name: "Long Function",
      description: "Flags Express route handlers or middleware functions that exceed the line threshold.",
      whyItMatters:
        "Long functions are hard to test and understand. Breaking them into smaller, focused functions improves maintainability.",
      frameworkId: expressFramework.id,
      categoryId: backendCategory.id,
      defaultSeverity: Severity.warning,
      defaultThreshold: 50,
      isActive: false,
    },
  });

  await prisma.rule.upsert({
    where: { id: "express/god-route-file" },
    update: {},
    create: {
      id: "express/god-route-file",
      name: "God Route File",
      description: "Flags Express route files containing too many endpoints.",
      whyItMatters:
        "Route files with many endpoints handle too many concerns. Splitting by resource or domain improves navigation and isolation.",
      frameworkId: expressFramework.id,
      categoryId: backendCategory.id,
      defaultSeverity: Severity.error,
      defaultThreshold: 10,
      isActive: false,
    },
  });

  await prisma.rule.upsert({
    where: { id: "express/missing-error-handling" },
    update: {},
    create: {
      id: "express/missing-error-handling",
      name: "Missing Error Handling",
      description: "Flags async Express route handlers that lack try/catch or error forwarding.",
      whyItMatters:
        "Unhandled async errors crash the Express process or return 500s without context. Wrapping handlers in try/catch and calling next(error) ensures graceful error handling.",
      frameworkId: expressFramework.id,
      categoryId: errorHandlingCategory.id,
      defaultSeverity: Severity.error,
      defaultThreshold: undefined,
      isActive: false,
    },
  });

  // Seed general JS/TS rules
  await prisma.rule.upsert({
    where: { id: "general/hard-coded-config" },
    update: {},
    create: {
      id: "general/hard-coded-config",
      name: "Hard-coded Configuration",
      description: "Flags hard-coded secrets, URLs, or configuration values that should be environment variables.",
      whyItMatters:
        "Hard-coded configuration values are a security risk and make the code less portable. Environment variables allow configuration to change without code changes.",
      frameworkId: generalFramework.id,
      categoryId: backendCategory.id,
      defaultSeverity: Severity.warning,
      defaultThreshold: undefined,
      isActive: false,
    },
  });

  console.log("Seeded all rules");
  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
