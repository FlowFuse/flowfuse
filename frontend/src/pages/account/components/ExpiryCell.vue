<template>
    <div class="flex items-center">
        <div>{{ expires }}</div>
    </div>
</template>
<script>
export default {
    name: 'ExpiryCell',
    props: [ 'expiresAt' ],
    computed: {
        expires: function () {
            if (this.expiresAt) {
                try {
                    const d = new Date(Date.parse(this.expiresAt))
                    return d.toLocaleDateString()
                } catch (err) {
                    console.error(err)
                }
            } else {
                return 'Never'
            }
        }
    }
}
</script>
