<template>
    <ff-dialog :open="isOpen" header="Update Template" @close="close">
        <template v-slot:default>
            <form class="space-y-6">
                <div class="space-y-2">
                    <p>Are you sure you want to save this template?</p>
                    <p>Any projects using this template will need to be manually restarted to pick up any changes.</p>
                </div>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close">Cancel</ff-button>
            <ff-button kind="primary" @click="confirm">Save Template</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

export default {
    name: 'AdminTemplateSaveDialog',
    methods: {
        confirm () {
            this.$emit('saveTemplate')
            this.isOpen = false
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show () {
                isOpen.value = true
            }
        }
    }
}
</script>
