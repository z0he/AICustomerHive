import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db.js';
import { contacts, touchpoints } from '../../shared/schema.js';
import { evaluateSegment, type DefinitionJSON } from './evaluator.js';
import { eq } from 'drizzle-orm';

describe('Segment Evaluator', () => {
  let testContactId: string;
  let testContactId2: string;

  // Setup test data before each test
  beforeEach(async () => {
    // Insert test contacts
    const [contact1] = await db.insert(contacts).values({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      company: 'Tech Ltd',
      lifecycleStage: 'lead',
      status: 'active',
      tags: ['high-intent', 'enterprise'],
      properties: {
        industry: 'Technology',
        score: 85,
        budget: 50000
      }
    }).returning({ id: contacts.id });

    const [contact2] = await db.insert(contacts).values({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@retail.com',
      company: 'Retail Corp',
      lifecycleStage: 'customer',
      status: 'active',
      tags: ['low-priority'],
      properties: {
        industry: 'Retail',
        score: 45,
        budget: 15000
      }
    }).returning({ id: contacts.id });

    testContactId = contact1.id;
    testContactId2 = contact2.id;

    // Insert test touchpoints
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    await db.insert(touchpoints).values([
      {
        contactId: testContactId,
        type: 'web',
        subtype: 'page_view',
        occurredAt: threeDaysAgo,
        meta: { url: '/pricing', pageTitle: 'Pricing Page' }
      },
      {
        contactId: testContactId,
        type: 'web',
        subtype: 'page_view',
        occurredAt: threeDaysAgo,
        meta: { url: '/pricing/enterprise', pageTitle: 'Enterprise Pricing' }
      },
      {
        contactId: testContactId,
        type: 'web',
        subtype: 'page_view',
        occurredAt: threeDaysAgo,
        meta: { url: '/pricing/pro', pageTitle: 'Pro Pricing' }
      },
      {
        contactId: testContactId,
        type: 'email',
        subtype: 'opened',
        occurredAt: now,
        meta: { campaignId: 'campaign_123' }
      },
      {
        contactId: testContactId,
        type: 'web',
        subtype: 'page_view',
        occurredAt: tenDaysAgo,
        meta: { url: '/about', pageTitle: 'About Us' }
      },
      {
        contactId: testContactId2,
        type: 'web',
        subtype: 'page_view',
        occurredAt: now,
        meta: { url: '/support', pageTitle: 'Support' }
      }
    ]);
  });

  // Cleanup test data after each test
  afterEach(async () => {
    await db.delete(touchpoints).where(eq(touchpoints.contactId, testContactId));
    await db.delete(touchpoints).where(eq(touchpoints.contactId, testContactId2));
    await db.delete(contacts).where(eq(contacts.id, testContactId));
    await db.delete(contacts).where(eq(contacts.id, testContactId2));
  });

  describe('Property Filters', () => {
    it('should handle eq operator correctly', async () => {
      const definition: DefinitionJSON = {
        prop: 'company',
        op: 'eq',
        value: 'Tech Ltd'
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle neq operator correctly', async () => {
      const definition: DefinitionJSON = {
        prop: 'lifecycleStage',
        op: 'neq',
        value: 'customer'
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle in operator correctly', async () => {
      const definition: DefinitionJSON = {
        prop: 'lifecycleStage',
        op: 'in',
        value: ['lead', 'mql']
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle contains operator on tags (case-insensitive)', async () => {
      const definition: DefinitionJSON = {
        prop: 'tags',
        op: 'contains',
        value: 'HIGH-INTENT'
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle contains operator on string fields', async () => {
      const definition: DefinitionJSON = {
        prop: 'company',
        op: 'contains',
        value: 'Ltd'
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle gt and lt operators correctly', async () => {
      const gtDefinition: DefinitionJSON = {
        prop: 'properties.score',
        op: 'gt',
        value: 50
      };

      const ltDefinition: DefinitionJSON = {
        prop: 'properties.budget',
        op: 'lt',
        value: 20000
      };

      const gtResult = await evaluateSegment(gtDefinition, testContactId);
      expect(gtResult).toBe(true);

      const ltResult = await evaluateSegment(ltDefinition, testContactId2);
      expect(ltResult).toBe(true);
    });

    it('should handle exists operator correctly', async () => {
      const definition: DefinitionJSON = {
        prop: 'properties.industry',
        op: 'exists',
        value: true
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      // Test with non-existent property
      const nonExistentDefinition: DefinitionJSON = {
        prop: 'properties.nonExistentField',
        op: 'exists',
        value: true
      };

      const nonExistentResult = await evaluateSegment(nonExistentDefinition, testContactId);
      expect(nonExistentResult).toBe(false);
    });

    it('should handle nested properties correctly', async () => {
      const definition: DefinitionJSON = {
        prop: 'properties.industry',
        op: 'eq',
        value: 'Technology'
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });
  });

  describe('Touchpoint Filters', () => {
    it('should handle touchpoint url contains with daysWithin and gte count', async () => {
      const definition: DefinitionJSON = {
        touchpoint: {
          type: 'web',
          where: {
            url: { contains: '/pricing' },
            daysWithin: 7
          },
          countOp: 'gte',
          count: 3
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle touchpoint type filter only', async () => {
      const definition: DefinitionJSON = {
        touchpoint: {
          type: 'email',
          countOp: 'gte',
          count: 1
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle touchpoint with subtype filter', async () => {
      const definition: DefinitionJSON = {
        touchpoint: {
          type: 'web',
          subtype: 'page_view',
          countOp: 'gte',
          count: 4
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false);
    });

    it('should handle touchpoint lte count operation', async () => {
      const definition: DefinitionJSON = {
        touchpoint: {
          type: 'email',
          countOp: 'lte',
          count: 1
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(true); // 0 emails <= 1
    });

    it('should handle touchpoint eq count operation', async () => {
      const definition: DefinitionJSON = {
        touchpoint: {
          type: 'email',
          countOp: 'eq',
          count: 1
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false); // 0 emails != 1
    });

    it('should handle daysWithin filter correctly', async () => {
      const definition: DefinitionJSON = {
        touchpoint: {
          type: 'web',
          where: {
            daysWithin: 5
          },
          countOp: 'gte',
          count: 3
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true); // 3 web touchpoints within 5 days

      // Test with stricter timeframe
      const strictDefinition: DefinitionJSON = {
        touchpoint: {
          type: 'web',
          where: {
            daysWithin: 1
          },
          countOp: 'gte',
          count: 3
        }
      };

      const strictResult = await evaluateSegment(strictDefinition, testContactId);
      expect(strictResult).toBe(false); // Only recent touchpoints (should be < 3)
    });
  });

  describe('Logical Composition', () => {
    it('should handle all (AND) operation correctly', async () => {
      const definition: DefinitionJSON = {
        all: [
          { prop: 'lifecycleStage', op: 'eq', value: 'lead' },
          { prop: 'status', op: 'eq', value: 'active' },
          { prop: 'properties.score', op: 'gt', value: 50 }
        ]
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false); // Customer, not lead
    });

    it('should handle any (OR) operation correctly', async () => {
      const definition: DefinitionJSON = {
        any: [
          { prop: 'lifecycleStage', op: 'eq', value: 'customer' },
          { prop: 'properties.score', op: 'gt', value: 80 }
        ]
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true); // High score

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(true); // Is customer
    });

    it('should handle not operation correctly', async () => {
      const definition: DefinitionJSON = {
        not: {
          prop: 'lifecycleStage',
          op: 'eq',
          value: 'customer'
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true); // Not a customer

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false); // Is a customer
    });

    it('should handle nested logical composition', async () => {
      const definition: DefinitionJSON = {
        all: [
          {
            any: [
              { prop: 'lifecycleStage', op: 'eq', value: 'lead' },
              { prop: 'lifecycleStage', op: 'eq', value: 'mql' }
            ]
          },
          {
            not: {
              prop: 'status',
              op: 'eq',
              value: 'inactive'
            }
          },
          {
            touchpoint: {
              type: 'web',
              countOp: 'gte',
              count: 1
            }
          }
        ]
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(true);

      const result2 = await evaluateSegment(definition, testContactId2);
      expect(result2).toBe(false); // Is customer, not lead/mql
    });
  });

  describe('Edge Cases', () => {
    it('should return false for non-existent contact', async () => {
      const definition: DefinitionJSON = {
        prop: 'email',
        op: 'exists',
        value: true
      };

      const result = await evaluateSegment(definition, 'non-existent-id');
      expect(result).toBe(false);
    });

    it('should handle empty logical arrays gracefully', async () => {
      const allDefinition: DefinitionJSON = { all: [] };
      const anyDefinition: DefinitionJSON = { any: [] };

      const allResult = await evaluateSegment(allDefinition, testContactId);
      expect(allResult).toBe(true); // Empty AND should be true

      const anyResult = await evaluateSegment(anyDefinition, testContactId);
      expect(anyResult).toBe(false); // Empty OR should be false
    });

    it('should handle unknown operators gracefully', async () => {
      const definition: DefinitionJSON = {
        prop: 'email',
        op: 'unknown_op' as any,
        value: 'test'
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(false);
    });

    it('should handle invalid touchpoint count operators', async () => {
      const definition: DefinitionJSON = {
        touchpoint: {
          type: 'web',
          countOp: 'invalid_op' as any,
          count: 1
        }
      };

      const result = await evaluateSegment(definition, testContactId);
      expect(result).toBe(false);
    });
  });
});