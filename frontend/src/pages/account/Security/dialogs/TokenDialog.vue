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
import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'TokenDialog',
    components: {
        FormRow
    },
    emits: ['token-create', 'token-update'],
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
            } else {
                if (this.input.expiresAt) {
                    return false
                }
            }
            return true
        }
    },
    methods: {
        confirm () {
            if (!this.edit) {
                let array = []
                if (this.input.scope) {
                    array = Object.keys(this.input.scope).map(k => k)
                }
                const data = {
                    name: this.input.name,
                    scope: array.join(',')
                }
                if (this.input.expires) {
                    data.expiresAt = Date.parse(this.input.expiresAt)
                }
                this.$emit('token-create', data)
            } else {
                let array = []
                if (this.input.scope) {
                    array = Object.keys(this.input.scope)?.map(k => k)
                }
                const data = {
                    id: this.input.id,
                    scope: array.join(',')
                }
                if (this.input.expires) {
                    data.expiresAt = Date.parse(this.input.expiresAt)
                } else {
                    data.expiresAt = undefined
                }
                this.$emit('token-update', data)
            }
        }
    }
}
</script>
