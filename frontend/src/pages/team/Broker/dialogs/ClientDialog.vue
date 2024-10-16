<template>
    <ff-dialog ref="dialog" data-el="create-client-dialog" header="Create Client" :disablePrimary="disableConfirm" @confirm="confirm()">
        <template #default>
            <FormRow v-model="input.username">
                Username
            </FormRow>
            <FormRow v-model="input.password">
                Password
            </FormRow>
            <!-- <FormRow v-model="input.acls">
                Password
            </FormRow> -->
        </template>
    </ff-dialog>
</template>

<script>
import FormRow from '../../../../components/FormRow.vue'

import brokerApi from '../../../../api/broker.js'

export default {
    name: 'ClientDialog',
    components: {
        FormRow
    },
    emits: ['client-created'],
    setup () {
        return {
            showCreate() {
                this.$refs.dialog.show()
                this.input = {
                    name: '',
                    password: '',
                    acls: ''
                }
            }
        }
    },
    props: {
        team: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            input: {
                username: '',
                password: '',
                acls: ''
            }
        }
    },
    computed: {
        disableConfirm () {
            if (!this.input.username) {
                return true
            }
            if (!this.input.password) {
                return true
            }
        }
    },
    methods: {
        confirm: async function () {
            try {
                const newClient = await brokerApi.createClient(this.team.id, this.input.username, this.input.password, [{action: 'both', pattern: '#'}])
                this.$emit('client-created')
            } catch (err) {
                console.log(err)
            }
        }
    }
}
</script>
