<template>
    <form class="space-y-6">
        <FormHeading>Project Stacks
            <template v-slot:tools>
                <ff-button size="small" @click="showCreateStackDialog">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create stack
                </ff-button>
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
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import AdminStackEditButton from './components/AdminStackEditButton'
import AdminStackEditDialog from './dialogs/AdminStackEditDialog'
import AdminStackDeleteDialog from './dialogs/AdminStackDeleteDialog'

import StackPropertiesCell from './components/StackPropertiesCell'

import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'AdminStacks',
    mixins: [Breadcrumbs],
    data () {
        return {
            stacks: [],
            loading: false,
            nextCursor: null,
            columns: [
                { name: 'Stack', class: ['w-56'], property: 'name' },
                { name: 'Active', class: ['w-32', 'text-center'], property: 'active' },
                { name: 'Properties', class: ['flex-grow'], component: { is: markRaw(StackPropertiesCell) } },
                { name: 'Project Count', class: ['w-32', 'text-center'], property: 'projectCount' },
                { name: '', class: ['w-16', 'text-center'], component: { is: markRaw(AdminStackEditButton) } }
            ]
        }
    },
    async created () {
        this.setBreadcrumbs([
            { label: 'Admin', to: { name: 'Admin Settings' } },
            { label: 'Stacks' }
        ])
        await this.loadItems()
    },
    computed: {
        ...mapState('account', ['settings'])
    },
    methods: {
        showCreateStackDialog () {
            this.$refs.adminStackEditDialog.show()
        },
        showEditStackDialog (stack) {
            this.$refs.adminStackEditDialog.show(stack)
        },
        showConfirmStackDeleteDialog (stack) {
            this.$refs.adminStackDeleteDialog.show(stack)
        },
        async stackCreated (stack) {
            stack.onedit = (data) => { this.showEditStackDialog(stack) }
            stack.ondelete = (data) => { this.showConfirmStackDeleteDialog(stack) }
            this.stacks.push(stack)
        },
        async stackUpdated (stack) {
            const index = this.stacks.findIndex(s => s.id === stack.id)
            if (index > -1) {
                stack.onedit = (data) => { this.showEditStackDialog(stack) }
                stack.ondelete = (data) => { this.showConfirmStackDeleteDialog(stack) }
                this.stacks[index] = stack
            }
        },
        async deleteStack (stack) {
            await stacksApi.deleteStack(stack.id)
            const index = this.stacks.indexOf(stack)
            this.stacks.splice(index, 1)
        },
        loadItems: async function () {
            this.loading = true
            const result = await stacksApi.getStacks(this.nextCursor, 30)
            this.nextCursor = result.meta.next_cursor
            result.stacks.forEach(v => {
                v.onedit = (data) => { this.showEditStackDialog(v) }
                v.ondelete = (data) => { this.showConfirmStackDeleteDialog(v) }
                this.stacks.push(v)
            })
        }
    },
    components: {
        FormHeading,
        ItemTable,
        AdminStackEditDialog,
        AdminStackDeleteDialog,
        PlusSmIcon
    }
}
</script>
