import { ToolRegistry } from "../tool-runtime";
import { countContactsTool } from "./count_contacts";
import { findInactiveCustomersTool } from "./find_inactive_customers";
import { getOrgSummaryTool } from "./get_org_summary";

export const agentToolRegistry = new ToolRegistry();

agentToolRegistry.registerAll([
  countContactsTool,
  findInactiveCustomersTool,
  getOrgSummaryTool,
]);

export {
  countContactsTool,
  findInactiveCustomersTool,
  getOrgSummaryTool,
};
