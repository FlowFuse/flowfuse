---
navTitle: Overview
navOrder: 1
---
# Installing FlowFuse

FlowFuse can be installed to run in Docker or Kubernetes based environments.

 - [Docker Install Guide](/docs/install/docker/README.md)
 - [Kubernetes Install Guide](/docs/install/kubernetes/README.md)

We also provide one-click installs of the Docker version:

 - [Digital Ocean Docker Install Guide](/docs/install/docker/digital-ocean.md)
 - [AWS Docker Install Guide](/docs/install/docker/aws-marketplace.md)

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
        document.querySelector('.hbspt-form').style.display = 'none';
        GenerateLicense(data.submissionValues);
    }
});
</script>

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