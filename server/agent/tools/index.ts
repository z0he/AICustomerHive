import { ToolRegistry } from "../tool-runtime";
import { countContactsTool } from "./count_contacts";
import { findInactiveCustomersTool } from "./find_inactive_customers";
import { getOrgSummaryTool } from "./get_org_summary";
import { getIndustryBreakdownTool } from "./get_industry_breakdown";
import { getLifecycleBreakdownTool } from "./get_lifecycle_breakdown";
import { topContactsByScoreTool } from "./top_contacts_by_score";
import { recentActivityTool } from "./recent_activity";
import { searchContactsTool } from "./search_contacts";
import { getContactDetailsTool } from "./get_contact_details";
import { countContactsBySourceTool } from "./count_contacts_by_source";
import { countContactsByCountryTool } from "./count_contacts_by_country";
import { countContactsByOwnerTool } from "./count_contacts_by_owner";
import { contactsWithoutOwnerTool } from "./contacts_without_owner";
import { upcomingFollowupsTool } from "./upcoming_followups";
import { upcomingTasksTool } from "./upcoming_tasks";
import { upcomingCalendarEventsTool } from "./upcoming_calendar_events";
import { listCampaignsTool } from "./list_campaigns";
import { emailActivitySummaryTool } from "./email_activity_summary";
import { recentFormSubmissionsTool } from "./recent_form_submissions";
import { createContactTool } from "./create_contact";

export const agentToolRegistry = new ToolRegistry();

agentToolRegistry.registerAll([
  countContactsTool,
  findInactiveCustomersTool,
  getOrgSummaryTool,
  getIndustryBreakdownTool,
  getLifecycleBreakdownTool,
  topContactsByScoreTool,
  recentActivityTool,
  searchContactsTool,
  getContactDetailsTool,
  countContactsBySourceTool,
  countContactsByCountryTool,
  countContactsByOwnerTool,
  contactsWithoutOwnerTool,
  upcomingFollowupsTool,
  upcomingTasksTool,
  upcomingCalendarEventsTool,
  listCampaignsTool,
  emailActivitySummaryTool,
  recentFormSubmissionsTool,
  createContactTool,
]);

export {
  countContactsTool,
  findInactiveCustomersTool,
  getOrgSummaryTool,
  getIndustryBreakdownTool,
  getLifecycleBreakdownTool,
  topContactsByScoreTool,
  recentActivityTool,
  searchContactsTool,
  getContactDetailsTool,
  countContactsBySourceTool,
  countContactsByCountryTool,
  countContactsByOwnerTool,
  contactsWithoutOwnerTool,
  upcomingFollowupsTool,
  upcomingTasksTool,
  upcomingCalendarEventsTool,
  listCampaignsTool,
  emailActivitySummaryTool,
  recentFormSubmissionsTool,
  createContactTool,
};
