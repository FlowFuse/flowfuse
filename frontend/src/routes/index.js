import { createRouter, createWebHistory } from 'vue-router'

import { CogIcon, AdjustmentsIcon } from '@heroicons/vue/outline'

import store from '@/store'
import teamApi from '@/api/team'

import Home from "@/pages/Home.vue"
import Account from "@/pages/account/index.vue"
import AccountSettings from "@/pages/account/Settings.vue"
import AccountSecurity from "@/pages/account/Security.vue"
import AccountSecurityChangePassword from "@/pages/account/Security/ChangePassword.vue"
import AccountSecuritySessions from "@/pages/account/Security/Sessions.vue"
import AccountTeams from "@/pages/account/Teams.vue"

import Admin from "@/pages/admin/index.vue"
import AdminSettings from "@/pages/admin/Settings.vue"
import AdminUsers from "@/pages/admin/Users.vue"
import AdminTeams from "@/pages/admin/Teams.vue"
import AdminCreateUser from "@/pages/admin/createUser.vue"

import Project from "@/pages/project/index.vue"
import ProjectOverview from "@/pages/project/Overview.vue"
import ProjectSettings from "@/pages/project/Settings.vue"
import ProjectDebug from "@/pages/project/Debug.vue"
import ProjectDeploys from "@/pages/project/Deploys.vue"
import ProjectAuditLog from "@/pages/project/AuditLog.vue"
import CreateProject from "@/pages/project/create.vue"


import Team from "@/pages/team/index.vue"
import TeamOverview from "@/pages/team/Overview.vue"
import TeamProjects from "@/pages/team/Projects.vue"
import TeamMembers from "@/pages/team/Members.vue"
import TeamSettings from "@/pages/team/Settings.vue"
import CreateTeam from "@/pages/team/create.vue"

import AccessRequest from "@/pages/AccessRequest.vue"
import PageNotFound from "@/pages/PageNotFound"
import ensureAdmin from "@/utils/ensureAdmin"

const routes = [
    {
        navigationLink: true,
        path: '/',
        name: 'Home',
        component: Home,
        icon: 'HomeIcon',
        // beforeEnter: (to, from, next) => {
            // console.log("beforeEnter")
            // let removeWatch;
            // function proceed () {
            //     if (store.getters['account/team']) {
            //         if (removeWatch) {
            //             removeWatch();
            //         }
            //         router.push({name:"Team", params:{id: store.getters['account/team'].slug}});
            //     } else if (store.getters['account/user']) {
            //         // User logged in already, but no active team
            //         if (removeWatch) {
            //             removeWatch();
            //         }
            //         const defaultTeam = store.getters['account/teams'][0];
            //         store.dispatch('account/setTeam',defaultTeam.slug);
            //         next({name:"Team",params:{id: defaultTeam.slug}})
            //     } else {
            //         console.log("CARRAY ONE")
            //         next()
            //     }
            // }
            // if (store.getters['account/pending']) {
            //     // Setup a watch
            //     removeWatch = store.watch(
            //         (state) => state.account.pending,
            //         (_) => { proceed() }
            //     )
            // } else {
            //     proceed()
            // }
        // }
    },
    {
        path: '/team/create',
        name: 'CreateTeam',
        component: CreateTeam
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
            { path: 'members', component: TeamMembers },
            { path: 'settings', component: TeamSettings }
        ]
    },
    {
        path: '/team/:id/projects/create',
        name: 'CreateTeamProject',
        component: CreateProject
    },
    {
        path: '/account/request/:id',
        component: AccessRequest,
        beforeEnter: (to,_,next) => {
            let removeWatch;
            function proceed () {
                if (removeWatch) {
                    removeWatch();
                }
                if (store.state.account.user) {
                    window.location.href = `/account/complete/${to.params.id}`;
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
        path: '/project/:id',
        redirect: to => {
            return `/project/${to.params.id}/overview`
        },
        name: 'Project',
        component: Project,
        children: [
            { path: 'overview', component: ProjectOverview },
            { path: 'settings', component: ProjectSettings },
            { path: 'deploys', component: ProjectDeploys},
            { path: 'audit-log', component: ProjectAuditLog},
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
        icon: CogIcon,
        component: Account,
        children: [
            { path: 'settings', component: AccountSettings },
            { path: 'teams', component: AccountTeams },
            { path: 'security', component: AccountSecurity, redirect: '/account/security/password', children: [
                { path: 'password', component: AccountSecurityChangePassword },
                { path: 'sessions', component: AccountSecuritySessions }
            ]}
        ],
    },

    {
        path: '/admin/users/create',
        beforeEnter: ensureAdmin,
        name: 'AdminCreateUser',
        component: AdminCreateUser
    },
    {
        profileLink: true,
        adminOnly: true,
        beforeEnter: ensureAdmin,
        path: '/admin/',
        redirect: '/admin/settings',
        name: 'Admin',
        icon: AdjustmentsIcon,
        component: Admin,
        children: [
            { path: 'settings', component: AdminSettings },
            { path: 'users', component: AdminUsers },
            { path: 'teams', component: AdminTeams }
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
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'PageNotFound',
        component: PageNotFound,
    }
]


const router = createRouter({
    history: createWebHistory(),
    routes
})


export default router;
