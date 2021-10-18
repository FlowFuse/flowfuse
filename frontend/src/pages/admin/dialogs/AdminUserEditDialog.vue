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
                            <button type="button" @click="unlockAdmin" :class="[{'opacity-0':!adminLocked}]" class="forge-button-danger px-1" ><LockClosedIcon class="w-4" /></button>
                        </template>
                    </FormRow>
                  <div class="mt-4 flex flex-row justify-end">
                      <button type="button" class="forge-button-secondary ml-4" @click="close">Cancel</button>
                      <button type="button" :disabled="!formValid" class="forge-button ml-4" @click="confirm">Save</button>
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
import { LockClosedIcon, LockOpenIcon } from '@heroicons/vue/outline'

import { ref } from 'vue'
import {
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle,
} from '@headlessui/vue'

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
        LockClosedIcon
    },
    data() {
        return {
            input: {},
            errors: {},
            user: null,
            adminLocked: true
        }
    },
    watch: {
        'input.username': function(v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = "Must only contain a-z 0-9 - _"
            } else {
                this.errors.username = ""
            }
        },
        'input.email': function(v) {
            if (v && !/.+@.+/.test(v)) {
                this.errors.email = "Enter a valid email address"
            } else {
                this.errors.email = ""
            }
        },
    },
    computed: {
        formValid() {
            return this.input.email &&
                   (this.input.username && !this.errors.username)
        }
    },
    methods: {
        unlockAdmin() {
            this.adminLocked = false
        },
        confirm() {
            const opts = {};
            let changed = false;
            if (this.input.username !== this.user.username) {
                opts.username = this.input.username;
                changed = true;
            }
            if (this.input.name !== this.user.name) {
                opts.name = this.input.name;
                changed = true;
            }
            if (this.input.email !== this.user.email) {
                opts.email = this.input.email;
                changed = true;
            }
            if (this.input.admin !== this.user.admin) {
                opts.admin = this.input.admin;
                changed = true;
            }

            if (changed) {
                usersApi.updateUser(this.user.id, opts).then((response) => {
                    this.isOpen = false
                    this.$emit('userUpdated',response)
                }).catch(err => {
                    console.log(err.response.data);
                    if (err.response.data) {
                        if (/username/.test(err.response.data.error)) {
                            this.errors.username = "Username unavailable"
                        }
                        if (/password/.test(err.response.data.error)) {
                            this.errors.password = "Invalid username"
                        }
                        if (err.response.data.error === "email must be unique") {
                            this.errors.email = "Email already registered"
                        }
                    }
                });
            } else {
                this.isOpen = false
            }
        }
    },
    setup() {
        const isOpen = ref(false)
        return {
            isOpen,
            close() {
                isOpen.value = false
            },
            show(user) {
                this.user = user;
                this.input.username = user.username;
                this.input.name = user.name;
                this.input.email = user.email;
                this.input.admin = user.admin;
                this.adminLocked = true;
                isOpen.value = true
            },
        }
    },
}
</script>
