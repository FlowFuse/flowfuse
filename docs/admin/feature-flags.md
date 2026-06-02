---
navTitle: Soft Launch Enablement
meta:
  description: How to enable soft-launched features for specific teams using PostHog feature flags.
  tags:
     - flowfuse
     - feature flags
     - posthog
     - soft launch
---

# Enabling Soft-Launched Features for Specific Teams

During a soft launch campaign, new features are gated behind PostHog feature flags
and enabled on a per-team basis. This guide describes the process for enabling a
feature flag for a specific team on FlowFuse Cloud.

## Process

### 1. Change Request

A change request is created in the **CloudProject** repository. The request must include:

- The **internal team ID** of the team that needs the feature enabled
- The **feature** that needs enabling

### 2. Identify the Feature Flag Key

The developer or admin handling the request should know which PostHog feature flag
key gates the requested feature. If unsure, ask in the **Slack engineering channel**.

### 3. Update the Feature Flag in PostHog

1. Log into **PostHog** on the **production project**
2. In the left-hand menu, navigate to **Features > Feature Flags**
3. Find the relevant feature flag key in the list and open it for editing

### 4. Add a Release Condition

Under **Release conditions**, add a new condition set for the team:

1. Click to add a new condition set
2. Give the condition set a **description** — use the team or customer name for
   readability (see [Organizing Condition Sets](#organizing-condition-sets) below)
3. Add a filter: **`team-id`** — **equals** — **`<given-team-id>`**
4. Set the **rollout percentage** to **100%**
5. **Save** the feature flag

### 5. Verify and Close

- Verify that the feature flag change is reflected on **production/cloud** — confirm
  the team now has access to the feature
- Once verified, close the change request in the CloudProject repository

## Organizing Condition Sets

When adding release conditions, prefer **one condition set per customer**. If a
customer has multiple teams, group them under the same condition set. This approach
keeps things readable because each condition set can have a description identifying
the customer, avoiding the need to track and correlate raw team IDs.

If the feature flag already has existing condition sets, follow the pattern that was
established when the flag was first created. Use your judgement on the best approach
— the goal is to keep the list of conditions manageable and easy to audit.
