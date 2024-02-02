<template>
    <label class="!inline-block italic text-gray-400 text-sm whitespace-nowrap flex-shrink-0 flex-grow-0">
        {{ label }}
    </label>
</template>

<script>
export default {
    name: 'ApplicationSummaryLabel',
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    computed: {
        label () {
            const parts = []

            if (this.application.instanceCount > 0) {
                parts.push(`${this.application.instanceCount} Instance${this.application.instanceCount === 1 ? '' : 's'}`)
            }

            if (this.application.deviceCount > 0) {
                parts.push(`${this.application.deviceCount} Device${this.application.deviceCount === 1 ? '' : 's'}`)
            }

            if (this.application.deviceGroupCount > 0) {
                parts.push(`${this.application.deviceGroupCount} Device Group${this.application.deviceGroupCount === 1 ? '' : 's'}`)
            }

            if (this.application.snapshotCount > 0) {
                parts.push(`${this.application.snapshotCount} Snapshot${this.application.snapshotCount === 1 ? '' : 's'}`)
            }

            if (this.application.pipelineCount > 0) {
                parts.push(`${this.application.pipelineCount} Pipeline${this.application.pipelineCount === 1 ? '' : 's'}`)
            }

            return parts.join(', ')
        }
    }
}
</script>
