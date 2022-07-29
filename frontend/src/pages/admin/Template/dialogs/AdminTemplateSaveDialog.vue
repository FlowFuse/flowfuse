<template>
    <ff-dialog ref="dialog" header="Update Template" confirm-label="Save Template" @confirm="confirm()">
        <template v-slot:default>
            <form class="space-y-6">
                <div class="space-y-2">
                    <p>Are you sure you want to save this template?</p>
                    <p>Any projects using this template will need to be manually restarted to pick up any changes.</p>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'AdminTemplateSaveDialog',
    methods: {
        confirm () {
            this.$emit('saveTemplate')
        }
    },
    setup () {
        return {
            show () {
                this.$refs.show()
            }
        }
    }
}
</script>
