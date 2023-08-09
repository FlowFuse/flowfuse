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
                <FormRow v-model="input.expiresAt" type="date">
                    Expires
                    <template v-slot:description>Expires</template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import settings from '../../../../api/settings'

import FormRow from '../../../../components/FormRow.vue'

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
                name: '',
                scope: {},
                expiresAt: null
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
        confirm() {
            console.log(this.input)
        }
    },
    setup () {
        return {
            showCreate () {
                this.$refs.dialog.show()
                this.token = null
                this.input = { name: '', scope: {
                    'user:read': true
                }, expiresAt: null }
                this.edit = false
            },
            showEdit (row) {
                this.$refs.dialog.show()
                this.token = row
                this.input = {
                    name: row.name,
                    scope: row.scope.split(','),
                    expiresAt: 0
                }
                this.edit = true
            }
        }
    }
}
</script>