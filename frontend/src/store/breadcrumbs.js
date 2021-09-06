export default {
    namespaced: true,
    state: {
        breadcrumbs: [],
    },
    mutations: {
        set(state, breadcrumbs) {
            state.breadcrumbs = breadcrumbs;
        },
        replace(state, replacements) {
            state.breadcrumbs = state.breadcrumbs.map(crumb => {
                if (replacements.hasOwnProperty(crumb.value)) {
                    return replacements[crumb.value]
                }
                return crumb
            })
        },
        replaceLast(state, crumb) {
            state.breadcrumbs.splice(state.breadcrumbs.length-1,1,crumb);
        },
        clear(state) {
            state.breadcrumbs = [];
        }
    }
}
