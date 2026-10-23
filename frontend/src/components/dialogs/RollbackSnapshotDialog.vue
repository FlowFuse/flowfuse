<template>
    <div class="space-y-4" data-el="rollback-snapshot-dialog">
        <p>
            This will overwrite the current instance.
            All changes to the flows and settings made since the last snapshot will be lost.
        </p>
        <ff-radio-group
            v-model="envVarsMode"
            data-form="env-vars-mode"
            label="Environment variables"
            orientation="vertical"
            multiline-description
            :options="envVarsOptions"
        />
        <p>Are you sure you want to deploy to this snapshot?</p>
    </div>
</template>

<script>
export default {
    name: 'RollbackSnapshotDialog',
    emits: ['merge-env-vars-changed'],
    data () {
        return {
            envVarsMode: 'merge',
            envVarsOptions: [
                {
                    value: 'merge',
                    label: 'Merge',
                    description: 'Adds variables from the snapshot that the instance doesn\'t have.\nVariables the instance already has keep their current values, and none are removed.'
                },
                {
                    value: 'replace',
                    label: 'Replace',
                    description: 'The instance\'s variables become exactly the snapshot\'s.\nMissing ones are added, existing ones take the snapshot\'s values, and ones not in the snapshot are removed.'
                }
            ]
        }
    },
    watch: {
        envVarsMode (value) {
            this.$emit('merge-env-vars-changed', value === 'merge')
        }
    }
}
</script>
