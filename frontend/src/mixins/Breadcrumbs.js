import { mapMutations } from 'vuex';

export default {
    methods: {
        ...mapMutations('breadcrumbs', {
            setBreadcrumbs: 'set',
            clearBreadcrumbs: 'clear',
            replaceBreadcrumb: 'replace',
            replaceLastBreadcrumb: 'replaceLast'
        })
    }
}
