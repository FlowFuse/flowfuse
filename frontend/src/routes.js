import { createRouter, createWebHistory } from 'vue-router'

import middlewareFactory from './bootstrap/middleware.factory.js'

import Home from './pages/Home.vue'
import PageNotFound from './pages/PageNotFound.vue'

import AccountRoutes from './pages/account/routes.js'
import AdminRoutes from './pages/admin/routes.js'
import ProjectRoutes from './pages/application/routes.js'
import DeviceRoutes from './pages/device/routes.js'
import HelpRoutes from './pages/help/routes.js'
import EditorRoutes from './pages/instance/Editor/routes.js'
import InstanceRoutes from './pages/instance/routes.js'
import TeamRoutes from './pages/team/routes.js'

const routes = [
    {
        navigationLink: true,
        path: '/',
        name: 'Home',
        component: Home,
        icon: 'HomeIcon',
        meta: {
            title: 'Home'
        }
    },
    ...AccountRoutes,
    ...DeviceRoutes,
    ...InstanceRoutes,
    ...ProjectRoutes,
    ...TeamRoutes,
    ...AdminRoutes,
    ...HelpRoutes,
    ...EditorRoutes,
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

router.beforeEach(middlewareFactory(router))

export default router
