<template>
    <ff-dialog
        id="client-dialog"
        ref="dialog"
        data-el="create-client-dialog"
        header="Create Client"
        :closeOnConfirm="false"
        :disablePrimary="disableConfirm"
        @confirm="confirm"
        @cancel="clearData"
    >
        <template #default>
            <div class="mb-5">
                <FormRow
                    v-model="input.username"
                    :error="errors.username"
                    class="mb-2"
                    placeholder="Client Username"
                    :disabled="isEditing"
                    data-el="username"
                >
                    Username
                </FormRow>

                <FormRow v-model="input.password" class="mb-2" type="password" :placeholder="passwordPlaceholder" data-el="password">
                    Password
                </FormRow>
                <FormRow
                    v-model="input.passwordConfirm"
                    class="mb-2" type="password"
                    :error="errors.password"
                    :placeholder="passwordConfirmationPlaceholder"
                    data-el="confirm-password"
                >
                    Confirm Password
                </FormRow>
            </div>
            <div class="acls">
                <h3 class="flex justify-between">
                    <span>Access Control Rules</span>
                    <span data-action="add-acl">
                        <PlusIcon class="ff-icon hover:cursor-pointer" @click="addAcl" />
                    </span>
                </h3>
                <div class="headers flex gap-2.5 items-center">
                    <label class="flex-1 text-gray-800 block text-sm font-medium mb-1">
                        Action
                    </label>
                    <label class="flex-1 text-gray-800 block text-sm font-medium mb-1">
                        Pattern
                    </label>
                </div>
                <ul data-el="acl-list">
                    <li v-for="(acl, $key) in input.acls" :key="acl.id">
                        <AclItem
                            v-model="input.acls[$key]"
                            :order-key="$key"
                            :acls="input.acls"
                            :validation-error="errors.acls[acl.id]"
                            @update:model-value="onAclUpdated($event, $key)"
                            @remove-acl="onRemoveAcl"
                        />
                    </li>
                </ul>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import { PlusIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import brokerApi from '../../../../api/broker.js'
import FormRow from '../../../../components/FormRow.vue'
import { generateUuid } from '../../../../composables/String.js'

import AclItem from './AclItem.vue'

export default {
    name: 'ClientDialog',
    components: {
        FormRow,
        AclItem,
        PlusIcon
    },
    props: {
        clients: {
            required: true,
            type: Array
        }
    },
    emits: ['client-created', 'client-updated'],
    setup () {
        return {
            showCreate () {
                this.isEditing = false
                const initialAcl = {
                    action: 'both',
                    pattern: '#',
                    id: generateUuid()
                }
                this.input.acls.push(initialAcl)
                this.errors.acls[initialAcl.id] = {
                    id: initialAcl.id,
                    action: null,
                    pattern: null
                }
                this.$refs.dialog.show()
            },
            showEdit (client) {
                this.isEditing = true
                this.username = client.username
                this.input = {
                    username: client.username,
                    password: '',
                    passwordConfirm: ''
                }
                this.input.acls = [...client.acls.map(acl => ({ ...acl, id: generateUuid() }))]
                this.input.acls.forEach((acl) => {
                    this.errors.acls[acl.id] = {
                        id: acl.id,
                        action: null,
                        pattern: null
                    }
                })
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            isEditing: false,
            username: '',
            input: {
                username: '',
                password: '',
                passwordConfirm: '',
                acls: []
            },
            errors: {
                username: null,
                password: null,
                acls: {}
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        disableConfirm () {
            if (!this.input.username) {
                return true
            }
            if (this.isEditing) {
                return false
            }
            return !this.input.password || !this.input.passwordConfirm
        },
        passwordPlaceholder () {
            if (this.isEditing) {
                return 'Leave blank to keep current password'
            }
            return 'Client Password'
        },
        passwordConfirmationPlaceholder () {
            if (this.isEditing) {
                return 'Leave blank to keep current password'
            }

            return 'Confirm Client Password'
        }
    },
    methods: {
        async confirm () {
            if (!this.validateForm()) {
                return
            }

            if (this.isEditing) {
                return brokerApi.updateClient(
                    this.team.id,
                    this.username,
                    {
                        acls: this.input.acls,
                        newUsername: this.input.username,
                        password: this.input.password
                    }
                ).then(() => {
                    this.$emit('client-updated')
                    this.$refs.dialog.close()
                    this.clearData()
                })
                    .catch(err => console.error(err))
            } else {
                return brokerApi.createClient(
                    this.team.id,
                    this.input.username,
                    this.input.password,
                    this.input.acls
                )
                    .then(() => {
                        this.$emit('client-created')
                        this.$refs.dialog.close()
                        this.clearData()
                    })
                    .catch(err => console.error(err))
            }
        },
        validateForm () {
            let passesValidation = true
            if (this.input.password !== this.input.passwordConfirm) {
                this.errors.password = 'The provided passwords do not match.'
                passesValidation = false
            } else {
                this.errors.password = null
            }

            if (!this.isEditing && this.clients.find(c => c.username === this.input.username)) {
                this.errors.username = 'Client name already exists.'
                passesValidation = false
            } else {
                this.errors.username = null
            }

            this.input.acls.forEach((acl, key) => {
                if (!acl.action.length) {
                    this.errors.acls[key].action = 'Please select an action.'
                    passesValidation = false
                }
                if (!acl.pattern.length) {
                    this.errors.acls[key].pattern = 'The pattern cannot be empty.'
                    passesValidation = false
                } else {
                    if (!this.validatePattern(acl.pattern)) {
                        this.errors.acls[key].pattern = 'The pattern is not valid'
                        passesValidation = false
                    }
                }
            })

            return passesValidation
        },
        validatePattern (pattern) {
            const parts = pattern.split('/')
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] === '+') {
                    continue
                }
                if (parts[i] === '#') {
                    return i === parts.length - 1
                }
                if (parts[i].indexOf('+') !== -1 || parts[i].indexOf('#') !== -1) {
                    return false
                }
            }
            return true
        },
        addAcl () {
            const id = generateUuid()
            this.input.acls.push({
                id,
                action: '',
                pattern: ''
            })
            this.errors.acls[id] = {
                id,
                action: null,
                pattern: null
            }
        },
        onAclUpdated (acl) {
            if (!acl.action.length) {
                this.errors.acls[acl.id].action = 'Please select an action.'
            } else {
                this.errors.acls[acl.id].action = null
            }

            if (!acl.pattern.length) {
                this.errors.acls[acl.id].pattern = 'The pattern cannot be empty.'
            } else {
                if (!this.validatePattern(acl.pattern)) {
                    this.errors.acls[acl.id].pattern = 'The pattern is not valid'
                } else {
                    this.errors.acls[acl.id].pattern = null
                }
            }
        },
        onRemoveAcl (acl) {
            this.input.acls = this.input.acls.filter((item) => item.id !== acl.id)
            delete this.errors.acls[acl.id]
        },
        clearData () {
            this.input = {
                username: '',
                password: '',
                passwordConfirm: '',
                acls: []
            }
            this.errors = {
                username: null,
                password: null,
                acls: []
            }
        }
    }
}
</script>

<style lang="scss" scoped>
#client-dialog {

    .headers {
        label:first-of-type {
            max-width: 200px;
        }
    }
}
</style>
