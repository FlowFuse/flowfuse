import { createRouter, createWebHistory } from 'vue-router'

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

/*
    Set Page Title when switching views
*/

// This callback runs before every route change, including on page load.
router.beforeEach((to, from, next) => {
    window.posthog?.capture(
        '$pageleave',
        {
            to: to.fullPath,
            $current_url: from.fullPath
        }
    )
    window.posthog?.capture(
        '$pageview',
        {
            from: from.fullPath,
            $current_url: to.fullPath
        }
    )
    // This goes through the matched routes from last to first, finding the closest route with a title.
    // e.g., if we have `/some/deep/nested/route` and `/some`, `/deep`, and `/nested` have titles,
    // `/nested`'s will be chosen.
    const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title)

    // Find the nearest route element with meta tags.
    const nearestWithMeta = to.matched.slice().reverse().find(r => r.meta && r.meta.metaTags)

    const previousNearestWithMeta = from.matched.slice().reverse().find(r => r.meta && r.meta.metaTags)

    // If a route with a title was found, set the document (page) title to that value.
    if (nearestWithTitle) {
        document.title = nearestWithTitle.meta.title + ' - FlowFuse'
    } else if (previousNearestWithMeta) {
        document.title = previousNearestWithMeta.meta.title + ' - FlowFuse'
    }

    // Remove any stale meta tags from the document using the key attribute we set below.
    Array.from(document.querySelectorAll('[data-vue-router-controlled]')).map(el => el.parentNode.removeChild(el))

    // Skip rendering meta tags if there are none.
    if (!nearestWithMeta) return next()

    // Turn the meta tag definitions into actual elements in the head.
    nearestWithMeta.meta.metaTags.map(tagDef => {
        const tag = document.createElement('meta')

        Object.keys(tagDef).forEach(key => {
            tag.setAttribute(key, tagDef[key])
        })

        // We use this to track which meta tags we create so we don't interfere with other ones.
        tag.setAttribute('data-vue-router-controlled', '')

        return tag
    })
    // Add the meta tags to the document head.
        .forEach(tag => document.head.appendChild(tag))

    next()
})

export default router
