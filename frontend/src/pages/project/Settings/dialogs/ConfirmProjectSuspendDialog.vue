<template>
    <ff-dialog ref="dialog" header="Suspend Project" kind="danger" confirm-label="Suspend" @confirm="confirm()">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p>
                        Are you sure you want to suspend this project?
                    </p>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'ConfirmProjectSuspendDialog',
    components: {
    },
    data () {
        return {
            project: null
        }
    },

    methods: {
        confirm () {
            this.$emit('suspendProject')
        }
    },
    setup () {
        return {
            show (project) {
                this.$refs.dialog.show()
                this.project = project
            }
        }
    }
}
</script>
