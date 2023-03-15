# Billing

## Payment Methods 

We will accept payments via credit or debit card only using Stripe as our payment
provider. All payments are processed in US Dollars.

## Team Billing

Each team has a separate billing account and a free subscription for the team. Each Node-RED instance under the team is added to that subscription.
For each team you will need to setup the billing details for each time, though you can use the same card.

## Billing Cycle

Teams are billed monthly on the anniversary of the team creation. You will receive one bill for each team. Node-RED instances are billed in advance for the coming month. If an instance is added during the billing cycle then a new charge is made for a full month and a pro-rated credit is then applied to the invoice on the next cycle for the unused time.

## Removing Instances

When a Node-RED instance is deleted you will receive a pro-rated credit for the time remaining in the billing cycle, which is used against a future invoice.

## Suspended Instances

Suspended Node-RED instances have no running editor, nor a runtime. You are not charged for suspended instances.
When an instance is suspended your account will receive a credit for the time remaining in the billing cycle.
When an instance is started up again then you will be billed for the remaining seconds in the teams billing cycle, any credit on the account from the instance being suspended will be used towards this charge first.

## Managing Billing Details

The settings tab of your Team page has a link to billing, on here you can see a summary of the teams current subscription.
There is also a link to the Stripe Customer Portal where you can change the payment card in use or the billing email address.

## Failed Payments

If your payment fails for any reason you will receive a notification to the billing email address, you may need to login and update the card on file. 
Stripe will retry the payment several times over a number of days. If the card repeatedly fails your Node-RED instances will be suspended and a banner will be displayed at the top of the page for all users. An admin will need to update your card details to be able create new instances or restart them.

## Cancelling your subscription

If you want to cancel your subscription with FlowForge Cloud you will need to remove all Node-RED instances and then delete all teams from your account. If you have outstanding credit you can request a refund via a [support ticket](https://flowforge.com/contact-us/).
