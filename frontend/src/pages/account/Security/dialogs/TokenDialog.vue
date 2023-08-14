<template>
    <ff-dialog ref="dialog" :confirm-label="token ? 'Save' : 'Create'" @confirm="confirm()">
        <template v-slot:default>
            <form @submit.prevent>
                <FormRow v-model="input.name" :disabled="edit">
                    Name
                    <template v-slot:description>Token name</template>
                </FormRow>
                Scopes
                <div class="grid grid-cols-2 gap-2">
                    <ff-checkbox v-for="scope in scopes" :label="scope" v-model="input.scope[scope]" :key="scope">

                    </ff-checkbox>
                </div>
                <FormRow v-model="input.expiresAt" type="date" :disabled="input.never">
                    Expires
                    <!-- <template v-slot:description>Expires</template> -->
                    <ff-checkbox label="never" v-model="input.never"></ff-checkbox>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import settings from '../../../../api/settings'

import FormRow from '../../../../components/FormRow.vue'
import userApi from '../../../../api/user'

export default {
    name: 'TokenDialog',
    components: {
        FormRow
    },
    emits: ['token-create', 'token-updated'],
    data () {
        return {
            token: null,
            scopes: [],
            input: {
                id: null,
                name: '',
                scope: {},
                expiresAt: null,
                never: true
            },
            edit: false
        }
    },
    computed: {
        dialogTitle () {
            if (this.token) {
                return "Update token"
            } else {
                return "Create token"
            }
        }
    },
    mounted () {
        this.getScopes()
    },
    methods: {
        getScopes: async function () {
            const temp = await settings.getSettings()
            this.scopes = Object.keys(temp['platform:auth:permissions'])
        },
        confirm: async function () {
            if (!this.edit) {
                const array = Object.keys(this.input.scope).map( k => k)
                const request = {
                    name: this.input.name,
                    scope: array.join(',')
                }
                if (!this.input.never) {
                    request.expiresAt = Date.parse(this.input.expiresAt)
                }
                const token = await userApi.createPersonalAccessToken(request.name, request.scope, request.expiresAt)
                this.$emit('token-created', token)
            } else {
                this.$emit('token-updated')
            }
        }
    },
    setup () {
        return {
            showCreate () {
                this.$refs.dialog.show()
                this.token = null
                this.input = { 
                    id: null,
                    name: '', 
                    scope: {
                        'user:read': true
                    }, 
                    expiresAt: null,
                    never: true
                }
                this.edit = false
            },
            showEdit (row) {
                this.$refs.dialog.show()
                this.token = row
                this.input = {
                    id: row.id,
                    name: row.name,
                    scope: row.scope.split(','),
                    expiresAt: row.expiresAt
                }
                if (row.expiresAt === null) {
                    this.input.never = true
                }
                this.edit = true
            }
        }
    }
}
</script>