<template>
    <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
    <div class="space-y-6 mb-14">
        <SectionTopMenu hero="Instance Types">
            <template #tools>
                <ff-button data-action="create-type" @click="showCreateInstanceTypeDialog">
                    <template #icon-right>
                        <PlusSmIcon />
                    </template>
                    Create instance type
                </ff-button>
            </template>
        </SectionTopMenu>
        <ff-tile-selection data-el="active-types">
            <ff-tile-selection-option
                v-for="(instanceType, index) in activeInstanceTypes" :key="index" value=""
                :editable="true" :price="instanceType.properties?.billingDescription?.split('/')[0]"
                :price-interval="instanceType.properties?.billingDescription?.split('/')[1]"
                :label="instanceType.name"
                :description="instanceType.description" :meta="[{key: 'ID', value: instanceType.id}, {key: 'Instance Count', value: instanceType.instanceCount}, {key: 'Stack Count', value: instanceType.stackCount}]"
                @edit="showEditInstanceTypeDialog(instanceType)"
            />
        </ff-tile-selection>
        <div v-if="nextCursor">
            <a v-if="!loading" class="forge-button-inline" @click.stop="loadItems">Load more...</a>
        </div>
        <SectionTopMenu hero="Inactive Types" />
        <ff-data-table :columns="columns" :rows="inactiveInstanceTypes" data-el="inactive-types">
            <template #context-menu="{row}">
                <ff-list-item label="Edit Instance Type" @click="instanceTypeAction('edit', row.id)" />
                <ff-list-item label="Delete Instance Type" kind="danger" @click="instanceTypeAction('delete', row.id)" />
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" class="forge-button-inline" @click.stop="loadItems">Load more...</a>
        </div>
    </div>
    <InstanceTypeEditDialog
        ref="adminInstanceTypeEditDialog"
        @instance-type-created="instanceTypeCreated"
        @instance-type-updated="instanceTypeUpdated"
        @show-delete-dialog="showConfirmInstanceTypeDeleteDialog"
    />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import { mapState } from 'vuex'

import instanceTypesApi from '../../../api/instanceTypes.js'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'

import MarkdownCell from '../../../components/tables/cells/MarkdownCell.vue'
import Dialog from '../../../services/dialog.js'

import InstanceTypeEditDialog from './dialogs/InstanceTypeEditDialog.vue'

const marked = require('marked')

export default {
    name: 'AdminInstanceTypes',
    components: {
        SectionTopMenu,
        PlusSmIcon,
        InstanceTypeEditDialog
    },
    data () {
        return {
            instanceTypes: [],
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'ID', key: 'id', sortable: true, class: ['w-32'] },
                { label: 'Type', key: 'name', sortable: true },
                { label: 'Description', key: 'description', sortable: true, component: { is: markRaw(MarkdownCell), map: { markdown: 'description' } } },
                { label: 'Default Stack', class: ['w-48'], key: 'defaultStack', sortable: true },
                { label: 'Application Instances', class: ['w-32', 'text-center'], key: 'instanceCount', sortable: true },
                { label: 'Stacks', class: ['w-32', 'text-center'], key: 'stackCount', sortable: true }
            ]
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        activeInstanceTypes () {
            const types = this.instanceTypes.filter(pt => pt.active)
            return types
        },
        inactiveInstanceTypes () {
            const types = this.instanceTypes.filter(pt => !pt.active)
            return types
        }
    },
    async created () {
        await this.loadItems()
    },
    methods: {
        instanceTypeAction (action, id) {
            const index = this.instanceTypes.findIndex(pt => pt.id === id)
            const instanceType = this.instanceTypes[index]

            switch (action) {
            case 'edit':
                this.showEditInstanceTypeDialog(instanceType)
                break
            case 'delete': {
                this.showConfirmInstanceTypeDeleteDialog(instanceType)
                break
            }
            }
        },
        showCreateInstanceTypeDialog () {
            this.$refs.adminInstanceTypeEditDialog.show()
        },
        showEditInstanceTypeDialog (instanceType) {
            this.$refs.adminInstanceTypeEditDialog.show(instanceType)
        },
        showConfirmInstanceTypeDeleteDialog (instanceType) {
            const text = instanceType.instanceCount > 0 ? 'You cannot delete an instance type that is still being used by instances.' : 'Are you sure you want to delete this instance type?'
            Dialog.show({
                header: 'Delete Instance Type',
                kind: 'danger',
                text,
                confirmLabel: 'Delete',
                disablePrimary: instanceType.instanceCount > 0
            }, async () => {
                // on confirm - delete the instance type
                await instanceTypesApi.deleteInstanceType(instanceType.id)
                const index = this.instanceTypes.findIndex(pt => pt.id === instanceType.id)
                this.instanceTypes.splice(index, 1)
            })
        },
        async instanceTypeCreated (instanceType) {
            this.instanceTypes.push(instanceType)
            this.resortTypes()
        },
        async instanceTypeUpdated (instanceType) {
            const index = this.instanceTypes.findIndex(s => s.id === instanceType.id)
            if (index > -1) {
                instanceType.htmlDescription = marked.parse(instanceType.description)
                this.instanceTypes[index] = instanceType
                this.resortTypes()
            }
        },
        resortTypes () {
            this.instanceTypes.sort((A, B) => {
                if (A.order !== B.order) {
                    return A.order - B.order
                } else {
                    return A.name.localeCompare(B.name)
                }
            })
        },
        // async deleteStack (stack) {
        //     await stacksApi.deleteStack(stack.id)
        //     const index = this.stacks.indexOf(stack)
        //     this.stacks.splice(index, 1)
        // },
        loadItems: async function () {
            this.loading = true
            const result = await instanceTypesApi.getInstanceTypes(this.nextCursor, 30, 'all')
            this.nextCursor = result.meta.next_cursor
            result.types.forEach(v => {
                this.instanceTypes.push(v)
            })
        }
    }
}
</script>
