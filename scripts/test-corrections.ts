import assert from "node:assert/strict";

import {
  buildCorrectionInsert,
  parseCorrectionSubmission,
} from "@/lib/corrections";

const payload = parseCorrectionSubmission({
  name: "  Josh  ",
  email: " JOSH@EXAMPLE.COM ",
  message: "  The movie night listing has the wrong time.\nPlease check the guide.  ",
});

assert.deepEqual(payload, {
  name: "Josh",
  email: "josh@example.com",
  message: "The movie night listing has the wrong time.\nPlease check the guide.",
});

assert.deepEqual(buildCorrectionInsert(payload), {
  reporter_name: "Josh",
  reporter_email: "josh@example.com",
  body: "The movie night listing has the wrong time.\nPlease check the guide.",
  field: "contact_message",
  suggested_value:
    "The movie night listing has the wrong time.\nPlease check the guide.",
  activity_catalog_id: null,
});

assert.throws(
  () => parseCorrectionSubmission({ name: "Josh", email: "nope", message: "Hi" }),
  /valid email address/
);

assert.throws(
  () => parseCorrectionSubmission({ name: "Josh", email: "josh@example.com" }),
  /message/
);

console.log("Corrections tests passed");
