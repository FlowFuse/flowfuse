<template>
    <div class="forge-block">
        <div class="max-w-2xl m-auto">
            <form class="space-y-6">
                <FormHeading>Create a new user</FormHeading>
                <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
                <FormRow v-model="input.name" :placeholder="input.username">Name</FormRow>
                <FormRow v-model="input.email" :error="errors.email">Email</FormRow>
                <FormRow type="password" :error="errors.password" v-model="input.password" id="password" :onBlur="checkPassword" >Password</FormRow>
                <FormRow type="password" :error="errors.password_confirm" v-model="input.password_confirm" id="password_confirm">Confirm Password</FormRow>
                <FormRow id="isAdmin" v-model="input.isAdmin" type="checkbox">Administrator</FormRow>
                <FormHeading>Team options</FormHeading>
                <FormRow id="createDefaultTeam" v-model="input.createDefaultTeam" type="checkbox">Create personal team
                    <template v-slot:description>A user needs to be in a team to create projects</template>
                </FormRow>
                <FormRow v-model="input.addToTeam">Add to existing team</FormRow>
                <button type="button" :disabled="!formValid" @click="createUser" class="forge-button">
                    Create user
                </button>
            </form>
        </div>
    </div>
</template>

<script>
import usersApi from '@/api/users'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs'

export default {
    name: 'AdminCreateUser',
    mixins: [Breadcrumbs],
    data() {
        return {
            teams: [],
            input: {
                name: "",
                username: "",
                email: "",
                password: "",
                password_confirm: "",
                isAdmin: false,
                createDefaultTeam: true
            },
            errors: {}
        }
    },
    created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}},
            {label:"Users", to:{path:"/admin/users"}},
            {label:"Create a new user" }
        ]);
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
    computed: {
        formValid() {
            return this.input.email &&
                   (this.input.username && !this.errors.username) &&
                   this.input.password === this.input.password_confirm
        }
    },
    methods: {
        checkPassword() {
            if (this.input.password && this.input.password.length < 8) {
                this.errors.password = "Password must be at least 8 characters"
            } else {
                this.errors.password = ""
            }
        },
        createUser() {
            let opts = { ...this.input, name: this.input.name || this.input.username }
            delete opts.password_confirm;
            usersApi.create(opts).then(result => {
                this.$router.push({path:"/admin/users"})
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
    components: {
        FormRow,
        FormHeading
    }
}
</script>
