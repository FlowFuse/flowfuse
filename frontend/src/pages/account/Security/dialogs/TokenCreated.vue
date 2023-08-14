<template>
    <ff-dialog ref="dialog">
        <template v-slot:default>
            <p>Your token is <code>{{ token.token }}</code></p>
            <p>This is the only time it will be shown, so please ensure you make a note</p>
        </template>
        <template v-slot:actions>
            <ff-button v-if="!!clipboardSupported" kind="secondary" @click="copy()">Copy to Clipboard</ff-button>
            <ff-button class="ml-4" @click="close()">Done</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'

export default {
    name: 'TokenCreated',
    mixins: [clipboardMixin],
    setup () {
        return {
            showToken (token) {
                this.token = token
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            token: null
        }
    },
    methods: {
        close () {
            this.$refs.dialog.close()
            this.token = undefined
        },
        copy () {
            this.copyToClipboard(this.token.token).then(() => {
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                Alerts.emit('Clipboard write permission denied.', 'warning')
            })
        }
    }
}
</script>
