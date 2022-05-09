<template>
    <TransitionRoot appear :show="isOpen" as="template">
        <Dialog as="div" @close="close">
            <div class="fixed inset-0 z-10 overflow-y-auto">
                <div class="min-h-screen px-4 text-center">
                    <DialogOverlay class="fixed inset-0 bg-black opacity-50" />
                    <span class="inline-block h-screen align-middle" aria-hidden="true">
                        &#8203;
                    </span>
                    <TransitionChild
                        as="template"
                        enter="duration-300 ease-out"
                        enter-from="opacity-0 scale-95"
                        enter-to="opacity-100 scale-100"
                        leave="duration-200 ease-in"
                        leave-from="opacity-100 scale-100"
                        leave-to="opacity-0 scale-95"
                    >
                        <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg rounded">
                            <DialogTitle as="h3" class="text-lg font-medium leading-6">Edit user</DialogTitle>
                            <form class="space-y-6 mt-2">
                                <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
                                <FormRow v-model="input.name" :placeholder="input.username">Name</FormRow>
                                <FormRow v-model="input.email" :error="errors.email">Email</FormRow>
                                <FormRow id="admin" :disabled="adminLocked" v-model="input.admin" type="checkbox">Administrator
                                    <template v-slot:append>
                                        <ff-button v-if="adminLocked" kind="danger" size="small" @click="unlockAdmin()">
                                            <template v-slot:icon>
                                                <LockClosedIcon />
                                            </template>
                                        </ff-button>
                                    </template>
                                </FormRow>
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                                    <ff-button :disabled="!formValid" class="ml-4" @click="confirm()">Save</ff-button>
                                </div>
                                <hr />
                                <FormHeading class="text-red-700">Danger Zone</FormHeading>
                                <div>
                                    <ff-button kind="danger" @click="expirePassword">Expire password</ff-button>
                                </div>
                                <div>
                                    <ff-button kind="danger" @click="deleteUser">Delete user</ff-button>
                                </div>
                            </form>
                        </div>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script>
import usersApi from '@/api/users'
import { LockClosedIcon } from '@heroicons/vue/outline'

import { ref } from 'vue'
import {
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle
} from '@headlessui/vue'

import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'

export default {
    name: 'AdminUserEditDialog',

    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle,
        FormRow,
        FormHeading,
        LockClosedIcon
    },
    data () {
        return {
            input: {},
            errors: {},
            user: null,
            adminLocked: true
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
        unlockAdmin () {
            this.adminLocked = false
        },
        confirm () {
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

            if (changed) {
                usersApi.updateUser(this.user.id, opts).then((response) => {
                    this.isOpen = false
                    this.$emit('userUpdated', response)
                }).catch(err => {
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/username/.test(err.response.data.error)) {
                            this.errors.username = 'Username unavailable'
                        }
                        if (/password/.test(err.response.data.error)) {
                            this.errors.password = 'Invalid username'
                        }
                        if (err.response.data.error === 'email must be unique') {
                            this.errors.email = 'Email already registered'
                        }
                    }
                })
            } else {
                this.isOpen = false
            }
        },
        expirePassword () {
            usersApi.updateUser(this.user.id, { password_expired: true }).then((response) => {
                this.isOpen = false
            }).catch(err => {
                console.log(err.response.data)
            })
        },
        deleteUser () {
            usersApi.deleteUser(this.user.id).then((response) => {
                this.isOpen = false
                this.$emit('userDeleted')
            }).catch(err => {
                // if (err.response.data) {
                console.log('Err', err.response.data)
                //     if (err.response.data.error.indexOf('admin') !== -1) {
                //         this.errors.deleteAdmin = 'Cannot delete an Admin User'
                //     }
                //     if (err.response.data.error.indexOf('owner') !== -1) {
                //         this.errors.deleteOwner = 'Cannot delete a team\'s owner'
                //     }
                // }
            })
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (user) {
                this.user = user
                this.input.username = user.username
                this.input.name = user.name
                this.input.email = user.email
                this.input.admin = user.admin
                this.adminLocked = true
                isOpen.value = true
            }
        }
    }
}
</script>
