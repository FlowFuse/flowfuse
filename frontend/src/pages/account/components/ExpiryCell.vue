<template>
    <div class="flex items-center">
        <div>{{ expires }}</div>
    </div>
</template>
<script>
export default {
    name: 'ExpiryCell',
    props: ['expiresAt'],
    computed: {
        expires: function () {
            if (this.expiresAt) {
                const d = new Date(Date.parse(this.expiresAt))
                return d.toLocaleDateString()
            } else {
                return 'Never'
            }
        }
    }
}
</script>
