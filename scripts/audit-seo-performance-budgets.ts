import {
  loadBuiltSeoPerformanceAudit,
  renderSeoPerformanceBudgetReport,
} from "@/lib/seo/performanceBudgets";

const audit = loadBuiltSeoPerformanceAudit();

console.log(renderSeoPerformanceBudgetReport(audit.rows, audit.issues));

if (audit.issues.length > 0) {
  process.exit(1);
}
