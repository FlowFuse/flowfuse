<template>
    <ff-dialog ref="dialog" header="Edit User" confirm-label="Save" @confirm="confirm()" :disable-primary="!formValid" :closeOnConfirm="false">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
                <FormRow v-model="input.name" :placeholder="input.username">Name</FormRow>
                <FormRow v-model="input.email" :error="errors.email">Email</FormRow>
                <FormRow id="email_verified" wrapperClass="flex justify-between items-center" :disabled="email_verifiedLocked" v-model="input.email_verified" type="checkbox">Verified
                    <template v-slot:append>
                        <ff-button v-if="email_verifiedLocked" kind="danger" size="small" @click="unlockEmailVerify()">
                            Unlock
                            <template v-slot:icon>
                                <LockClosedIcon />
                            </template>
                        </ff-button>
                    </template>
                </FormRow>
                <FormRow id="admin" :error="errors.admin" wrapperClass="flex justify-between items-center" :disabled="adminLocked" v-model="input.admin" type="checkbox">Administrator
                    <template v-slot:append>
                        <ff-button v-if="adminLocked" kind="danger" size="small" @click="unlockAdmin()">
                            Unlock
                            <template v-slot:icon>
                                <LockClosedIcon />
                            </template>
                        </ff-button>
                    </template>
                </FormRow>
                <FormHeading class="text-red-700">Danger Zone</FormHeading>
                <FormRow :error="errors.expirePassword" wrapperClass="block">
                    <template #input>
                        <div class="flex justify-between items-center">
                            <ff-button :disabled="expirePassLocked"  :kind="expirePassLocked?'secondary':'danger'" @click="expirePassword">Expire password</ff-button>
                            <ff-button v-if="expirePassLocked" kind="danger" size="small" @click="unlockExpirePassword()">
                                Unlock
                                <template v-slot:icon>
                                    <LockClosedIcon />
                                </template>
                            </ff-button>
                        </div>
                    </template>
                </FormRow>
                <FormRow :error="errors.deleteUser" wrapperClass="block">
                    <template #input>
                        <div class="flex justify-between items-center">
                            <ff-button :disabled="deleteLocked" :kind="deleteLocked?'secondary':'danger'" @click="deleteUser">Delete user</ff-button>
                            <ff-button v-if="deleteLocked" kind="danger" size="small" @click="unlockDelete()">
                                Unlock
                                <template v-slot:icon>
                                    <LockClosedIcon />
                                </template>
                            </ff-button>
                        </div>
                    </template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import usersApi from '@/api/users'
import { LockClosedIcon } from '@heroicons/vue/outline'
import Alerts from '@/services/alerts'
import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'

export default {
    name: 'AdminUserEditDialog',

    components: {
        FormRow,
        FormHeading,
        LockClosedIcon
    },
    data () {
        return {
            input: {},
            errors: {},
            user: null,
            adminLocked: true,
            email_verifiedLocked: false,
            deleteLocked: true,
            expirePassLocked: true
        }
    },
    watch: {
        'input.username': function (v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = 'Must only contain a-z 0-9 - _'
            } else {
                this.errors.username = ''
            }
        },
        'input.email': function (v) {
            if (v && !/.+@.+/.test(v)) {
                this.errors.email = 'Enter a valid email address'
            } else {
                this.errors.email = ''
            }
        }
    },
    computed: {
        formValid () {
            return (this.input.email && !this.errors.email) &&
                   (this.input.username && !this.errors.username)
        }
    },
    methods: {
        unlockEmailVerify () {
            this.email_verifiedLocked = false
        },
        unlockAdmin () {
            this.adminLocked = false
        },
        unlockDelete () {
            this.deleteLocked = false
        },
        unlockExpirePassword () {
            this.expirePassLocked = false
        },
        confirm () {
            if (this.formValid) {
                const opts = {}
                let changed = false
                if (this.input.username !== this.user.username) {
                    opts.username = this.input.username
                    changed = true
                }
                if (this.input.name !== this.user.name) {
                    opts.name = this.input.name
                    changed = true
                }
                if (this.input.email !== this.user.email) {
                    opts.email = this.input.email
                    changed = true
                }
                if (this.input.admin !== this.user.admin) {
                    opts.admin = this.input.admin
                    changed = true
                }
                if (this.input.email_verified !== this.user.email_verified) {
                    opts.email_verified = this.input.email_verified
                    changed = true
                }

                if (changed) {
                    usersApi.updateUser(this.user.id, opts).then((response) => {
                        this.$emit('userUpdated', response)
                        this.$refs.dialog.close()
                    }).catch(err => {
                        console.log(err.response.data)
                        if (err.response.data) {
                            let showAlert = true
                            if (/username/.test(err.response.data.error)) {
                                this.errors.username = 'Username unavailable'
                                showAlert = false
                            }
                            if (/password/.test(err.response.data.error)) {
                                this.errors.password = 'Invalid username'
                                showAlert = false
                            }
                            if (/admin/i.test(err.response.data.error)) {
                                this.errors.admin = err.response.data.error
                                showAlert = false
                            }
                            if (err.response.data.error === 'email must be unique') {
                                this.errors.email = 'Email already registered'
                                showAlert = false
                            }
                            if (showAlert) {
                                const msgLines = []
                                if (err.response.data.error) {
                                    msgLines.push(err.response.data.error)
                                    if (err.response.data.message) {
                                        msgLines.push(err.response.data.message)
                                    }
                                } else {
                                    msgLines.push(err.message || 'Unknown error')
                                }
                                const msg = msgLines.join(' : ')
                                Alerts.emit(msg, 'warning', 7500)
                            }
                        }
                    })
                }
            }
        },
        deleteUser () {
            usersApi.deleteUser(this.user.id).then((response) => {
                this.$refs.dialog.close()
                this.$emit('userDeleted', this.user.id)
            }).catch(err => {
                this.errors.deleteUser = err.response.data.error
            })
        },
        expirePassword () {
            usersApi.updateUser(this.user.id, { password_expired: true })
                .then((response) => {
                    this.$refs.dialog.close()
                }).catch(err => {
                    this.errors.expirePassword = err.response.data.error
                })
        }
    },
    setup () {
        return {
            show (user) {
                this.$refs.dialog.show()
                this.user = user
                this.input.username = user.username
                this.input.name = user.name
                this.input.email = user.email
                this.input.admin = user.admin
                this.input.email_verified = user.email_verified
                this.email_verifiedLocked = true
                this.adminLocked = true
                this.deleteLocked = true
                this.expirePassLocked = true
                this.errors = {}
            }
        }
    }
}
</script>
