<template>
    <form class="space-y-6">
        <FormHeading>Project Templates
            <template v-slot:tools>
                <router-link :to="{ name: 'Admin Template', params: { id: 'create' } }" class="forge-button pl-2 mb-1"><span class="text-xs">Create template</span></router-link>
            </template>
        </FormHeading>
        <ItemTable :items="templates" :columns="columns" />
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
    <AdminTemplateDeleteDialog @deleteTemplate="deleteTemplate"  ref="adminTemplateDeleteDialog"/>

</template>

<script>
import templatesApi from '@/api/templates'

import ItemTable from '@/components/tables/ItemTable'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

import { markRaw } from "vue"
import { mapState } from 'vuex'
import UserCell from '@/components/tables/cells/UserCell'

import AdminTemplateEditButton from './components/AdminTemplateEditButton'
import AdminTemplateDeleteDialog from './dialogs/AdminTemplateDeleteDialog'


// import AdminStackEditDialog from './dialogs/AdminStackEditDialog'
// import AdminStackEditButton from './AdminStackEditButton'

export default {
    name: 'AdminTemplates',
    mixins: [ Breadcrumbs ],
    data() {
        return {
            templates: [],
            loading: false,
            nextCursor: null,
            columns: [
                {name: "Active", class: ['w-16','text-center'], property: 'active'},
                {name: "Template", class: ['w-56'], property: 'name', link: true},
                {name: "Description", class: ['flex-grow'],  property: 'description' },
                {name: 'Created by', property: 'owner', class:['w-56'], component: { is: markRaw(UserCell) }},
                {name: 'Project Count', class:['w-32','text-center'],property: 'projectCount'},
                {name: '', class: ['w-16','text-center'], component: { is: markRaw(AdminTemplateEditButton)}}
            ]
        }
    },
    async created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin Settings"}},
            {label:"Templates"}
        ]);
        await this.loadItems()
    },
    computed: {
        ...mapState('account',['settings']),
    },
    methods: {
        loadItems: async function() {
            this.loading = true;
            const result = await templatesApi.getTemplates(this.nextCursor,30)
            this.nextCursor = result.meta.next_cursor;
            result.templates.forEach(v => {
                v.onedit = (data) => { this.$router.push({ name: 'Admin Template', params: { id: v.id } }) }
                v.ondelete = (data) => { this.showConfirmTemplateDeleteDialog(v); }
                this.templates.push(v);
            })
        },
        showConfirmTemplateDeleteDialog(stack) {
            this.$refs.adminTemplateDeleteDialog.show(stack);
        },
        async deleteTemplate(template) {
            const result = await templatesApi.deleteTemplate(template.id)
            const index = this.templates.indexOf(template)
            this.templates.splice(index,1)
        },
    },
    components: {
        FormRow,
        FormHeading,
        ItemTable,
        AdminTemplateDeleteDialog
    }
}
</script>
