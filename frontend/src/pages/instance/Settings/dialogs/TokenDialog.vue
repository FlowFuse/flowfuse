<template>
    <ff-dialog ref="dialog" data-el="add-token-dialog" :header="(token ? 'Edit' : 'Add') + ' Token'" :confirm-label="token ? 'Save' : 'Create'" :disablePrimary="disableConfirm" @confirm="confirm()">
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <FormRow v-model="input.name" data-form="token-name" :disabled="edit">
                    Token name
                </FormRow>
                <ff-checkbox v-model="input.expires" data-form="expiry-toggle" label="Add Expiry Date" />
                <FormRow :disabled="!input.expires" :error="dateError">
                    Expires
                    <template #input>
                        <div class="ff-input ff-text-input">
                            <input v-model="input.expiresAt" type="date" :min="new Date(Date.now() + 60 * 60 * 24 * 1000).toISOString().split('T')[0]" max="2199-12-31" :disabled="!input.expires">
                        </div>
                    </template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import instanceApi from '../../../../api/instances.js'

import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'TokenDialog',
    components: {
        FormRow
    },
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['token-created', 'token-updated'],
    setup () {
        return {
            showCreate () {
                this.$refs.dialog.show()
                this.token = null
                this.input = {
                    id: null,
                    name: '',
                    expiresAt: null,
                    expires: false
                }
                this.edit = false
            },
            showEdit (row) {
                this.token = row
                this.input = {
                    id: row.id,
                    name: row.name
                }
                if (row.expiresAt === null) {
                    this.input.expires = false
                } else {
                    this.input.expires = true
                    this.input.expiresAt = row.expiresAt.split('T')[0]
                }
                this.edit = true
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            token: null,
            scopes: [],
            input: {
                id: null,
                name: '',
                scope: {},
                expiresAt: null,
                expires: true
            },
            edit: false
        }
    },
    computed: {
        dialogTitle () {
            if (this.token) {
                return 'Update token'
            } else {
                return 'Create token'
            }
        },
        disableConfirm () {
            if (!this.input.name) {
                return true
            }
            if (!this.input.expires) {
                return false
            }
            return this.dateError !== ''
        },
        dateError () {
            if (this.input.expires) {
                const dateEntered = new Date(this.input.expiresAt)
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                tomorrow.setHours(0, 0, 0, 0)
                if (dateEntered instanceof Date && !isNaN(dateEntered) && dateEntered >= tomorrow) {
                    return ''
                } else {
                    return 'Date must be at in the future'
                }
            }
            return ''
        }
    },
    methods: {
        confirm: async function () {
            if (!this.edit) {
                let array = []
                if (this.input.scope) {
                    array = Object.keys(this.input.scope).map(k => k)
                }
                const request = {
                    name: this.input.name,
                    scope: array.join(',')
                }
                if (this.input.expires) {
                    request.expiresAt = Date.parse(this.input.expiresAt)
                }
                const token = await instanceApi.createHTTPToken(this.project.id, request.name, request.scope, request.expiresAt)
                this.$emit('token-created', token)
            } else {
                let array = []
                if (this.input.scope) {
                    array = Object.keys(this.input.scope)?.map(k => k)
                }
                const request = {
                    id: this.input.id,
                    scope: array.join(',')
                }
                if (this.input.expires) {
                    request.expiresAt = Date.parse(this.input.expiresAt)
                } else {
                    request.expiresAt = undefined
                }

                try {
                    await instanceApi.updateHTTPToken(this.project.id, request.id, request.scope, request.expiresAt)
                } catch (err) {
                    console.error(err)
                }
                this.$emit('token-updated')
            }
        }
    }
}
</script>
