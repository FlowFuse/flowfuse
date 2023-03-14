<template>
    <div class="space-y-6">
        <FormHeading>Instance Types
            <template v-slot:tools>
                <ff-button size="small" @click="showCreateInstanceTypeDialog" data-action="create-type">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create instance type
                </ff-button>
            </template>
        </FormHeading>
        <ff-tile-selection data-el="active-types">
            <ff-tile-selection-option v-for="(instanceType, index) in activeInstanceTypes" :key="index"
                                      :editable="true" @edit="showEditInstanceTypeDialog(instanceType)" :price="instanceType.properties?.billingDescription?.split('/')[0]"
                                      :price-interval="instanceType.properties?.billingDescription?.split('/')[1]"
                                      :label="instanceType.name" :description="instanceType.description"
                                      :meta="[{key: 'Instance Count', value: instanceType.projectCount}, {key: 'Stack Count', value: instanceType.stackCount}]"/>
        </ff-tile-selection>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
        <FormHeading>Inactive Types</FormHeading>
        <ff-data-table :columns="columns" :rows="inactiveInstanceTypes" data-el="inactive-types">
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Edit Instance Type" @click="instanceTypeAction('edit', row.id)"/>
                <ff-list-item label="Delete Instance Type" kind="danger" @click="instanceTypeAction('delete', row.id)"/>
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </div>
    <InstanceTypeEditDialog ref="adminInstanceTypeEditDialog" @instanceTypeCreated="instanceTypeCreated"
                            @instanceTypeUpdated="instanceTypeUpdated" @showDeleteDialog="showConfirmInstanceTypeDeleteDialog"/>
</template>

<script>
import instanceTypesApi from '@/api/instanceTypes'
import FormHeading from '@/components/FormHeading'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import Dialog from '@/services/dialog'

import InstanceTypeEditDialog from './dialogs/InstanceTypeEditDialog'
import InstanceTypeDescriptionCell from './components/InstanceTypeDescriptionCell'
import { PlusSmIcon } from '@heroicons/vue/outline'

const marked = require('marked')

export default {
    name: 'AdminInstanceTypes',
    data () {
        return {
            instanceTypes: [],
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'Type', key: 'name', sortable: true },
                { label: 'Description', key: 'description', sortable: true, component: { is: markRaw(InstanceTypeDescriptionCell) } },
                { label: 'Default Stack', class: ['w-48'], key: 'defaultStack', sortable: true },
                { label: 'Application Instances', class: ['w-32', 'text-center'], key: 'projectCount', sortable: true },
                { label: 'Stacks', class: ['w-32', 'text-center'], key: 'stackCount', sortable: true }
            ]
        }
    },
    async created () {
        await this.loadItems()
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
            const text = instanceType.projectCount > 0 ? 'You cannot delete an instance type that is still being used by instances.' : 'Are you sure you want to delete this instance type?'
            Dialog.show({
                header: 'Delete Instance Type',
                kind: 'danger',
                text,
                confirmLabel: 'Delete',
                disablePrimary: instanceType.projectCount > 0
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
    },
    components: {
        FormHeading,
        PlusSmIcon,
        InstanceTypeEditDialog
    }
}
</script>
