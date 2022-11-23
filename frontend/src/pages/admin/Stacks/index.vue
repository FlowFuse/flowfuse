<template>
    <div class="space-y-6">
        <FormHeading>Active Stacks
        </FormHeading>
        <ff-loading v-if="loadingActive" message="Loading Stacks..." />
        <ff-data-table v-if="!loadingActive" data-el="active-stacks" :columns="activeColumns" :rows="activeStacks"
                       :show-search="true" search-placeholder="Search by Stack Name..."  no-data-message="No Active Stacks Found">
            <template v-slot:actions>
                <ff-button @click="showCreateStackDialog">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create stack
                </ff-button>
            </template>
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Create New Version" @click="stackAction('createNewVersion', row.id)"/>
                <ff-list-item label="Edit Properties" @click="stackAction('editProperties', row.id)"/>
                <ff-list-item label="Delete Stack" kind="danger" @click="stackAction('delete', row.id)"/>
            </template>
        </ff-data-table>
        <div v-if="nextActiveCursor">
            <a v-if="!loadingActive" @click.stop="loadActiveItems" class="forge-button-inline" data-action="load-more-active">Load more...</a>
        </div>
        <FormHeading>Inactive Stacks</FormHeading>
        <ff-loading v-if="loadingInactive" message="Loading Stacks..." />
        <ff-data-table v-if="!loadingInactive" data-el="inactive-stacks" :columns="inactiveColumns" :rows="inactiveStacks"
                       :show-search="true" search-placeholder="Search by Stack Name..." no-data-message="No Inactive Stacks Found">
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Create New Version" @click="stackAction('createNewVersion', row.id)"/>
                <ff-list-item label="Edit Properties" @click="stackAction('editProperties', row.id)"/>
                <ff-list-item label="Delete Stack" kind="danger" @click="stackAction('delete', row.id)"/>
            </template>
        </ff-data-table>
        <div v-if="nextInactiveCursor">
            <a v-if="!loadingInactive" @click.stop="loadInactiveItems" class="forge-button-inline" data-action="load-more-inactive">Load more...</a>
        </div>
    </div>
    <AdminStackEditDialog @stackCreated="stackCreated" @stackUpdated="stackUpdated" ref="adminStackEditDialog"/>
</template>

<script>
import stacksApi from '@/api/stacks'
import projectTypesApi from '@/api/projectTypes'

import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

import FormHeading from '@/components/FormHeading'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import AdminStackEditDialog from './dialogs/AdminStackEditDialog'

import StackPropertiesCell from './components/StackPropertiesCell'

import { PlusSmIcon, DesktopComputerIcon } from '@heroicons/vue/outline'

const StackName = {
    template: `<div class="flex items-center">
        <DesktopComputerIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-grow flex-col space-y-1">
            <span class="text-lg">{{label || name}}</span>
            <span class="text-xs text-gray-500">name: {{ name }}</span>
            <span class="text-xs text-gray-500">id: {{id}}</span>
            <span v-if="projectTypeName" class="text-xs text-gray-500">type: {{projectTypeName}}</span>
        </div>
    </div>`,
    props: ['id', 'name', 'label', 'description', 'projectTypeName'],
    components: { DesktopComputerIcon }
}

function comparator (A, B) {
    if (A.projectType === B.projectType) {
        return A.createdAt.localeCompare(B.createdAt)
    } else {
        if (!A.projectType) {
            return -1
        }
        if (!B.projectType) {
            return 1
        }
        return this.projectTypes[A.projectType].order - this.projectTypes[B.projectType].order
    }
}

export default {
    name: 'AdminStacks',
    data () {
        return {
            allStacks: new Map(),
            projectTypes: [],
            loadingActive: false,
            loadingInactive: false,
            nextActiveCursor: null,
            nextInactiveCursor: null,
            activeColumns: [
                { label: 'Stack', key: 'name', component: { is: markRaw(StackName) } },
                { label: 'Properties', component: { is: markRaw(StackPropertiesCell) } },
                { label: 'Project Count', key: 'projectCount', class: ['w-32', 'text-center'] }
            ],
            inactiveColumns: [
                { label: 'Stack', component: { is: markRaw(StackName) } },
                { label: 'Properties', component: { is: markRaw(StackPropertiesCell) } },
                { label: 'Replaced By', key: 'replacedBy', class: ['w-56'] },
                { label: 'Project Count', key: 'projectCount', class: ['w-32', 'text-center'] }
            ]
        }
    },
    async created () {
        const result = await projectTypesApi.getProjectTypes(null, 100, 'all')
        result.types.forEach(pt => {
            this.projectTypes[pt.id] = pt
        })
        this.loadInactiveItems()
        this.loadActiveItems()
    },
    computed: {
        ...mapState('account', ['settings']),
        stacksArray () {
            return Array.from(this.allStacks.values())
        },
        activeStacks () {
            return this.stacksArray.filter((stack) => stack.active).sort(comparator.bind(this))
        },
        inactiveStacks () {
            return this.stacksArray.filter((stack) => !stack.active).sort(comparator.bind(this))
        }
    },
    methods: {
        stackAction (action, stackId) {
            const stack = this.allStacks.get(stackId)
            if (stack) {
                switch (action) {
                case 'editProperties':
                    this.$refs.adminStackEditDialog.showEdit(stack)
                    break
                case 'delete': {
                    const text = stack.projectCount > 0 ? 'You cannot delete a stack that is still being used by projects.' : 'Are you sure you want to delete this stack?'
                    Dialog.show({
                        header: 'Delete Stack',
                        kind: 'danger',
                        text,
                        confirmLabel: 'Delete',
                        disablePrimary: stack.projectCount > 0
                    }, async () => {
                        // on confirm - delete the stack
                        stacksApi.deleteStack(stack.id)
                            .then(() => {
                                this.allStacks.delete(stack.id)
                            })
                            .catch((err) => {
                                if (err.response && err.response.data && err.response.data.error) {
                                    Alerts.emit(err.response.data.error, 'warning')
                                } else {
                                    Alerts.emit(err.message, 'warning')
                                }
                            })
                    })
                    break
                }
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
            this.allStacks.set(stack.id, stack)

            if (stack.projectType) {
                stack.projectTypeName = this.projectTypes[stack.projectType]?.name
            }
            if (replaced) {
                this.stackUpdated(replaced)
            }
        },
        async stackUpdated (stack) {
            this.allStacks.set(stack.id, stack)

            if (stack.projectType) {
                stack.projectTypeName = this.projectTypes[stack.projectType]?.name
            }
        },
        loadActiveItems: async function () {
            this.loadingActive = true
            const result = await stacksApi.getStacks(this.nextActiveCursor, 30, 'active')
            this.nextActiveCursor = result.meta.next_cursor
            result.stacks.forEach(stack => {
                if (stack.projectType) {
                    stack.projectTypeName = this.projectTypes[stack.projectType]?.name
                }
                this.allStacks.set(stack.id, stack)
            })
            this.loadingActive = false
        },
        loadInactiveItems: async function () {
            this.loadingInactive = true
            const result = await stacksApi.getStacks(this.nextInactiveCursor, 30, 'inactive')
            this.nextInactiveCursor = result.meta.next_cursor
            result.stacks.forEach(stack => {
                if (stack.projectType) {
                    stack.projectTypeName = this.projectTypes[stack.projectType]?.name
                }
                this.allStacks.set(stack.id, stack)
            })
            this.loadingInactive = false
        }
    },
    components: {
        FormHeading,
        AdminStackEditDialog,
        PlusSmIcon
    }
}
</script>
