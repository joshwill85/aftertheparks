import {
  auditTransportationPolicyRecords,
  collectTransportationPolicyRecords,
  renderTransportationPolicyAuditReport,
} from "@/lib/seo/transportationPolicyAudit";

const paths = process.argv.slice(2);
const records = collectTransportationPolicyRecords(paths.length > 0 ? paths : undefined);
const audit = auditTransportationPolicyRecords(records);

console.log(renderTransportationPolicyAuditReport(audit));

if (audit.issues.length > 0) {
  process.exit(1);
}
