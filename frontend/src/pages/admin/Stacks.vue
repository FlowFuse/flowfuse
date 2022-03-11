<template>
    <form class="space-y-6">
        <FormHeading>Project Stacks
            <template v-slot:tools>
                <button type="button" class="forge-button pl-2 mb-1" @click="showCreateStackDialog"><span class="text-xs">Create stack</span></button>
            </template>
        </FormHeading>
        <ItemTable :items="stacks" :columns="columns" />
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
    <AdminStackEditDialog @stackCreated="stackCreated" @stackUpdated="stackUpdated" ref="adminStackEditDialog"/>
    <AdminStackDeleteDialog @deleteStack="deleteStack"  ref="adminStackDeleteDialog"/>

</template>

<script>
import stacksApi from '@/api/stacks'

import ItemTable from '@/components/tables/ItemTable'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

import { markRaw } from "vue"
import { mapState } from 'vuex'

import AdminStackEditDialog from './dialogs/AdminStackEditDialog'
import AdminStackEditButton from './AdminStackEditButton'
import AdminStackDeleteDialog from './dialogs/AdminStackDeleteDialog'

const StackPropertiesTable = {
    template: `<div>{{properties}}</div>`,
    props: ['properties']
}

export default {
    name: 'AdminStacks',
    mixins: [ Breadcrumbs ],
    data() {
        return {
            stacks: [],
            loading: false,
            nextCursor: null,
            columns: [
                {name: "Stack", class: ['w-56'], property: 'name'},
                {name: "Active", class: ['w-32','text-center'], property: 'active'},
                {name: "Properties", class: ['flex-grow'],  component: { is: markRaw(StackPropertiesTable)} },
                {name: 'Project Count', class:['w-32','text-center'],property: 'projectCount'},
                {name: '', class: ['w-16','text-center'], component: { is: markRaw(AdminStackEditButton)}}
            ]
        }
    },
    async created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin Settings"}},
            {label:"Stacks"}
        ]);
        StackPropertiesTable.template = '<table class="table-auto">'
        Object.entries(this.settings.stacks.properties).forEach(([key, value]) => {
            StackPropertiesTable.template += `<tr><td class="pr-8">${value.label}</td><td>{{properties.${key}}}</td></tr>`
            // tableColumns.push({name: value.label, class:['w-32'], property:`properties.${key}`})
        })
        StackPropertiesTable.template += "</table>"
        await this.loadItems()
    },
    computed: {
        ...mapState('account',['settings']),
    },
    methods: {
        showCreateStackDialog() {
            this.$refs.adminStackEditDialog.show();
        },
        showEditStackDialog(stack) {
            this.$refs.adminStackEditDialog.show(stack);
        },
        showConfirmStackDeleteDialog(stack) {
            this.$refs.adminStackDeleteDialog.show(stack);
        },
        async stackCreated(stack) {
            stack.onedit = (data) => { this.showEditStackDialog(stack); }
            stack.ondelete = (data) => { this.showConfirmStackDeleteDialog(stack); }
            this.stacks.push(stack)
        },
        async stackUpdated(stack) {
            const index = this.stacks.findIndex(s => s.id === stack.id)
            if (index > -1) {
                stack.onedit = (data) => { this.showEditStackDialog(stack); }
                stack.ondelete = (data) => { this.showConfirmStackDeleteDialog(stack); }
                this.stacks[index] = stack
            }
        },
        async deleteStack(stack) {
            const result = await stacksApi.deleteStack(stack.id)
            const index = this.stacks.indexOf(stack)
            this.stacks.splice(index,1)
        },
        loadItems: async function() {
            this.loading = true;
            const result = await stacksApi.getStacks(this.nextCursor,30)
            this.nextCursor = result.meta.next_cursor;
            result.stacks.forEach(v => {
                v.onedit = (data) => { this.showEditStackDialog(v); }
                v.ondelete = (data) => { this.showConfirmStackDeleteDialog(v); }
                this.stacks.push(v);
            })
        },
    },
    components: {
        FormRow,
        FormHeading,
        ItemTable,
        AdminStackEditDialog,
        AdminStackDeleteDialog
    }
}
</script>
