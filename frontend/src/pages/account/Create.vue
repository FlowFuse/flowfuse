<template>
    <div class="flex-grow mx-auto flex bg-gray-50 pt-4 pb-12">
        <div class="sm:w-72 w-screen space-y-2">
            <div class="max-w-xs mx-auto w-full mb-4">
                <Logo/>
                <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                    <span>FLOW</span><span class="font-light">FORGE</span>
                </h2>
            </div>
            <template v-if="!emailSent">
                <form class="bg-white p-4 border-t border-b space-y-4">
                    <FormHeading>Sign up</FormHeading>
                    <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
                    <FormRow v-model="input.name" :placeholder="input.username">Full Name</FormRow>
                    <FormRow v-model="input.email" :error="errors.email">Email</FormRow>
                    <FormRow type="password" :error="errors.password" v-model="input.password" id="password" :onBlur="checkPassword" >Password</FormRow>
                    <button type="button" :disabled="!formValid" @click="registerUser" class="forge-button">
                        Sign up
                    </button>
                </form>
            </template>
            <template v-else>
                <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 text-center">
                    <p class="text-gray-700 text-lg mt-10 ">Confirm your email address</p>
                    <p class="text-sm text-gray-700">Please click the link in the email we sent to <b>{{input.email}}</b></p>
                </form>
            </template>
        </div>
    </div>
</template>

<script>
import userApi from '@/api/user'
import { mapState } from 'vuex'
import Logo from "@/components/Logo"
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import { useRoute } from 'vue-router';

export default {
    name: "AccountCreate",
    components: {
        Logo,
        FormRow,
        FormHeading
    },
    data() {
        return {
            teams: [],
            emailSent: false,
            input: {
                name: "",
                username: "",
                email: "",
                password: "",
            },
            errors: {
                password: "Password must be at least 8 characters"
            }
        }
    },
    mounted() {
        this.input.email = useRoute().query.email || ""
    },
    computed: {
        formValid() {
            return this.input.email &&
                   (this.input.username && !this.errors.username) &&
                   this.input.password.length >= 8
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
        'input.password': function(v) {
            if (this.errors.password && v.length >= 8) {
                this.errors.password = ''
            }
        }
    },
    methods: {
        checkPassword() {
            if (this.input.password.length < 8) {
                this.errors.password = "Password must be at least 8 characters"
            } else {
                this.errors.password = ""
            }
        },
        registerUser() {
            let opts = { ...this.input, name: this.input.name || this.input.username }
            userApi.registerUser(opts).then(result => {
                this.emailSent = true;
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
    },
}
</script>
