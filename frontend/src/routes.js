import { createRouter, createWebHistory } from 'vue-router'

import Home from '@/pages/Home.vue'
import PageNotFound from '@/pages/PageNotFound'
import PasswordRequest from '@/pages/PasswordRequest'
import PasswordReset from '@/pages/PasswordReset'

import AdminRoutes from '@/pages/admin/routes.js'
import ProjectRoutes from '@/pages/project/routes.js'
import TeamRoutes from '@/pages/team/routes.js'
import AccountRoutes from '@/pages/account/routes.js'
import HelpRoutes from '@/pages/help/routes.js'

const routes = [
    {
        navigationLink: true,
        path: '/',
        name: 'Home',
        component: Home,
        icon: 'HomeIcon'
    },
    ...AccountRoutes,
    ...ProjectRoutes,
    ...TeamRoutes,
    ...AdminRoutes,
    ...HelpRoutes,
    {
        path: '/passwordrequest',
        name: 'PasswordRequest',
        component: PasswordRequest,
        meta: {
            requiresLogin: false
        }
    },
    {
        path: '/passwordreset',
        name: 'PasswordReset',
        component: PasswordReset
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'PageNotFound',
        component: PageNotFound
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
