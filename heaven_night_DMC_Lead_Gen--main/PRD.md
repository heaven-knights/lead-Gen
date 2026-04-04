📘 \*\*Product Requirements Document (PRD)\*\*

==========================================



Campaign Automation Platform — Batch Architecture v2.0

------------------------------------------------------



1\\. Product Overview

--------------------



\### Product Name



Campaign Automation Platform (Batch-Based Outreach System)



\### Version



v2.0 (Canonical Architecture)



\### Owner



Product \& Engineering Team



\### Status



Active Specification



\### Objective



Build a \*\*fully automated lead outreach platform\*\* that enables clients to:



> Create campaigns → Scrape leads → Filter data → Batch outreach → Send messages → Manage replies



with \*\*zero manual execution steps\*\*.



All complexity must be handled by the system.



2\\. Problem Statement

---------------------



Current outreach tools suffer from:



\*   Manual lead handling

&nbsp;   

\*   Poor rate-limit control

&nbsp;   

\*   No batch governance

&nbsp;   

\*   Fragmented reply systems

&nbsp;   

\*   Unreliable automation

&nbsp;   



This results in:



\*   Low deliverability

&nbsp;   

\*   Operational errors

&nbsp;   

\*   Compliance risks

&nbsp;   

\*   Poor UX

&nbsp;   



3\\. Solution

------------



This platform provides:



\*   End-to-end automation

&nbsp;   

\*   Controlled batch execution

&nbsp;   

\*   Real-time monitoring

&nbsp;   

\*   Centralized reply management

&nbsp;   

\*   Strict lifecycle governance

&nbsp;   



Every campaign follows \*\*one enforced flow\*\*.



4\\. Target Users

----------------



\### Primary Users



\*   SMB owners

&nbsp;   

\*   Agencies

&nbsp;   

\*   Sales teams

&nbsp;   

\*   Lead generation companies

&nbsp;   



\### Admin Users



\*   Platform administrators

&nbsp;   

\*   Technical operators

&nbsp;   



5\\. User Journey

----------------



\### Primary Flow



1\.  Login

&nbsp;   

2\.  Create Campaign

&nbsp;   

3\.  Start Scraping

&nbsp;   

4\.  Review Filtered Data

&nbsp;   

5\.  Configure Batches

&nbsp;   

6\.  Start Messaging

&nbsp;   

7\.  Monitor Progress

&nbsp;   

8\.  Review Replies

&nbsp;   



No optional paths exist.



6\\. Functional Requirements

---------------------------



\### 6.1 Authentication



\#### FR-01: User Login



\*   Must use Supabase Auth

&nbsp;   

\*   Must resolve org\\\_id

&nbsp;   

\*   Block all data before auth

&nbsp;   



\### 6.2 Campaign Management



\#### FR-02: Create Campaign



Users must input:



\*   Name

&nbsp;   

\*   Location

&nbsp;   

\*   Target leads

&nbsp;   

\*   Niche

&nbsp;   

\*   Batch size

&nbsp;   



System must:



\*   Validate inputs

&nbsp;   

\*   Lock form

&nbsp;   

\*   Trigger scraping webhook

&nbsp;   



\#### FR-03: Campaign Status Lifecycle



StatusMeaningdraftCreated, not startedscrapingScraping activereadyFiltered, batchedsendingMessaging activecompletedAll batches done



Status must update automatically.



Manual edits are forbidden.



\### 6.3 Scraping \& Filtration



\#### FR-04: Scraping Engine



\*   Triggered via webhook

&nbsp;   

\*   Runs in n8n

&nbsp;   

\*   Stores raw data

&nbsp;   



\#### FR-05: Filtration



\*   Removes invalid leads

&nbsp;   

\*   Stores only clean data

&nbsp;   

\*   Updates campaign totals

&nbsp;   



\### 6.4 Batch Management



\#### FR-06: Batch Creation



System must:



\*   Auto-calculate batches

&nbsp;   

\*   Assign leads

&nbsp;   

\*   Persist batch records

&nbsp;   



\#### FR-07: Batch Configuration



\*   Client can set batch size

&nbsp;   

\*   Only before sending

&nbsp;   

\*   Locked after creation

&nbsp;   



\### 6.5 Messaging System



\#### FR-08: Start Messaging



On click:



\*   Trigger webhook

&nbsp;   

\*   Start automation job

&nbsp;   

\*   Lock campaign

&nbsp;   



\#### FR-09: Batch Sending



\*   Sequential only

&nbsp;   

\*   Respect caps

&nbsp;   

\*   Track status

&nbsp;   



\#### FR-10: Email Generation



\*   Use templates

&nbsp;   

\*   Personalize per lead

&nbsp;   

\*   Validate deliverability

&nbsp;   



\### 6.6 Progress Monitoring



\#### FR-11: Live Progress



System must show:



\*   Active batch

&nbsp;   

\*   Sent / Failed

&nbsp;   

\*   ETA

&nbsp;   



\#### FR-12: Completion Popup



Mandatory blocking popup on batch completion.



\### 6.7 Reply Management



\#### FR-13: Reply Capture



\*   Via n8n

&nbsp;   

\*   Stored in DB

&nbsp;   

\*   Synced in real time

&nbsp;   



\#### FR-14: Reply View



\*   Threaded display

&nbsp;   

\*   Campaign-level view

&nbsp;   

\*   Read-only

&nbsp;   



\### 6.8 System Settings



\#### FR-15: Admin Controls



Admins can manage:



\*   API keys

&nbsp;   

\*   Webhooks

&nbsp;   

\*   Org settings

&nbsp;   



7\\. Non-Functional Requirements

-------------------------------



\### 7.1 Performance



MetricTargetPage load< 2sWebhook latency< 500msBatch start delay< 30s



\### 7.2 Reliability



\*   99.9% uptime

&nbsp;   

\*   Automatic retry (max 3)

&nbsp;   

\*   Failure logging

&nbsp;   



\### 7.3 Security



\*   JWT auth

&nbsp;   

\*   Row-level security

&nbsp;   

\*   Encrypted secrets

&nbsp;   

\*   Audit logs

&nbsp;   



\### 7.4 Scalability



\*   Support 10k+ leads per campaign

&nbsp;   

\*   Horizontal scaling

&nbsp;   

\*   Async processing

&nbsp;   



8\\. Database Requirements

-------------------------



System must use \*\*Schema v2.0\*\* only.



Removed tables must never reappear.



All relations enforced.



Foreign keys mandatory.



9\\. API \& Integration Requirements

----------------------------------



\### 9.1 Webhooks



All major actions trigger webhooks.



Payload must include:



\*   campaign\\\_id

&nbsp;   

\*   batch\\\_id

&nbsp;   

\*   job\\\_type

&nbsp;   

\*   metadata

&nbsp;   



\### 9.2 n8n Integration



All automation flows must run in n8n.



Local scripts are forbidden.



10\\. UX Requirements

--------------------



\### 10.1 Design Principles



\*   Minimal clicks

&nbsp;   

\*   No clutter

&nbsp;   

\*   Clear status

&nbsp;   

\*   Large confirmations

&nbsp;   



\### 10.2 Forbidden UX Patterns



\*   Manual send buttons

&nbsp;   

\*   Lead editing

&nbsp;   

\*   Global inbox

&nbsp;   

\*   Manual retries

&nbsp;   



11\\. Error Handling

-------------------



\### FR-16: Error Management



System must:



\*   Log errors

&nbsp;   

\*   Show alerts

&nbsp;   

\*   Halt flows

&nbsp;   

\*   Require admin resolution

&nbsp;   



12\\. Analytics \& Reporting

--------------------------



\### FR-17: System Metrics



Track:



\*   Scrape success rate

&nbsp;   

\*   Filter ratio

&nbsp;   

\*   Send success

&nbsp;   

\*   Reply rate

&nbsp;   

\*   Failure rate

&nbsp;   



13\\. Compliance \& Governance

----------------------------



\### FR-18: Workflow Enforcement



No feature may:



\*   Bypass batching

&nbsp;   

\*   Skip filtration

&nbsp;   

\*   Enable manual sends

&nbsp;   

\*   Override scheduler

&nbsp;   



Violations must be blocked.



14\\. Acceptance Criteria

------------------------



\### Campaign Creation



✅ Validates inputs✅ Triggers scraping✅ Locks UI



\### Batch Execution



✅ Sequential sending✅ Popup shown✅ Status updated



\### Reply Handling



✅ Auto-sync✅ Threaded view✅ Read-only



15\\. Risks \& Mitigations

------------------------



RiskImpactMitigationScraper blockedHighProxy rotationEmail bansHighWarmup + throttlingn8n failureMediumBackup workflowsDB overloadMediumIndexing



16\\. Roadmap (Post v2.0)

------------------------



\### Phase 3 (Future)



\*   AI reply suggestions

&nbsp;   

\*   CRM export

&nbsp;   

\*   Lead scoring

&nbsp;   

\*   Multi-channel outreach

&nbsp;   

\*   WhatsApp/SMS

&nbsp;   



Not part of v2.0.



17\\. Success Metrics (KPIs)

---------------------------



KPITargetDelivery Rate> 95%Reply Rate> 8%Failure Rate< 2%Campaign Setup Time< 3 min



18\\. Final Authority

--------------------



This PRD is binding.



All development, testing, and deployment must comply.



No undocumented features allowed.

