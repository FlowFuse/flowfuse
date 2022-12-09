<template>
    <ff-dialog ref="dialog" header="Edit User" confirm-label="Save" @confirm="confirm()" :closeOnConfirm="false" :disable-primary="disableSave">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
                <FormRow v-model="input.name" :placeholder="input.username">Name</FormRow>
                <FormRow v-model="input.email" :error="errors.email" :disabled="user.sso_enabled">
                    Email
                    <template v-slot:description v-if="user.sso_enabled">
                        <div>SSO is enabled for this user.</div>
                    </template>
                </FormRow>
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
                <FormRow id="user_suspended" wrapperClass="flex justify-between items-center" :disabled="user_suspendedLocked" v-model="input.user_suspended" type="checkbox">Suspended
                    <template v-slot:append>
                        <ff-button v-if="user_suspendedLocked" kind="danger" size="small" @click="unlockSuspended()">
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
            expirePassLocked: true,
            user_suspendedLocked: true
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
        disableSave () {
            const { isChanged, isValid } = this.getChanges()
            return !isValid || !isChanged
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
        unlockSuspended () {
            this.user_suspendedLocked = false
        },
        getChanges () {
            const changes = {}
            const isValid = (this.input.email && !this.errors.email) &&
                   (this.input.username && !this.errors.username)
            if (this.user) {
                if (this.input.username !== this.user.username) {
                    changes.username = this.input.username
                }
                if (this.input.name !== this.user.name) {
                    changes.name = this.input.name
                }
                if (this.input.email !== this.user.email) {
                    changes.email = this.input.email
                }
                if (this.input.admin !== this.user.admin) {
                    changes.admin = this.input.admin
                }
                if (this.input.email_verified !== this.user.email_verified) {
                    changes.email_verified = this.input.email_verified
                }
                if (this.input.user_suspended !== this.user.suspended) {
                    changes.suspended = this.input.user_suspended
                }
            }
            const isChanged = Object.keys(changes).length > 0
            return { isValid, isChanged, changes }
        },
        confirm () {
            const { isValid, isChanged, changes } = this.getChanges()
            if (isValid && isChanged) {
                usersApi.updateUser(this.user.id, changes).then((response) => {
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
            } else {
                this.$refs.dialog.close()
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
                    this.$emit('userUpdated', response)
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
                this.user_suspendedLocked = true
                this.input.user_suspended = user.suspended
                this.errors = {}
            }
        }
    }
}
</script>
