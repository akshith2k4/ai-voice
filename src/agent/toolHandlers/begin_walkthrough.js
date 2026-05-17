import { registerTool } from "../toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS } from "../protocol";
import { sendStatus } from "../wsConnection";

registerTool(TOOL_TYPES.BEGIN_WALKTHROUGH, async (args, { send, setActiveFormId }) => {
  setActiveFormId(args.formId);
  console.log(`[WalkthroughHandler] Walkthrough started: ${args.formId}`);
  sendStatus(STATUS_EVENTS.WALKTHROUGH_BEGUN, { formId: args.formId });
});
