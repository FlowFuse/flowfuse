<template>
    <ff-accordion
        class="device-list-accordion max-h-[500px]"
        label="Show selection"
        data-el="selection-accordion"
        :overflows-content="true"
    >
        <template #meta>
            <span class="italic text-gray-500">{{ devices.length }} Remote {{ pluralize('Instance', devices.length) }}</span>
        </template>
        <template #content>
            <ff-data-table
                :key="dialog.is.payload.devices.length"
                :rows="dialog.is.payload.devices" :columns="columns"
                class="mt-3"
            >
                <template #row-actions="{row}">
                    <ff-button
                        kind="tertiary"
                        :disabled="dialog.is.payload.devices.length === 1"
                        class="hover:text-indigo-900 hover:!bg-transparent"
                        @click="onRemoveFromSelection(row)"
                    >
                        Remove
                    </ff-button>
                </template>
            </ff-data-table>
        </template>
    </ff-accordion>
</template>

<script>
import { mapState } from 'vuex'

import { pluralize } from '../../../../composables/String.js'
import FfDataTable from '../../../../ui-components/components/data-table/DataTable.vue'
import Accordion from '../../../Accordion.vue'

export default {
    name: 'device-list',
    components: {
        FfDataTable,
        'ff-accordion': Accordion
    },
    props: {
        devices: {
            required: true,
            type: Array
        }
    },
    emits: ['selection-removed'],
    computed: {
        ...mapState('ux/dialog', ['dialog']),
        columns () {
            return [
                { label: 'Name', key: 'name', class: ['flex-grow'], sortable: true },
                { label: 'Application', key: 'application.name', sortable: true },
                { label: 'Instance', key: 'instance.name', sortable: true }
            ]
        }
    },
    methods: {
        pluralize,
        onRemoveFromSelection (row) {
            this.$emit('selection-removed', row)
        }
    }
}
</script>

<style lang="scss">
.device-list-accordion {
    &.ff-accordion {
        margin-bottom: 0;

        button {
            border-top: none;
            border-left: none;
            border-right: none;
            background: transparent;
            transition: background-color ease-in-out .3s;
            padding-left: 0;
            padding-right: 0;

            label {
                font-weight: normal;
            }

            &:hover {
                background-color: transparent;
            }
        }
    }
}
</style>
