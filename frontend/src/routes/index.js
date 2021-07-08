import { createRouter, createWebHistory } from 'vue-router'
import Home from "@/pages/Home.vue"
import Account from "@/pages/Account.vue"
import AccountSettings from "@/pages/account/Settings.vue"
import AccountSecurity from "@/pages/account/Security.vue"
import Team from "@/pages/Team.vue"
import store from "@/store"


const routes = [
    {
        navigationLink: true,
        path: '/',
        name: 'Home',
        component: Home,
        icon: 'HomeIcon'
    },
    {
        navigationLink: true,
        path: '/team',
        name: 'Team',
        component: Team,
        icon: 'UserGroupIcon'
    },
    {
        profileLink: true,
        path: '/account',
        name: 'User Settings',
        component: Account,
        children: [
            { path: 'settings', component: AccountSettings },
            { path: 'security', component: AccountSecurity }
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

router.beforeEach((to, _from, next) => {
    if (/^\/account\/?$/.test(to.path)) {
        next('/account/settings')
    } else {
        next();
    }
});
//     if (to.path !== "/" && !store.state.account.user) {
//         next("/")
//     } else {
//         next();
//     }
// });

export default router;
