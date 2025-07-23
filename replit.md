# AICRM - AI-Powered Customer Relationship Management System

## Overview

AICRM is a comprehensive CRM platform that combines traditional customer relationship management capabilities with AI-powered features. The system provides voice-controlled interfaces, intelligent campaign suggestions, customer insights, and automated marketing workflows. Built as a full-stack web application with a modern tech stack focused on performance and user experience.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom brand theming and Radix UI components
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Components**: Comprehensive component library using shadcn/ui and Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js for REST API endpoints
- **Authentication**: Passport.js with local and JWT strategies, Google OAuth support
- **Session Management**: Express sessions with PostgreSQL storage
- **File Processing**: Express-fileupload for handling file uploads (CSV imports, etc.)

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection Pooling**: Neon Database serverless with WebSocket support
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Transaction Support**: Custom transaction manager for atomic operations

## Key Components

### Core CRM Features
- **Customer Management**: Complete customer profiles with activity tracking, segmentation, and lifecycle management
- **Lead Management**: Lead scoring, source tracking, status management, and conversion pipelines
- **Campaign Management**: Multi-channel campaign creation with A/B testing capabilities
- **Task Management**: Automated task creation and assignment with priority levels
- **Calendar Integration**: Event scheduling and management with reminder systems

### AI-Powered Features
- **Voice Commands**: Browser-based speech recognition for hands-free CRM operations
- **AI Assistant**: OpenAI-powered chat interface for intelligent CRM assistance
- **Campaign Suggestions**: AI-generated campaign recommendations based on customer data
- **Customer Insights**: Automated analysis of customer behavior and engagement patterns
- **Smart Email Personalization**: Dynamic content generation with token-based personalization

### Marketing Automation
- **Email Management**: Template-based email campaigns with personalization tokens
- **Marketing Forms**: Embeddable forms with tracking and analytics
- **Scheduled Communications**: Automated email scheduling and delivery
- **Web Tracking**: Visitor tracking and page view analytics
- **Lead Generation**: Automated lead capture and qualification

### Hybrid Usage Model
- **Tiered Access**: Free, Pro, and Enterprise tiers with usage limits
- **Personal API Keys**: Users can provide their own OpenAI and Mailgun keys
- **Usage Tracking**: Monitor AI prompts and email sending limits
- **Graceful Degradation**: System functions with or without AI capabilities

## Data Flow

### Authentication Flow
1. User registration/login through local credentials or Google OAuth
2. Session creation with PostgreSQL storage
3. JWT token generation for API access
4. Middleware-based route protection

### Voice Command Processing
1. Browser captures speech input via Web Speech API
2. Transcript sent to OpenAI for intent classification
3. Structured commands generated and executed
4. Real-time feedback provided to user interface

### Campaign Management Flow
1. Campaign creation with target audience definition
2. Message variant generation for A/B testing
3. Email template compilation with personalization
4. Scheduled delivery through Mailgun integration
5. Performance tracking and analytics collection

### Data Import/Export
1. CSV/JSON file upload and parsing
2. Field mapping interface for data transformation
3. Bulk database operations with validation
4. Error reporting and success confirmation

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4 integration for voice interpretation, campaign suggestions, and customer insights
- **Usage Model**: Hybrid approach supporting both shared and personal API keys

### Email Services
- **Mailgun**: Primary email delivery service with template support
- **SendGrid**: Alternative email provider (configured but not primary)
- **Email Templates**: Professional HTML templates with responsive design

### Authentication
- **Google OAuth**: Third-party authentication integration
- **Firebase Admin**: Token verification and user management
- **Passport.js**: Authentication middleware with multiple strategies

### Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and deployment platform
- **WebSocket Support**: Real-time features via ws library

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Hot Reload**: Vite development server with HMR
- **Database**: Automatic provisioning with Drizzle migrations
- **Port Configuration**: Frontend on 5000, proxied through Vite

### Production Build
- **Frontend**: Vite production build with optimization
- **Backend**: ESBuild compilation with external packages
- **Database**: Migration scripts for schema updates
- **Static Assets**: Served from dist/public directory

### Deployment Configuration
- **Platform**: Replit with autoscale deployment target
- **Build Process**: Automated build pipeline with npm scripts
- **Environment Variables**: Secure configuration management
- **Health Checks**: Port monitoring and application status

## Changelog

```
Changelog:
- January 23, 2025. Enhanced demo data labeling for better user experience
  - Added clear "Demo" badges with test tube icons throughout the lead management system
  - Customer segments now display "Demo" labels on sample data
  - Workflow automation shows demo indicators on sample workflows and execution logs
  - Lead scoring rules marked as "Demo Rule" examples
  - All demo descriptions include "Demo:" prefix for crystal clear distinction
- January 7, 2025. Fixed critical usage tracking and email security issues
  - Fixed email usage tracking bug where sent emails weren't incrementing usage counts
  - Enhanced email security - users now only see their own email logs (admin sees all)
  - Added userId tracking to all email sending methods (campaigns, direct emails, templates)
  - Updated campaign email sending to properly track user ID and increment usage
  - Fixed email logging database schema to include userId field for proper user-based filtering
- January 7, 2025. Enhanced hybrid API model with comprehensive domain validation
  - Added strict domain enforcement to prevent sandbox domain usage
  - Enhanced API key validation with clear error messages
  - Added domain validation alerts and user guidance
  - Fixed email domain enforcement to ensure all emails use mail.aicrm.co.uk
- June 16, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```