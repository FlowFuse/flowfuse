<template>
    <form class="space-y-6">
        <FormHeading>Active Stacks
            <template v-slot:tools>
                <ff-button size="small" @click="showCreateStackDialog">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create stack
                </ff-button>
            </template>
        </FormHeading>
        <ff-loading v-if="loadingActive" message="Loading Stacks..." />
        <ItemTable v-if="!loadingActive" :items="activeStacks" :columns="activeColumns" @stackAction="stackAction" />
        <div v-if="nextActiveCursor">
            <a v-if="!loadingActive" @click.stop="loadActiveItems" class="forge-button-inline">Load more...</a>
        </div>
        <FormHeading>Inactive Stacks</FormHeading>
        <ff-loading v-if="loadingInactive" message="Loading Stacks..." />
        <ItemTable v-if="!loadingInactive" :items="inactiveStacks" :columns="inactiveColumns" @stackAction="stackAction" />
        <div v-if="nextInactiveCursor">
            <a v-if="!loadingInactive" @click.stop="loadInactiveItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
    <AdminStackEditDialog @stackCreated="stackCreated" @stackUpdated="stackUpdated" ref="adminStackEditDialog"/>
    <AdminStackDeleteDialog @deleteStack="deleteStack" ref="adminStackDeleteDialog"/>

</template>

<script>
import stacksApi from '@/api/stacks'

import ItemTable from '@/components/tables/ItemTable'
import FormHeading from '@/components/FormHeading'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import AdminStackEditButton from './components/AdminStackEditButton'
import AdminStackEditDialog from './dialogs/AdminStackEditDialog'
import AdminStackDeleteDialog from './dialogs/AdminStackDeleteDialog'

import StackPropertiesCell from './components/StackPropertiesCell'

import { PlusSmIcon, DesktopComputerIcon } from '@heroicons/vue/outline'

const StackName = {
    template: `<div class="flex items-center">
        <DesktopComputerIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-grow flex-col space-y-1">
            <span class="text-lg">{{name}}</span>
            <span class="text-xs text-gray-500">id: {{id}}</span>
        </div>
    </div>`,
    props: ['id', 'name', 'description'],
    components: { DesktopComputerIcon }
}
export default {
    name: 'AdminStacks',
    data () {
        return {
            allStacks: {},
            activeStacks: [],
            inactiveStacks: [],
            loadingActive: false,
            loadingInactive: false,
            nextActiveCursor: null,
            nextInactiveCursor: null,
            activeColumns: [
                { name: 'Stack', component: { is: markRaw(StackName) } },
                { name: 'Properties', component: { is: markRaw(StackPropertiesCell) } },
                { name: 'Project Count', class: ['w-32', 'text-center'], property: 'projectCount' },
                { name: '', class: ['w-16', 'text-center'], component: { is: markRaw(AdminStackEditButton) } }
            ],
            inactiveColumns: [
                { name: 'Stack', component: { is: markRaw(StackName) } },
                { name: 'Properties', component: { is: markRaw(StackPropertiesCell) } },
                { name: 'Replaced By', class: ['w-56'], property: 'replacedBy' },
                { name: 'Project Count', class: ['w-32', 'text-center'], property: 'projectCount' },
                { name: '', class: ['w-16', 'text-center'], component: { is: markRaw(AdminStackEditButton) } }
            ]
        }
    },
    async created () {
        await this.loadInactiveItems()
        await this.loadActiveItems()
    },
    computed: {
        ...mapState('account', ['settings'])
    },
    methods: {
        stackAction (action, stackId) {
            const stack = this.allStacks[stackId]
            if (stack) {
                switch (action) {
                case 'editProperties':
                    this.$refs.adminStackEditDialog.showEdit(stack)
                    break
                case 'delete':
                    this.$refs.adminStackDeleteDialog.show(stack)
                    break
                case 'createNewVersion':
                    this.$refs.adminStackEditDialog.showCreateVersion(stack)
                }
            }
        },
        showCreateStackDialog () {
            this.$refs.adminStackEditDialog.showCreate()
        },
        async stackCreated (stack, replaced) {
            // stack.onedit = (data) => { this.showEditStackDialog(stack) }
            // stack.ondelete = (data) => { this.showConfirmStackDeleteDialog(stack) }
            if (stack.active) {
                this.activeStacks.push(stack)
            } else {
                this.inactiveStacks.push(stack)
            }
            this.allStacks[stack.id] = stack
            if (replaced) {
                this.stackUpdated(replaced)
            }
        },
        async stackUpdated (stack) {
            // This stack might have moved between the active/inactive lists.
            const activeIndex = this.activeStacks.findIndex(s => s.id === stack.id)
            if (activeIndex > -1) {
                // Found in the active list
                if (stack.active) {
                    // update in place
                    this.activeStacks[activeIndex] = stack
                } else {
                    this.activeStacks.splice(activeIndex, 1)
                    this.inactiveStacks.push(stack)
                }
            } else {
                const inactiveIndex = this.inactiveStacks.findIndex(s => s.id === stack.id)
                if (inactiveIndex > -1) {
                    // Found in the active list
                    if (stack.inactive) {
                        // update in place
                        this.inactiveStacks[inactiveIndex] = stack
                    } else {
                        this.inactiveStacks.splice(inactiveIndex, 1)
                        this.activeStacks.push(stack)
                    }
                } // else - not found anywhere..!
            }
        },
        async deleteStack (stack) {
            await stacksApi.deleteStack(stack.id)
            if (stack.active) {
                const index = this.activeStacks.indexOf(stack)
                this.activeStacks.splice(index, 1)
            } else {
                const index = this.inactiveStacks.indexOf(stack)
                this.inactiveStacks.splice(index, 1)
            }
            delete this.allStacks[stack.id]
        },
        loadActiveItems: async function () {
            this.loadingActive = true
            const result = await stacksApi.getStacks(this.nextCursor, 30, 'active')
            this.nextActiveCursor = result.meta.next_cursor
            result.stacks.forEach(v => {
                this.activeStacks.push(v)
                this.allStacks[v.id] = v
            })
            this.loadingActive = false
        },
        loadInactiveItems: async function () {
            this.loadingInactive = true
            const result = await stacksApi.getStacks(this.nextCursor, 30, 'inactive')
            this.nextInactiveCursor = result.meta.next_cursor
            result.stacks.forEach(v => {
                this.inactiveStacks.push(v)
                this.allStacks[v.id] = v
            })
            this.loadingInactive = false
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
