<template>
    <ff-dialog
        ref="dialog"
        data-el="deploy-stage-dialog"
        :header="`Push to &quot;${target?.name}&quot;`"
    >
        <template #default>
            <p>Are you sure you want to push from "{{ stage.name }}" to "{{ target?.name }}"?</p>
            <p class="my-4">This will copy over all flows, nodes and credentials from "{{ stage.name }}".</p>
            <template v-if="target?.deployToDevices">
                <p class="my-4">And push out the changes to all devices connected to "{{ target?.name }}".</p>
            </template>
            <p class="my-4">It will also transfer the keys of any newly created Environment Variables that your target instance does not currently have.</p>
        </template>
        <template #actions>
            <ff-button kind="secondary" @click="$refs['dialog'].close()">Cancel</ff-button>
            <ff-button :disabled="!formValid" @click="confirm(); $refs.dialog.close()">Confirm</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
export default {
    name: 'DeployStageDialog',
    props: {
        stage: {
            required: true,
            type: Object
        }
    },
    emits: ['deploy-stage'],
    setup () {
        return {
            show (target) {
                this.target = target

                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            target: null
        }
    },
    computed: {
        formValid () {
            return this.target !== null
        }
    },
    methods: {
        close () {
            this.$refs.dialog.close()
        },
        confirm () {
            this.$emit('deploy-stage', this.target)
        }
    }
}
</script>
