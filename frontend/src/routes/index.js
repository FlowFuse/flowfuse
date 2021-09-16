import { createRouter, createWebHistory } from 'vue-router'

import store from '@/store'

import Home from "@/pages/Home.vue"
import Account from "@/pages/Account/index.vue"
import AccountSettings from "@/pages/account/Settings.vue"
import AccountSecurity from "@/pages/account/Security.vue"
import AccountTeams from "@/pages/account/Teams.vue"
import AccountProjects from "@/pages/account/Projects.vue"

import Organization from "@/pages/org/index.vue"
import OrgSettings from "@/pages/org/Settings.vue"
import OrgUsers from "@/pages/org/Users.vue"
import OrgTeams from "@/pages/org/Teams.vue"

import Project from "@/pages/project/index.vue"
import ProjectOverview from "@/pages/project/Overview.vue"
import ProjectSettings from "@/pages/project/Settings.vue"
import ProjectDebug from "@/pages/project/Debug.vue"
import CreateProject from "@/pages/project/create.vue"


import Team from "@/pages/team/index.vue"
import TeamOverview from "@/pages/team/Overview.vue"
import TeamProjects from "@/pages/team/Projects.vue"
import TeamUsers from "@/pages/team/Users.vue"
import TeamSettings from "@/pages/team/Settings.vue"

import AccessRequest from "@/pages/AccessRequest.vue"

import ensureAdmin from "@/utils/ensureAdmin"

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
            return `/team/${to.params.id}/overview`
        },
        name: 'Team',
        component: Team,
        children: [
            { path: 'overview', component: TeamOverview },
            { path: 'projects', component: TeamProjects },
            { path: 'users', component: TeamUsers },
            { path: 'settings', component: TeamSettings }
        ]
    },
    {
        path: '/account/request/:id',
        component: AccessRequest,
        beforeEnter: (to,_,next) => {
            let watcher;
            function proceed () {
                if (watcher) {
                    watcher();
                }
                if (store.state.account.user) {
                    window.location.href = `/account/complete/${to.params.id}`;
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
    },
    {
        path: '/projects/:id',
        redirect: to => {
            return `/projects/${to.params.id}/overview`
        },
        name: 'Project',
        component: Project,
        children: [
            { path: 'overview', component: ProjectOverview },
            { path: 'settings', component: ProjectSettings },
            { path: 'debug', component: ProjectDebug }
        ],
    },
    {
        path: '/create',
        name: 'CreateProject',
        component: CreateProject
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
            { path: 'teams', component: AccountTeams },
            { path: 'projects', component: AccountProjects }
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
        redirect: function() {
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
