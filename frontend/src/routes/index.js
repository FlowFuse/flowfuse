import { createRouter, createWebHistory } from 'vue-router'
import Home from "@/pages/Home.vue"
import Account from "@/pages/Account/Account.vue"
import AccountSettings from "@/pages/account/Settings.vue"
import AccountSecurity from "@/pages/account/Security.vue"
import AccountTeams from "@/pages/account/Teams.vue"
import Organization from "@/pages/org/Organization.vue"
import OrgSettings from "@/pages/org/Settings.vue"
import OrgUsers from "@/pages/org/Users.vue"
import OrgTeams from "@/pages/org/Teams.vue"

import Team from "@/pages/team/Team.vue"
import TeamProjects from "@/pages/team/Projects.vue"
import TeamUsers from "@/pages/team/Users.vue"
import TeamSettings from "@/pages/team/Settings.vue"

import store from "@/store"


/**
 * A 'beforeEnter' function that ensures the user is an admin
 */
const ensureAdmin = (to, from, next) => {
    let watcher;
    function proceed () {
        if (watcher) {
            watcher();
        }
        if (store.state.account.user.admin) {
            next()
        } else {
            next('/')
        }
    }
    // Check if we've loaded the current user yet
    if (!store.state.account.user) {
        // Setup a watch
        watcher = store.watch(
            (state) => state.account.user,
            (_) => { proceed() }
        )
    } else {
        proceed()
    }
}
const routes = [
    {
        navigationLink: true,
        path: '/',
        name: 'Home',
        component: Home,
        icon: 'HomeIcon'
    },
    {
        path: '/team/:id',
        redirect: to => {
            return `/team/${to.params.id}/projects`
        },
        name: 'Team',
        component: Team,
        children: [
            { path: 'projects', component: TeamProjects },
            { path: 'users', component: TeamUsers },
            { path: 'settings', component: TeamSettings }
        ],
    },
    {
        profileLink: true,
        path: '/account',
        redirect: '/account/settings',
        name: 'User Settings',
        component: Account,
        children: [
            { path: 'settings', component: AccountSettings },
            { path: 'security', component: AccountSecurity },
            { path: 'teams', component: AccountTeams }
        ],
    },
    {
        profileLink: true,
        adminOnly: true,
        beforeEnter: ensureAdmin,
        path: '/organization/',
        redirect: '/organization/settings',
        name: 'Organization Settings',
        component: Organization,
        children: [
            { path: 'settings', component: OrgSettings },
            { path: 'users', component: OrgUsers },
            { path: 'teams', component: OrgTeams }
        ],
    },
    {
        profileLink: true,
        path: '/account/logout',
        name: 'Sign out',
        redirect: _ => {
            store.dispatch('account/logout');
            return { path: '/' }
        },
    }
]


const router = createRouter({
    history: createWebHistory(),
    routes
})


export default router;
