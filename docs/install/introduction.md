---
navTitle: Overview
navOrder: 1
---
# Installing FlowFuse

FlowFuse can be installed on most Linux distributions, Windows, and MacOS.

It provides three models for how to run and manage the individual Node-RED instances
it creates. Choosing the right model is important based on how you plan to use
the platform.

## Request a Trial Enterprise License

Experience the full capabilities of FlowFuse by obtaining a complimentary 30-day Enterprise license. This trial offers you an opportunity to thoroughly evaluate the features and functionalities of FlowFuse in your environment. To begin your trial, simply complete the form below.

<div id="license-message"></div>

<script charset="utf-8" type="text/javascript" src="//js-eu1.hsforms.net/forms/embed/v2.js"></script>
<script>
function GenerateLicense(formData) {
    if (formData) {
        const jsonData = typeof formData === 'object' ? JSON.stringify(formData) : formData;

        fetch('https://energetic-sanderling-4472.flowfuse.cloud/license/trial', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: jsonData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const messageElement = document.getElementById('license-message');
            if (messageElement) {
                messageElement.innerHTML = `<p><strong>Thank you for requesting a trial license. Below is your license key. Please copy it and save it securely, as it will not be available again if you leave, come back, or refresh the screen:</strong></p><code style="display:block;overflow-wrap: anywhere;padding: 10px;border: 1px solid lightgray;margin-top: 10px;"">${data[0].license}</code>`;

            } else {
                console.error('Message element not found');
            }
        })
        .catch(error => {
            const messageElement = document.getElementById('license-message');
            if (messageElement) {
                messageElement.textContent = 'Error generating license. Please try again later.';
            } else {
                console.error('Message element not found');
            }
        });
    }
}

hbspt.forms.create({
    region: "eu1",
    portalId: "26586079",
    formId: "41e858e1-6756-45be-9082-3980237fa229",
    onFormSubmitted: function ($form, data) {
        GenerateLicense(data.submissionValues);
    }
});
</script>

## One-Click Docker Installer

<a href="https://marketplace.digitalocean.com/apps/flowforge"><img src="https://upload.wikimedia.org/wikipedia/commons/f/ff/DigitalOcean_logo.svg"  width="150" height="75"></a>

See also the [Digital Ocean Step by Step Manual](/docs/install/docker/digital-ocean.md)

<br>
<a href="https://aws.amazon.com/marketplace/pp/prodview-3ycrknfg67rug?sr=0-1&ref_=beagle&applicationId=AWSMPContessa"><img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"  width="150" height="75"></a>

See also the [AWS Step by Step Manual](/docs/install/docker/aws-marketplace.md)
## Deployment Models

Model      | Description        
-----------|--------------------
[Local](/docs/install/local/README.md)           | Runs the Node-RED instances on the same machine running the core FlowFuse application. The instances are exposed on different TCP ports. This is intended for smaller deployments, such as for evaluation, or personal use.
[Docker](/docs/install/docker/README.md)         | Run the platform in a Docker Compose based environment.
[Kubernetes](/docs/install/kubernetes/README.md) | Run the platform in a full Kubernetes based environment.


If you are just getting started with FlowFuse and want to evaluate what it can do,
we recommend starting with the [Local model](/docs/install/local/README.md).

## Upgrading FlowFuse

If you are upgrading FlowFuse, please refer to the [Upgrade Guide](/docs/upgrade/README.md)
for any specific actions required.

## Do You Need Help? Installation Service

If you need assistance, request our complimentary Installation Service, and we will help you install FlowFuse.

<script charset="utf-8" type="text/javascript" src="//js-eu1.hsforms.net/forms/embed/v2.js"></script>
<script>
  hbspt.forms.create({
    region: "eu1",
    portalId: "26586079",
    formId: "22edc659-d098-4767-aeb1-6480daae41ad"
  });
</script>
