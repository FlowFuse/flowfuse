<template>
    <ff-dialog ref="dialog" data-el="add-token-confirmation" :header="$t('ui.tokenCreated')">
        <template #default>
            <p>{{ $t('ui.yourTokenIs') }} <code>{{ token?.token }}</code></p>
            <p>{{ $t('ui.thisIsTheOnlyTimeItWillBeShownSoPleaseEnsureYouM') }}</p>
        </template>
        <template #actions>
            <ff-button v-if="!!clipboardSupported" data-action="token-confirmation-copy" kind="secondary" @click="copy()">{{ $t('ui.copyToClipboard') }}</ff-button>
            <ff-button data-action="token-confirmation-done" class="ml-4" @click="close()">{{ $t('ui.done') }}</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'

export default {
    name: 'TokenCreated',
    mixins: [clipboardMixin],
    data () {
        return {
            token: null
        }
    },
    methods: {
        close () {
            this.$refs.dialog.close()
            this.token = null
        },
        copy () {
            this.copyToClipboard(this.token.token).then(() => {
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                Alerts.emit('Clipboard write permission denied.', 'warning')
            })
        },
        showToken (token) {
            this.token = token
            this.$refs.dialog.show()
        }
    }
}
</script>
