<template>
    <ff-dialog ref="dialog" data-el="add-token-dialog" :header="(token ? 'Edit' : 'Add') + ' Token'" :confirm-label="token ? 'Save' : 'Create'" :disablePrimary="disableConfirm" @confirm="confirm()">
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <FormRow v-model="input.name" data-form="token-name" :disabled="edit">
                    Token name
                </FormRow>
                <ff-checkbox v-model="input.expires" data-form="expiry-toggle" label="Add Expiry Date" />
                <FormRow v-model="input.expiresAt" data-form="token-expiry" type="date" :disabled="!input.expires">
                    Expires
                    <!-- <template v-slot:description>Expires</template> -->
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import userApi from '../../../../api/user.js'

import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'TokenDialog',
    components: {
        FormRow
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
                    this.input.expiresAt = row.expiresAt.split('T')[0] // `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
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
            } else {
                if (this.input.expiresAt) {
                    return false
                }
            }
            return true
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
                const token = await userApi.createPersonalAccessToken(request.name, request.scope, request.expiresAt)
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
                    await userApi.updatePersonalAccessToken(request.id, request.scope, request.expiresAt)
                } catch (err) {
                    console.error(err)
                }
                this.$emit('token-updated')
            }
        }
    }
}
</script>
