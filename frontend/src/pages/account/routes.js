import Account from '@/pages/account/index.vue'
import AccountSettings from '@/pages/account/Settings.vue'
import AccountSecurity from '@/pages/account/Security.vue'
import AccountSecurityChangePassword from '@/pages/account/Security/ChangePassword.vue'
// import AccountSecuritySessions from "@/pages/account/Security/Sessions.vue"
import AccountTeams from '@/pages/account/Teams/index.vue'
import AccountTeamTeams from '@/pages/account/Teams/Teams.vue'
import AccountTeamInvitations from '@/pages/account/Teams/Invitations.vue'
import AccessRequest from '@/pages/account/AccessRequest.vue'
import AccountCreate from '@/pages/account/Create.vue'
import VerifyEmail from '@/pages/account/VerifyEmail.vue'
import ForgotPassword from '@/pages/account/ForgotPassword'
import PasswordReset from '@/pages/account/PasswordReset'

import { CogIcon } from '@heroicons/vue/outline'
import store from '@/store'

export default [
    {
        // This is the editor being authenticated. Bounce straight to complete
        // the auth flow rather than ask permission
        path: '/account/request/:id/editor',
        component: AccessRequest,
        beforeEnter: (to, _, next) => {
            let removeWatch
            function proceed () {
                if (removeWatch) {
                    removeWatch()
                }
                if (store.state.account.user) {
                    window.location.href = `/account/complete/${to.params.id}`
                }
            }
            // Check if we've loaded the current user yet
            if (!store.state.account.user) {
                // Setup a watch
                removeWatch = store.watch(
                    (state) => state.account.user,
                    (_) => { proceed() }
                )
            } else {
                proceed()
            }
        }
    },
    {
        path: '/account/request/:id',
        component: AccessRequest,
        meta: {
            modal: true
        }
    },
    {
        profileLink: true,
        profileMenuIndex: 0,
        path: '/account',
        redirect: '/account/settings',
        name: 'User Settings',
        meta: {
            title: 'Account - Settings'
        },
        icon: CogIcon,
        component: Account,
        children: [
            {
                path: 'settings',
                component: AccountSettings
            },
            {
                path: 'teams',
                component: AccountTeams,
                meta: {
                    title: 'Account - Teams'
                },
                children: [
                    { path: '', component: AccountTeamTeams },
                    { path: 'invitations', component: AccountTeamInvitations }

                ]
            },
            {
                path: 'security',
                component: AccountSecurity,
                meta: {
                    title: 'Account - Security'
                },
                redirect: '/account/security/password',
                children: [
                    { path: 'password', component: AccountSecurityChangePassword }
                // { path: 'sessions', component: AccountSecuritySessions }
                ]
            }
        ]
    },

    {
        path: '/account/create',
        name: 'Sign up',
        meta: {
            requiresLogin: false,
            title: 'Sign Up'
        },
        component: AccountCreate
    },
    {
        name: 'VerifyEmail',
        path: '/account/verify/:token',
        props: true,
        meta: {
            requiresLogin: false
        },
        component: VerifyEmail
    },
    {
        profileLink: true,
        profileMenuIndex: 999,
        path: '/account/logout',
        name: 'Sign out',
        redirect: function () {
            store.dispatch('account/logout')
            return { path: '/' }
        }
    },
    {
        path: '/account/forgot-password',
        name: 'ForgotPassword',
        component: ForgotPassword,
        meta: {
            title: 'Forgot Password',
            requiresLogin: false
        }
    },
    {
        path: '/account/change-password/:token',
        name: 'PasswordReset',
        component: PasswordReset,
        meta: {
            requiresLogin: false
        }
    }
]
