/**
 * Host half of the review-tab Markdown preview patch.
 *
 * Re-exports the stock `@deepseek-ai/dsh-client-ui-deliverables` apply, so the
 * Host keeps registering its routes (`/api/changes.*`, `/api/present.*`) and
 * its prompt segment unchanged. Only the served browser bundle differs: the
 * client-modules registry serves THIS package's `lib/client.js` (a patched
 * copy) because the composition row points at this module. The companion
 * `cordis.patch.yml` rows disable the stock `ui-deliverables` row and insert
 * this one, so exactly one registration of every slot and dictionary exists.
 */
export { apply, inject } from "@deepseek-ai/dsh-client-ui-deliverables";
