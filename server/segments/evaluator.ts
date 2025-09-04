import { and, eq, gte, lte, lt, gt, ne, sql, isNotNull, inArray } from "drizzle-orm";
import { db } from "../db.js";
import { contacts, touchpoints } from "../../shared/schema.js";

// TypeScript types for Definition JSON structure
export type ComparisonOperator = 'eq' | 'neq' | 'in' | 'contains' | 'gt' | 'lt' | 'exists';
export type CountOperator = 'gte' | 'lte' | 'eq';

export interface PropertyFilter {
  prop: string;
  op: ComparisonOperator;
  value: any;
}

export interface TouchpointFilter {
  touchpoint: {
    type: string;
    subtype?: string;
    where?: {
      url?: {
        contains: string;
      };
      daysWithin?: number;
    };
    countOp: CountOperator;
    count: number;
  };
}

export interface LogicalComposition {
  all?: DefinitionJSON[];
  any?: DefinitionJSON[];
  not?: DefinitionJSON;
}

export type DefinitionJSON = PropertyFilter | TouchpointFilter | LogicalComposition;

/**
 * Main evaluator function that determines if a contact matches a segment definition
 * @param definition - The filter DSL JSON definition
 * @param contactId - The UUID of the contact to evaluate
 * @returns Promise<boolean> - True if contact matches the definition
 */
export async function evaluateSegment(definition: DefinitionJSON, contactId: string): Promise<boolean> {
  try {
    return await evaluateFilter(definition, contactId);
  } catch (error) {
    console.error('Error evaluating segment:', error);
    return false;
  }
}

/**
 * Recursive filter evaluation function
 */
async function evaluateFilter(filter: DefinitionJSON, contactId: string): Promise<boolean> {
  // Check for logical composition first
  if ('all' in filter && filter.all) {
    // AND operation - all filters must be true
    const results = await Promise.all(
      filter.all.map(subFilter => evaluateFilter(subFilter, contactId))
    );
    return results.every(result => result === true);
  }

  if ('any' in filter && filter.any) {
    // OR operation - at least one filter must be true
    const results = await Promise.all(
      filter.any.map(subFilter => evaluateFilter(subFilter, contactId))
    );
    return results.some(result => result === true);
  }

  if ('not' in filter && filter.not) {
    // NOT operation - negate the result
    const result = await evaluateFilter(filter.not, contactId);
    return !result;
  }

  // Handle property filters
  if ('prop' in filter) {
    return await evaluatePropertyFilter(filter, contactId);
  }

  // Handle touchpoint filters
  if ('touchpoint' in filter) {
    return await evaluateTouchpointFilter(filter, contactId);
  }

  // Unknown filter type
  console.warn('Unknown filter type:', filter);
  return false;
}

/**
 * Evaluate property-based filters against contact data
 */
async function evaluatePropertyFilter(filter: PropertyFilter, contactId: string): Promise<boolean> {
  // Get the contact data
  const contact = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (contact.length === 0) {
    return false;
  }

  const contactData = contact[0];
  const { prop, op, value } = filter;

  // Extract the value to compare against
  let fieldValue: any;

  // Handle nested properties (e.g., "properties.industry")
  if (prop.startsWith('properties.')) {
    const propertyPath = prop.replace('properties.', '');
    fieldValue = contactData.properties?.[propertyPath];
  } else {
    // Direct contact field
    fieldValue = (contactData as any)[prop];
  }

  // Apply the comparison operator
  switch (op) {
    case 'eq':
      return fieldValue === value;

    case 'neq':
      return fieldValue !== value;

    case 'in':
      if (!Array.isArray(value)) return false;
      return value.includes(fieldValue);

    case 'contains':
      if (prop === 'tags' && Array.isArray(contactData.tags)) {
        // Special handling for tags array - case-insensitive search
        return contactData.tags.some((tag: string) => 
          tag.toLowerCase().includes(value.toLowerCase())
        );
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((item: any) => 
          String(item).toLowerCase().includes(value.toLowerCase())
        );
      }
      return false;

    case 'gt':
      return Number(fieldValue) > Number(value);

    case 'lt':
      return Number(fieldValue) < Number(value);

    case 'exists':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

    default:
      console.warn('Unknown property operator:', op);
      return false;
  }
}

/**
 * Evaluate touchpoint-based filters with count operations
 */
async function evaluateTouchpointFilter(filter: TouchpointFilter, contactId: string): Promise<boolean> {
  const { touchpoint } = filter;
  const { type, subtype, where, countOp, count } = touchpoint;

  // Build conditions array
  const conditions = [eq(touchpoints.contactId, contactId)];

  // Apply type filter
  if (type) {
    conditions.push(eq(touchpoints.type, type as any));
  }

  // Apply subtype filter if provided
  if (subtype) {
    conditions.push(eq(touchpoints.subtype, subtype));
  }

  // Apply 'where' conditions
  if (where) {
    if (where.url?.contains) {
      // Check if meta->>'url' contains the specified string
      conditions.push(
        sql`${touchpoints.meta}->>'url' ILIKE ${`%${where.url.contains}%`}`
      );
    }

    if (where.daysWithin) {
      // Filter by occurred_at within the specified days
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - where.daysWithin);
      conditions.push(gte(touchpoints.occurredAt, daysAgo));
    }
  }

  // Build and execute the query
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(touchpoints)
    .where(and(...conditions));

  const actualCount = result[0]?.count || 0;

  // Apply the count comparison
  switch (countOp) {
    case 'gte':
      return actualCount >= count;
    case 'lte':
      return actualCount <= count;
    case 'eq':
      return actualCount === count;
    default:
      console.warn('Unknown count operator:', countOp);
      return false;
  }
}