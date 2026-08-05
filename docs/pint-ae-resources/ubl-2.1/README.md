# UBL 2.1 XSD (vendored)

Source: OASIS UBL 2.1 (https://docs.oasis-open.org/ubl/os-UBL-2.1/).
Actual download URL used: https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.zip
(the `/xsd/UBL-2.1.zip` path under the same base 404s; the release root zip works).
License: OASIS Open — vendorable; see OASIS UBL 2.1 license terms at the source URL.
Purpose: structural (XSD) validation for the converter engine's XSD gate.
Layout preserved from the official zip so relative import schemaLocation chains resolve.

Layout note (differs from the brief's guess): the official zip extracts to
`xsd/maindoc/` and `xsd/common/` — there is no top-level `commonbasiccomponents/`
directory (UBL-CommonBasicComponents-2.1.xsd lives inside `common/`). All other
zip artifacts (pdf, sch schematron, uml, etc.) were removed; only `xsd/` is vendored.
The spike and Task 2 must load the schema with a `file://` base URI — see
spikes/004-xsd-spike/spike-test.mjs for the working pattern.

Spike result (2026-08-05): GO. libxmljs2 v0.37.0 on node v22.23.2 validates the
official PINT AE "Standard tax invoice.xml" as `valid: true` against
xsd/maindoc/UBL-Invoice-2.1.xsd, and a deliberately broken variant (required
cbc:IssueDate removed) fails with a correct element-order error.
