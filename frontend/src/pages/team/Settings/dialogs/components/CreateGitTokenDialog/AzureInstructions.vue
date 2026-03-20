<template>
    <section>
        <p>Azure DevOps instructions coming soon.</p>
        <ol class="list-decimal list-inside space-y-1 ml-2 mt-2">
            <li>Open <code>https://dev.azure.com/[org-name]/_usersSettings/tokens</code> to create a new Personal Access Token</li>
            <li>Click the <strong>+ New Token</strong> button</li>
            <li>Give the token a name and set the Expiry date</li>
            <li>Select <strong>Custom defined</strong> for the Scopes</li>
            <li>Check the <strong>Read &amp; Write</strong> in the <strong>Code</strong> section</li>
            <li>Hit <strong>Save</strong></li>
            <li>This will be the only time Azure shows you the token value. Copy the token into the field below</li>
        </ol>
    </section>
</template>

<script>
export default {
    name: 'AzureInstructions',
    inheritAttrs: false
}
</script>
