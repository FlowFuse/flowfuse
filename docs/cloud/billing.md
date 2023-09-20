---
navTitle: FlowFuse Cloud Billing
---

# Billing

## Payment Methods 

We will accept payments via credit or debit card only using Stripe as our payment
provider. All payments are processed in US Dollars.

## Team Billing

Each team has a separate billing account and a free subscription for the team. Each Node-RED instance under the team is added to that subscription.
For each team you will need to setup the billing details for each time, though you can use the same card.

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

The settings tab of your Team page has a link to billing, on here you can see a summary of the teams current subscription.
There is also a link to the Stripe Customer Portal where you can change the payment card in use or the billing email address.

## Failed Payments

If your payment fails for any reason you will receive a notification to the billing email address, you may need to login and update the card on file. 
Stripe will retry the payment several times over a number of days. If the card repeatedly fails your Node-RED instances will be suspended and a banner will be displayed at the top of the page for all users. An admin will need to update your card details to be able create new instances or restart them.

## Cancelling your subscription

If you want to cancel your subscription with FlowFuse Cloud you will need to remove all Node-RED instances and then delete all teams from your account. If you have outstanding credit you can request a refund via a [support ticket](https://flowfuse.com/contact-us/).
