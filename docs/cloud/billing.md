# Billing

## Payment Methods 

We will accept payments via credit or debit card only using Stripe as our payment
provider. All payments are processed in US Dollars.

## Team Billing

Each team has a separate billing account and a subscription for the team. Currently the team subscription is free and then each project under the team is added to that subscription.
If you have more than one team you will currently need to setup separate billing details for each one, but you can use the same card.

## Billing Cycle

Teams are billed monthly on the anniversary of the team creation. You will receive one bill for each team. Projects are billed in advance for the coming month. 
If a project is added during the billing cycle then a new charge is made for a full month and a pro-rated credit is then applied to the invoice on the next cycle for the unused time.

## Removing Projects

If you delete a project but still have other projects on their account you will receive a pro-rated credit for the number of whole days remaining in the billing cycle, which is used against a future invoice.
If you delete your final project you will receive a pro-rated refund for the number of days remaining.
The minimum cost for a project that is created and then deleted will be one day.

## Stopped Projects

Currently stopped projects are still charged as normal because the container is still running. 
We hope to offer the ability to suspend a project in a future release, please see
[the GitHub issue](https://github.com/flowforge/flowforge/issues/377).

## Managing Billing Details

The settings tab of your Team page has a link to Billing, on here you can see a summary of the teams current subscription.
There is also a link to the Stripe Customer Portal where you can change the payment card in use or the billing email address.

## Failed Payments

If your payment fails for any reason you will receive a notification to the billing email address, you may need to login and update the card on file. 
Stripe will retry the payment several times over a number of days. If the card repeatedly fails we may have to suspend your account.
