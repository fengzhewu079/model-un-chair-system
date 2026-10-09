# Delete an executing motion

Problem: deleteVotedMotion rejected the target whenever a local processing draft existed, including a restored Paper Presentation draft while the agenda was visible.

Fix: explicit deletion abandons the target rather than checkpointing it. Release the target collaboration presence first; on failure retain the record and draft. After success remove the target and vote, clear its draft/time pool/mode label, preserve siblings and unrelated execution, and persist the removal. Existing shared-history version checks remain. Confirmation describes stopping execution.

Validation: regression failed before the fix; 62 tests pass, production build passes, targeted diff whitespace check passes. Local browser flow: two-paper motion, Pass, enter presentation, start, Back, Delete, empty agenda and GSL label. Live multi-chair network deletion not tested. No SQL changes. Not deployed to production.
