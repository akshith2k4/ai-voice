import { TOOL_TYPES } from "./protocol";
import { walkthroughEngine } from "./WalkthroughEngine";
import { handleGeneralTool } from "./GeneralHandler";
import { sendError } from "./wsConnection";

const WALKTHROUGH_TOOLS = new Set([
  TOOL_TYPES.BEGIN_WALKTHROUGH,
  TOOL_TYPES.START_WALKTHROUGH,
  TOOL_TYPES.RESUME_WALKTHROUGH,
  TOOL_TYPES.PAUSE_WALKTHROUGH,
  TOOL_TYPES.CANCEL_WALKTHROUGH,
  TOOL_TYPES.FIELD_STEP,
  TOOL_TYPES.SPEAK,
  TOOL_TYPES.OPEN_DIALOG,
  TOOL_TYPES.CLOSE_DIALOG,
  TOOL_TYPES.GO_TO_FIELD,
  TOOL_TYPES.FILL_FIELD,
  TOOL_TYPES.EXPLAIN_FIELD,
  TOOL_TYPES.ADD_ITEM,
  TOOL_TYPES.CLICK_CHECKBOX,
  TOOL_TYPES.CLEAR_ALL_FIELDS,
  TOOL_TYPES.SELECT_ITEM,
  TOOL_TYPES.CLICK_ELEMENT,
  TOOL_TYPES.GET_OPTIONS_COUNT,
  "detour_start",
  "detour_end",
  "walkthrough_finished",
]);

export function dispatchTool(tool, args, generalContext) {
  try {
    if (WALKTHROUGH_TOOLS.has(tool)) {
      walkthroughEngine.dispatch(tool, args);
    } else {
      Promise.resolve(handleGeneralTool(tool, args, generalContext)).catch((err) => {
        console.error(`[ToolRouter] Error in general tool ${tool}:`, err);
        sendError(tool, err.message || String(err));
      });
    }
  } catch (err) {
    console.error(`[ToolRouter] Fatal error executing ${tool}:`, err);
    sendError(tool, err.message || String(err));
  }
}
