<template>
    <form class="space-y-6">
        <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
        <FormRow v-model="input.name" :placeholder="input.username">Name</FormRow>
        <FormRow v-model="input.email" :error="errors.email">Email</FormRow>

        <button type="button" :disabled="!formValid" class="forge-button" @click="confirm">Save Changes</button>

    </form>
</template>

<script>
import userApi from '@/api/user'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/vue/outline'

export default {
    name: 'AccountSettings',

    data() {
        const currentUser = this.$store.getters['account/user'];
        return {
            user: currentUser,
            errors: {},
            input: {
                username: currentUser.username,
                name: currentUser.name,
                email: currentUser.email
            },
            changed: {}
        }
    },
    watch: {
        'input.username': function(v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = "Must only contain a-z 0-9 - _"
            } else {
                this.errors.username = ""
            }
            this.changed.username = (this.user.username !== v)
        },
        'input.email': function(v) {
            if (v && !/.+@.+/.test(v)) {
                this.errors.email = "Enter a valid email address"
            } else {
                this.errors.email = ""
            }
            this.changed.email = (this.user.email !== v)
        },
        'input.name': function(v) {
            this.changed.name = (this.user.name !== v)
        }
    },
    methods: {
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
                userApi.updateUser(opts).then((response) => {
                    this.$store.dispatch('account/setUser',response);
                    this.user = response;
                    this.changed = {};
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
            }
        }
    },
    computed: {
        formValid() {
            return (this.changed.name||this.changed.username||this.changed.email) &&
                   (this.input.email && !this.errors.email) &&
                   (this.input.username && !this.errors.username)
        }
    },
    components: {
        FormRow,
        FormHeading,
        LockClosedIcon
    }
}
</script>
