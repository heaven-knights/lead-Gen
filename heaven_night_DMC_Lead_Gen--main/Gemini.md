
# Campaign → Scraping → Batching → Messaging Workflow

This document defines the complete end-to-end flow for how a client will use the system.

---
We are using supabase as Backend and frontend as react.
📘 **Product Requirements Document (PRD)**
==========================================

Campaign Automation Platform — Batch Architecture v2.0
------------------------------------------------------

1\. Product Overview
--------------------

### Product Name

Campaign Automation Platform (Batch-Based Outreach System)

### Version

v2.0 (Canonical Architecture)

### Owner

Product & Engineering Team

### Status

Active Specification

### Objective

Build a **fully automated lead outreach platform** that enables clients to:

> Create campaigns → Scrape leads → Filter data → Batch outreach → Send messages → Manage replies

with **zero manual execution steps**.

All complexity must be handled by the system.

2\. Problem Statement
---------------------

Current outreach tools suffer from:

*   Manual lead handling
    
*   Poor rate-limit control
    
*   No batch governance
    
*   Fragmented reply systems
    
*   Unreliable automation
    

This results in:

*   Low deliverability
    
*   Operational errors
    
*   Compliance risks
    
*   Poor UX
    

3\. Solution
------------

This platform provides:

*   End-to-end automation
    
*   Controlled batch execution
    
*   Real-time monitoring
    
*   Centralized reply management
    
*   Strict lifecycle governance
    

Every campaign follows **one enforced flow**.

4\. Target Users
----------------

### Primary Users

*   SMB owners
    
*   Agencies
    
*   Sales teams
    
*   Lead generation companies
    

### Admin Users

*   Platform administrators
    
*   Technical operators
    

5\. User Journey
----------------

### Primary Flow

1.  Login
    
2.  Create Campaign
    
3.  Start Scraping
    
4.  Review Filtered Data
    
5.  Configure Batches
    
6.  Start Messaging
    
7.  Monitor Progress
    
8.  Review Replies
    

No optional paths exist.

6\. Functional Requirements
---------------------------

### 6.1 Authentication

#### FR-01: User Login

*   Must use Supabase Auth
    
*   Must resolve org\_id
    
*   Block all data before auth
    

### 6.2 Campaign Management

#### FR-02: Create Campaign

Users must input:

*   Name
    
*   Location
    
*   Target leads
    
*   Niche
    
*   Batch size
    

System must:

*   Validate inputs
    
*   Lock form
    
*   Trigger scraping webhook
    

#### FR-03: Campaign Status Lifecycle

StatusMeaningdraftCreated, not startedscrapingScraping activereadyFiltered, batchedsendingMessaging activecompletedAll batches done

Status must update automatically.

Manual edits are forbidden.

### 6.3 Scraping & Filtration

#### FR-04: Scraping Engine

*   Triggered via webhook
    
*   Runs in n8n
    
*   Stores raw data
    

#### FR-05: Filtration

*   Removes invalid leads
    
*   Stores only clean data
    
*   Updates campaign totals
    

### 6.4 Batch Management

#### FR-06: Batch Creation

System must:

*   Auto-calculate batches
    
*   Assign leads
    
*   Persist batch records
    

#### FR-07: Batch Configuration

*   Client can set batch size
    
*   Only before sending
    
*   Locked after creation
    

### 6.5 Messaging System

#### FR-08: Start Messaging

On click:

*   Trigger webhook
    
*   Start automation job
    
*   Lock campaign
    

#### FR-09: Batch Sending

*   Sequential only
    
*   Respect caps
    
*   Track status
    

#### FR-10: Email Generation

*   Use templates
    
*   Personalize per lead
    
*   Validate deliverability
    

### 6.6 Progress Monitoring

#### FR-11: Live Progress

System must show:

*   Active batch
    
*   Sent / Failed
    
*   ETA
    

#### FR-12: Completion Popup

Mandatory blocking popup on batch completion.

### 6.7 Reply Management

#### FR-13: Reply Capture

*   Via n8n
    
*   Stored in DB
    
*   Synced in real time
    

#### FR-14: Reply View

*   Threaded display
    
*   Campaign-level view
    
*   Read-only
    

### 6.8 System Settings

#### FR-15: Admin Controls

Admins can manage:

*   API keys
    
*   Webhooks
    
*   Org settings
    

7\. Non-Functional Requirements
-------------------------------

### 7.1 Performance

MetricTargetPage load< 2sWebhook latency< 500msBatch start delay< 30s

### 7.2 Reliability

*   99.9% uptime
    
*   Automatic retry (max 3)
    
*   Failure logging
    

### 7.3 Security

*   JWT auth
    
*   Row-level security
    
*   Encrypted secrets
    
*   Audit logs
    

### 7.4 Scalability

*   Support 10k+ leads per campaign
    
*   Horizontal scaling
    
*   Async processing
    

8\. Database Requirements
-------------------------

System must use **Schema v2.0** only.

Removed tables must never reappear.

All relations enforced.

Foreign keys mandatory.

9\. API & Integration Requirements
----------------------------------

### 9.1 Webhooks

All major actions trigger webhooks.

Payload must include:

*   campaign\_id
    
*   batch\_id
    
*   job\_type
    
*   metadata
    

### 9.2 n8n Integration

All automation flows must run in n8n.

Local scripts are forbidden.

10\. UX Requirements
--------------------

### 10.1 Design Principles

*   Minimal clicks
    
*   No clutter
    
*   Clear status
    
*   Large confirmations
    

### 10.2 Forbidden UX Patterns

*   Manual send buttons
    
*   Lead editing
    
*   Global inbox
    
*   Manual retries
    

11\. Error Handling
-------------------

### FR-16: Error Management

System must:

*   Log errors
    
*   Show alerts
    
*   Halt flows
    
*   Require admin resolution
    

12\. Analytics & Reporting
--------------------------

### FR-17: System Metrics

Track:

*   Scrape success rate
    
*   Filter ratio
    
*   Send success
    
*   Reply rate
    
*   Failure rate
    

13\. Compliance & Governance
----------------------------

### FR-18: Workflow Enforcement

No feature may:

*   Bypass batching
    
*   Skip filtration
    
*   Enable manual sends
    
*   Override scheduler
    

Violations must be blocked.

14\. Acceptance Criteria
------------------------

### Campaign Creation

✅ Validates inputs✅ Triggers scraping✅ Locks UI

### Batch Execution

✅ Sequential sending✅ Popup shown✅ Status updated

### Reply Handling

✅ Auto-sync✅ Threaded view✅ Read-only

15\. Risks & Mitigations
------------------------

RiskImpactMitigationScraper blockedHighProxy rotationEmail bansHighWarmup + throttlingn8n failureMediumBackup workflowsDB overloadMediumIndexing

16\. Roadmap (Post v2.0)
------------------------

### Phase 3 (Future)

*   AI reply suggestions
    
*   CRM export
    
*   Lead scoring
    
*   Multi-channel outreach
    
*   WhatsApp/SMS
    

Not part of v2.0.

17\. Success Metrics (KPIs)
---------------------------

KPITargetDelivery Rate> 95%Reply Rate> 8%Failure Rate< 2%Campaign Setup Time< 3 min

18\. Final Authority
--------------------

This PRD is binding.

All development, testing, and deployment must comply.

No undocumented features allowed.
## 1. Campaign Creation & Scraping Setup

The first page the client sees is the **Campaign Creation Page**.

On this page, the client will:

* Campaign name
* Target location
* Number of leads/people to scrape
* Topic or niche for scraping
* Click **Start Scraping**

Once the user clicks **Start Scraping**:

* The backend scraping engine is triggered
* Campaign data is sent via webhook to n8n
* Data is collected
* Scraped data is stored in the database

---

## 2. Data Processing & Filtration

After scraping is complete:

1. Scraped data is processed inside n8n
2. Filtration is applied within n8n
3. Cleaned and validated data is sent to the database
4. The system reads the filtered data from the database

Example:

* Requested: 100 leads
* Scraped: 100 leads
* After filtering: 65 valid leads

This summary must be shown clearly to the client.

---

## 3. Batch Creation & Display

After filtration, the system will:

* Automatically split valid leads into batches
* Allow the client to set and customize the batch size per campaign
* Apply the campaign’s batch limit settings
* Generate Batch 1, Batch 2, Batch 3, etc.

The client must have an option inside each campaign to configure how many leads/emails are included in each batch.

Example:

* 65 leads
* Batch limit: 5/day (configurable by client)
* Total batches: 13

The UI must display:

* All batch numbers
* Lead count per batch
* Batch scheduling order
* Configured batch limit

---

## 4. Messaging & Email Sending

After reviewing the batches, the client can start outreach.

The client will click:

**Start Messaging / Start Emailing**

When clicked:

1. A webhook is triggered
2. The backend automation engine starts
3. Emails are generated
4. Messages are sent batch-by-batch based on schedule

Batch sending is handled entirely by the backend scheduler.

---

## 5. Backend Execution Engine

When messaging starts:

* The campaign job runs inside the processing engine
* Each batch is executed sequentially
* Rate limits and daily caps are respected
* Delivery status is tracked internally

---

## 6. Real-Time Progress & Completion Feedback

The system must provide clear feedback to the client.

For each batch:

* Show when sending starts
* Show when sending completes
* Show if any errors occur

When a batch is completed:

* Display a large confirmation popup on the screen
* Example:
  “Batch 2 Completed – 5 Emails Sent Successfully”

This popup must be clearly visible.

---

## 7. Post-Execution Display

After batch execution:

* The same campaign page should update automatically
* Completed batches should be visually marked
* Pending batches should remain scheduled
* Overall progress should be visible

No page switching should be required.

---

## 8. Technical Integration (Webhook System)

When the client clicks **Start Emailing**:

* A webhook is sent to the automation backend
* Payload includes:

  * Campaign ID
  * Batch configuration
  * Scheduling rules
  * Message templates

The backend uses this payload to start execution.

---

## 8. Phase 2 – Reply Management & Conversation View

After the email sending phase is completed, the system enters Phase 2: Reply Handling.

When prospects reply to emails:

* Replies are captured and processed inside n8n
* Reply data is sent to the database
* The frontend reads replies from the database
* Replies are displayed in real time inside the campaign

### Campaign Reply View

When the user opens a campaign card in Phase 2:

* Batch cards are no longer shown
* A dedicated Reply View is displayed instead
* All replies for that campaign appear in a list view
* Each reply shows the full message thread and contact details

Example View:

* Campaign: Agra Outreach 01
* Reply List:

  * Company A → Message Thread
  * Company B → Message Thread
  * Company C → Message Thread

This view focuses only on conversations and responses, not batch execution.

All reply-related data must come from the database synced by n8n.

---

## 9. UX Principle

The system should be designed so that:

* The client sets everything once
* Clicks Start
* Monitors progress
* Receives completion confirmations

No complex manual management is required.

---

## 10. Key Rule

All documentation, system prompts, backend logic, UI components, and database structures must follow this workflow exactly.

No old scraping, batching, or messaging logic should remain in the system.

---

# 📦 Final Database Schema Reference (v2.0 – Batch Architecture)

---

## 1️⃣ organizations (UNCHANGED)

No structural changes.

---

## 2️⃣ profiles (UNCHANGED)

No structural changes.

---

## 3️⃣ campaigns (SIMPLIFIED + BATCH CONFIG ADDED)

**Purpose:** Stores campaign configuration & batch rules.

| Column         | Type        | Description                                    |
| -------------- | ----------- | ---------------------------------------------- |
| id             | uuid (PK)   | Campaign ID                                    |
| org_id         | uuid (FK)   | Organization ID                                |
| name           | text        | Campaign name                                  |
| location       | text        | Target location                                |
| niche          | text        | Scraping topic/niche                           |
| target_leads   | int         | Requested leads                                |
| batch_size     | int         | Leads per batch                                |
| total_scraped  | int         | Raw scraped count                              |
| total_filtered | int         | Valid leads after filtration                   |
| total_batches  | int         | Calculated batch count                         |
| status         | enum        | draft / scraping / ready / sending / completed |
| created_at     | timestamptz | Created time                                   |
| updated_at     | timestamptz | Last update                                    |
| deleted_at     | timestamptz | Soft delete                                    |

### 🔥 Removed

* category
* started_at / ended_at
* campaign_runs dependency

---

## ❌ REMOVED TABLE: campaign_runs

Not needed anymore. Campaign is continuous lifecycle-based.

---

## 4️⃣ batches (NEW – CORE TABLE)

**Purpose:** Stores batch execution units per campaign.

| Column        | Type        | Description                                        |
| ------------- | ----------- | -------------------------------------------------- |
| id            | uuid (PK)   | Batch ID                                           |
| org_id        | uuid (FK)   | Organization ID                                    |
| campaign_id   | uuid (FK)   | Campaign ID                                        |
| batch_number  | int         | Sequence number                                    |
| lead_count    | int         | Leads in this batch                                |
| status        | enum        | pending / scheduled / sending / completed / failed |
| scheduled_for | timestamptz | Scheduled send time                                |
| started_at    | timestamptz | Execution start                                    |
| completed_at  | timestamptz | Execution end                                      |
| created_at    | timestamptz | Created time                                       |

Replaces lead followups, run-based tracking, email_type logic.

---

## 5️⃣ leads (SIMPLIFIED – NO STATUS)

**Purpose:** Stores filtered leads only.

| Column        | Type        | Description      |
| ------------- | ----------- | ---------------- |
| id            | uuid (PK)   | Lead ID          |
| org_id        | uuid (FK)   | Organization ID  |
| campaign_id   | uuid (FK)   | Campaign ID      |
| batch_id      | uuid (FK)   | Batch ID         |
| company_name  | text        | Company name     |
| primary_email | text        | Email            |
| primary_phone | text        | Phone            |
| website       | text        | Website          |
| city          | text        | City             |
| country       | text        | Country          |
| rating        | numeric     | Google rating    |
| reviews_count | int         | Review count     |
| place_id      | text        | Google ID        |
| raw_data      | jsonb       | Raw scraped data |
| created_at    | timestamptz | Created time     |

### 🔥 Removed

* status enum
* sales_notes
* quality_score
* last_contacted_at
* deleted_at
* enrichment fields
* secondary_email
* lead_profiles dependency

---

## ❌ REMOVED TABLE: lead_profiles

Research/enrichment system removed. Raw scrape stored in leads.raw_data.

---

## 6️⃣ email_templates (UNCHANGED – MINOR CLEANUP)

Same structure.

---

## 7️⃣ email_messages (SIMPLIFIED – BATCH LINK ADDED)

| Column      | Type        | Description            |
| ----------- | ----------- | ---------------------- |
| id          | uuid (PK)   | Email ID               |
| org_id      | uuid (FK)   | Organization ID        |
| campaign_id | uuid (FK)   | Campaign ID            |
| batch_id    | uuid (FK)   | Batch ID               |
| lead_id     | uuid (FK)   | Lead ID                |
| to_email    | text        | Recipient              |
| subject     | text        | Subject                |
| body        | text        | Body                   |
| provider_id | text        | Email provider ID      |
| status      | enum        | queued / sent / failed |
| sent_at     | timestamptz | Sent time              |
| created_at  | timestamptz | Created time           |

### 🔥 Removed

* run_id
* email_type
* followup references

---

## 8️⃣ replies (UPDATED FOR CAMPAIGN VIEW)

| Column         | Type        | Description              |
| -------------- | ----------- | ------------------------ |
| id             | uuid (PK)   | Reply ID                 |
| org_id         | uuid (FK)   | Organization ID          |
| campaign_id    | uuid (FK)   | Campaign ID              |
| lead_id        | uuid (FK)   | Lead ID                  |
| email_id       | uuid (FK)   | Email ID                 |
| from_email     | text        | Sender                   |
| content        | text        | Reply body               |
| message_thread | jsonb       | Full conversation thread |
| received_at    | timestamptz | Received time            |
| created_at     | timestamptz | Created time             |

Replies are captured by n8n and shown in campaign reply view.

---

## ❌ REMOVED TABLE: lead_followups

Follow-up lifecycle removed.

---

## 9️⃣ automation_jobs (SIMPLIFIED)

| Column      | Type        | Description                            |
| ----------- | ----------- | -------------------------------------- |
| id          | uuid (PK)   | Job ID                                 |
| org_id      | uuid (FK)   | Organization ID                        |
| campaign_id | uuid (FK)   | Campaign ID                            |
| batch_id    | uuid (FK)   | Batch ID                               |
| type        | text        | scrape / filter / send / reply_sync    |
| status      | enum        | pending / running / completed / failed |
| error       | text        | Error message                          |
| started_at  | timestamptz | Start time                             |
| ended_at    | timestamptz | End time                               |
| created_at  | timestamptz | Created time                           |

---

## 🔟 automation_events (UPDATED)

| Column      | Type        | Description     |
| ----------- | ----------- | --------------- |
| id          | uuid (PK)   | Event ID        |
| org_id      | uuid (FK)   | Organization ID |
| campaign_id | uuid (FK)   | Campaign ID     |
| batch_id    | uuid (FK)   | Batch ID        |
| lead_id     | uuid (FK)   | Lead ID         |
| event_type  | text        | Event name      |
| payload     | jsonb       | Event data      |
| created_at  | timestamptz | Created time    |

---

# 📘 UI Page Specification — Canonical (v2.0)

This section defines every allowed page, its purpose, inputs, outputs, and constraints.

No additional pages may be introduced without updating this specification.

---

## 1️⃣ Login / Access Page

### Purpose

Authenticate users and scope access to `org_id`.

### Rules

* Must use Supabase Auth
* Must resolve `org_id` before loading any data
* No campaign data visible before auth

---

## 2️⃣ Campaign List Page (Home / Landing)

### Purpose

Primary dashboard after login.

### Displays

Each campaign card must show:

* Campaign name
* Target location
* Total scraped
* Total filtered
* Total batches
* Completed batches
* Pending batches
* Current status

### Actions

* Create Campaign
* Open Campaign
* Soft Delete Campaign

### Forbidden

* Global lead list
* Global email stats
* Global reply stats

---

## 3️⃣ Campaign Creation Page

### Purpose

Collect campaign configuration and start scraping.

### Inputs

* Campaign name (required)
* Target location (required)
* Target leads (required)
* Topic / niche (required)
* Batch size (optional, default 5)

### Primary Action

**Start Scraping**

### Behavior

* Validate inputs
* Send webhook to n8n
* Lock form after submission
* Show “Scraping in progress” state

---

## 4️⃣ Campaign Overview Page (Pre-Sending)

### Purpose

Central management screen before outreach.

### Displays

* Campaign summary panel
* Requested vs Filtered leads
* Batch configuration
* Batch table

### Batch Table Columns

* Batch number
* Lead count
* Scheduled time
* Status

### Actions

* Edit batch schedule (if pending)
* Start Messaging

### Forbidden

* Lead status filters
* Manual lead editing
* Manual sending

---

## 5️⃣ Batch Detail Page

### Purpose

Inspect leads inside a batch.

### Displays

Per lead:

* Company name
* Primary email
* Phone
* Website
* Raw data (expandable)

### Behavior

* Read-only
* No status editing
* No filters
* No bulk actions

---

## 6️⃣ Sending Progress Page

### Purpose

Monitor active batch execution.

### Displays

* Current batch
* Progress bar
* Sent count
* Failed count
* ETA

### Behavior

* Live updates via DB polling
* No manual override

### Mandatory Popup

On batch completion:

`Batch X Completed — Y Emails Sent Successfully`

Must block UI until acknowledged.

---

## 7️⃣ Campaign Reply Page (Phase 2 View)

### Purpose

Handle incoming replies.

### Activated When

At least one reply exists for campaign OR campaign status = completed.

### Displays

Reply list:

* Company name
* Last message preview
* Timestamp

Thread view:

* Full message history
* Sender/receiver markers
* Timestamps

### Behavior

* Data source = replies table
* Synced by n8n
* Read-only for now (unless extended later)

### Forbidden

* Batch view
* Lead filters
* Global inbox

---

## 8️⃣ System Settings Page (Admin Only)

### Purpose

Configure integration and security.

### Displays

* API keys
* Webhook status
* Org settings
