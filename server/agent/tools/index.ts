import { ToolRegistry } from "../tool-runtime";
import { countContactsTool } from "./count_contacts";
import { findInactiveCustomersTool } from "./find_inactive_customers";
import { getOrgSummaryTool } from "./get_org_summary";
import { getIndustryBreakdownTool } from "./get_industry_breakdown";
import { getLifecycleBreakdownTool } from "./get_lifecycle_breakdown";
import { topContactsByScoreTool } from "./top_contacts_by_score";
import { recentActivityTool } from "./recent_activity";

export const agentToolRegistry = new ToolRegistry();

agentToolRegistry.registerAll([
  countContactsTool,
  findInactiveCustomersTool,
  getOrgSummaryTool,
  getIndustryBreakdownTool,
  getLifecycleBreakdownTool,
  topContactsByScoreTool,
  recentActivityTool,
]);

export {
  countContactsTool,
  findInactiveCustomersTool,
  getOrgSummaryTool,
  getIndustryBreakdownTool,
  getLifecycleBreakdownTool,
  topContactsByScoreTool,
  recentActivityTool,
};
