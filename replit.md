# AICRM - AI-Powered Customer Relationship Management System

## Overview
AICRM is an AI-powered customer relationship management (CRM) platform that integrates traditional CRM functionalities with advanced AI features. It offers voice-controlled interfaces, intelligent campaign suggestions, customer insights, and automated marketing workflows. The system is designed as a full-stack web application, prioritizing performance and a modern user experience to help businesses manage customer interactions, optimize marketing efforts, and drive sales efficiently. Key ambitions include providing a comprehensive solution for customer journey mapping, lead management, and multi-channel campaign execution, leveraging AI for deeper customer understanding and automation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, styled with Tailwind CSS for custom branding and Radix UI components for a robust design system. Shadcn/ui is used for a comprehensive component library. The design emphasizes a professional and intuitive interface with clear navigation and visual analytics.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI, TanStack Query for state management, Wouter for routing, Vite for bundling.
- **Backend**: Node.js 20 with TypeScript (ESM), Express.js for REST APIs, Passport.js for authentication (local, JWT, Google OAuth), Express sessions with PostgreSQL storage, Express-fileupload for file processing.
- **Database**: PostgreSQL with Drizzle ORM, Neon Database for serverless connection pooling, Drizzle Kit for schema management, custom transaction manager.

### Feature Specifications
- **Core CRM**: Customer, Lead, and Campaign management, Customer Journey Mapping, Task Management, Calendar Integration.
- **AI-Powered**: Browser-based Voice Commands, OpenAI-powered AI Assistant, AI-generated Campaign Suggestions, Automated Customer Insights, Smart Email Personalization.
- **Marketing Automation**: Template-based Email Management, Embeddable Marketing Forms, Scheduled Communications, Web Tracking, Lead Generation.
- **Hybrid Usage Model**: Tiered access (Free, Pro, Enterprise), support for personal OpenAI and Mailgun API keys, usage tracking, and graceful degradation without AI.
- **Contact Management**: Unified contact system with lead scoring, advanced filtering, source tracking, and lifecycle stage management.

### System Design Choices
The system uses a modular architecture for both frontend and backend to ensure scalability and maintainability. Authentication is handled via JWT and sessions. Data import/export supports CSV/JSON with field mapping. A dual-table approach for contacts maintains backward compatibility while transitioning to a unified contact system.

### Recent Changes (October 2025)
**Filter Standardization & Consolidation (Oct 7, 2025)**:
- Centralized all dropdown constants in `shared/constants.ts` as single source of truth
- Updated `LEAD_SOURCES` to 18 options with lowercase IDs for backward compatibility (includes "import", "manual", "all_sources" for voice commands)
- Updated `LEAD_STATUSES` to 8 options (includes "all_statuses" sentinel for voice commands)
- Updated `LIFECYCLE_STAGES` to 5 valid options (lead, opportunity, customer, evangelist, churned)
- Expanded `INDUSTRIES` to 141 LinkedIn-style options
- **EditContactModal**: Added Lead Status field, updated all dropdowns to use shared constants with {id, name} format
- **CreateCampaignModal**: Removed duplicate "Lead Filters" section, standardized Advanced Contact Filters (removed Tags and Status fields per user request), fixed lifecycle stages, added 141 industry options
- **Backward Compatibility**: Maintained lowercase slug IDs for lead sources to support existing campaign data and voice command integration
- **Bug Fix**: Resolved undefined message field handling in campaign modal to prevent runtime errors

## External Dependencies

### AI Services
- **OpenAI API**: Used for voice interpretation, campaign suggestions, and customer insights. Supports a hybrid usage model.

### Email Services
- **Mailgun**: Primary service for email delivery and template support.
- **SendGrid**: Alternative email provider (configured).

### Authentication
- **Google OAuth**: For third-party authentication.
- **Firebase Admin**: For token verification and user management.
- **Passport.js**: Authentication middleware.

### Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit**: Development and deployment platform.
- **WebSocket Support**: For real-time features.