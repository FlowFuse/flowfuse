---
navTitle: FlowFuse Cloud Billing
meta:
  description: Learn about billing details for FlowFuse Cloud, including payment methods, team billing, billing cycles, managing instances, handling failed payments, and cancelling subscriptions.
  tags:
  - flowfuse
  - nodered
  - billing
  - payments
  - subscription
  - stripe
  - instances
  - team billing
  - billing cycle
  - failed payments
  - account management 
---

# Billing

## Payment Methods 

We will accept payments via credit or debit card only using Stripe as our payment
provider. All payments are processed in US Dollars.

## Team Billing

Each team has its own billing subscription that includes charges for the Node-RED
instances and Devices owned by the team.

## Billing Cycle

Starter plan teams are billed monthly on the anniversary of the team creation. You will receive one bill for each team.

For Team plan teams, Node-RED Instances and Devices are added as pro-rated charges on the current billing cycle and invoiced
at the end of the cycle.

## Removing Instances

For Team plan teams, when a Node-RED instance is deleted your account will receive pro-rated credit for the time remaining in the billing cycle.

## Suspended Instances

Suspended Node-RED instances have no running editor, nor a runtime. You are not charged for suspended instances.

For Team plan teams, when an instance is suspended your account will receive pro-rated credit for the time remaining in the billing cycle. When an
instance is restarted it will be charged for the remaining time in the billing cycle.

## Managing Billing Details

Click on "Billing" followed by "Stripe Customer Portal" to get a summary of the team's current subscription. You'll be redirected to
a Stripe customer portal where you can update customer details as: The credit card on file and the billing information.

## Failed Payments

If your payment fails for any reason you will receive a notification to the billing email address, you may need to login and update the card on file. 
Stripe will retry the payment several times over a number of days. If the card repeatedly fails your Node-RED instances will be suspended and a banner will be displayed at the top of the page for all users. An admin will need to update your card details to be able to create new instances or restart them.

## Cancelling your subscription

To cancel your subscription you can either delete or suspend your team; both options are available under the Team Settings page.

Deleting the team will remove all of the team's instances and devices - they cannot be recovered after being deleted.

Suspending the team will stop all of your team's instances and devices and cancel your subscription so no further charges are made. You will not be able to do anything more with the team whilst it is suspended. You can unsuspend the team in the future by setting up a new payment subscription.

When deleting the team, if you have outstanding credit you can request a refund via a [support ticket](/support/), include the Team ID in your email.
