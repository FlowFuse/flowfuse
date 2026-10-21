<template>
    <div class="space-y-4" data-el="rollback-snapshot-dialog">
        <p>
            This will overwrite the current instance.
            All changes to the flows and settings made since the last snapshot will be lost.
        </p>
        <ff-checkbox
            v-model="keepEnvVars"
            data-form="keep-env-vars"
            label="Keep the instance's current environment variables"
        />
        <p class="text-sm">
            When ticked, environment variables from the snapshot are only added if the instance does not already have them.
            When unticked, the instance's environment variables are replaced by the snapshot's.
        </p>
        <p>Are you sure you want to deploy to this snapshot?</p>
    </div>
</template>

<script>
export default {
    name: 'RollbackSnapshotDialog',
    emits: ['keep-env-vars-changed'],
    data () {
        return {
            keepEnvVars: true
        }
    },
    watch: {
        keepEnvVars (value) {
            this.$emit('keep-env-vars-changed', value)
        }
    }
}
</script>
