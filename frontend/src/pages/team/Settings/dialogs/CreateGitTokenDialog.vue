<template>
    <ff-dialog
        ref="dialog"
        header="Add Git Token"
        confirm-label="Add"
        :disable-primary="!formValid"
        @confirm="confirm()"
    >
        <template #default>
            <p>Add a new git token to your team.</p>
            <p>TODO: add more information about how and where this token comes from </p>
            <form class="space-y-6 mt-2 mb-2">
                <FormRow v-model="input.name" data-form="token-name" :error="errors.name">Name</FormRow>
                <FormRow v-model="input.token" data-form="token-value">Token</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import teamApi from '../../../../api/team.js'

import FormRow from '../../../../components/FormRow.vue'
import alerts from '../../../../services/alerts.js'

export default {
    name: 'CreateGitTokenDialog',
    components: {
        FormRow
    },
    props: {
        team: {
            required: true,
            type: Object
        }
    },
    emits: ['token-creating', 'token-created'],
    setup () {
        return {
            async show () {
                this.errors = {}
                this.input.name = ''
                this.input.token = ''
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            input: {
                name: '',
                token: ''
            },
            errors: {}
        }
    },
    computed: {
        formValid () {
            const trimmed = this.input.name.trim()
            return trimmed.length > 0
        }
    },
    async mounted () {
    },
    methods: {
        confirm () {
            const opts = {
                name: this.input.name.trim(),
                token: this.input.token,
                team: this.team.id
            }
            this.$emit('token-creating')
            teamApi.createGitToken(opts.team, opts).then((response) => {
                this.$emit('token-created', response)
                alerts.emit('Git Token successfully added.', 'confirmation')
            }).catch(err => {
                this.$emit('token-created', null)
                console.error(err.response.data)
                if (err.response.data) {
                    if (/name/.test(err.response.data.error)) {
                        this.errors.name = err.response.data.error
                    } else {
                        alerts.emit('Failed to add git token: ' + err.response.data.error, 'warning', 7500)
                    }
                }
            })
        }
    }
}
</script>
