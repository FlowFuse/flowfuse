<template>
    <div class="ff-layout--plain">
        <div class="ff-layout--plain--wrapper">
            <slot />
        </div>
        <ff-dialog ref="dialog" data-el="platform-dialog" :header="dialog.header" :kind="dialog.kind" :disable-primary="dialog.disablePrimary" :confirm-label="dialog.confirmLabel" @cancel="clearDialog(true)" @confirm="dialog.onConfirm">
            <p v-if="dialog.text">{{ dialog.text }}</p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="space-y-2" v-html="dialog.html" />
        </ff-dialog>
    </div>
</template>

<script>
import DialogMixin from '../mixins/Dialog.js'
import dialog from '../services/dialog.js'

export default {
    name: 'FfLayoutPlain',
    mixins: [DialogMixin],
    data () {
        return {

        }
    },
    mounted () {
        dialog.bind(this.$refs.dialog, this.showDialogHandler)
    }
}
</script>

<style scoped lang="scss">

</style>
