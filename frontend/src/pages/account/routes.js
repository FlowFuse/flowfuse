import { CogIcon } from '@heroicons/vue/outline'

import store from '../../store/index.js'

import AccessRequest from './AccessRequest.vue'
import AccessRequestEditor from './AccessRequestEditor.vue'
import AccountCreate from './Create.vue'
import ForgotPassword from './ForgotPassword.vue'
import PasswordReset from './PasswordReset.vue'
import AccountSecurityChangePassword from './Security/ChangePassword.vue'
import AccountSecurityMFA from './Security/MultiFactorAuth.vue'
import PersonalAccessTokens from './Security/Tokens.vue'
import AccountSecurity from './Security.vue'
import AccountSettings from './Settings.vue'
// import AccountSecuritySessions from "@/pages/account/Security/Sessions.vue"
import AccountTeamInvitations from './Teams/Invitations.vue'
import AccountTeamTeams from './Teams/Teams.vue'
import AccountTeams from './Teams/index.vue'
import VerifyEmail from './VerifyEmail.vue'
import VerifyPendingEmailChange from './VerifyPendingEmailChange.vue'

import Account from './index.vue'

export default [
    {
        // This is the editor being authenticated. This component bounces the user
        // straight back to the editor without any additional actions.
        path: '/account/request/:id/editor',
        component: AccessRequestEditor,
        meta: {
            layout: 'modal'
        }
    },
    {
        // This is the FF Tools Plugin requesting access. This component asks the
        // user to confirm access
        path: '/account/request/:id',
        component: AccessRequest,
        meta: {
            layout: 'modal'
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
                    { name: 'User Invitations', path: 'invitations', component: AccountTeamInvitations }

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
                    { path: 'password', component: AccountSecurityChangePassword },
                    { path: 'mfa', component: AccountSecurityMFA },
                    { path: 'tokens', component: PersonalAccessTokens }
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
        name: 'VerifyPendingEmailChange',
        path: '/account/email_change/:token',
        props: true,
        meta: {
            layout: 'modal',
            requiresLogin: true
        },
        component: VerifyPendingEmailChange
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
