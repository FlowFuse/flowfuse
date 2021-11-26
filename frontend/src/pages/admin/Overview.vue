<template>
    <div class="max-w-2xl mx-auto grid grid-cols-3 gap-4 text-gray-700">
        <div class="border rounded p-4 text-center">
            <div class="text-xl">{{stats.userCount}}</div>
            <div>Users</div>
            <div class="text-left px-3 text-xs mt-1">
                <div>{{stats.adminCount}} {{ $filters.pluralize(stats.adminCount,'admin')}}</div>
                <div>{{stats.inviteCount}} pending {{ $filters.pluralize(stats.inviteCount,'invite')}}</div>
            </div>
        </div>
        <div class="border rounded p-4 text-center">
            <div class="text-xl">{{stats.teamCount}}</div>
            <div>{{ $filters.pluralize(stats.teamCount,'Team')}}</div>
        </div>
        <div class="border rounded p-4 text-center">
            <div class="text-xl">{{stats.projectCount}}</div>
            <div>{{ $filters.pluralize(stats.projectCount,'Project')}}</div>
        </div>
    </div>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import adminApi from '@/api/admin'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'AdminSettingsGeneral',
    mixins: [ Breadcrumbs ],
    components: {
        FormRow,
        FormHeading
    },
    data: function() {
        return {
            stats: {},
        }
    },
    async mounted() {
        const stats = await adminApi.getStats();
        this.stats = stats;
    },
    created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}},
            {label:"Overview"}
        ]);
    },
}
</script>
