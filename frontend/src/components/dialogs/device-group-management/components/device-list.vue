<template>
    <ff-accordion
        class="device-list-accordion max-h-[500px]"
        :label="$t('ui.showSelection')"
        data-el="selection-accordion"
        :overflows-content="true"
    >
        <template #meta>
            <span class="italic text-gray-500">{{ devices.length }} {{ $t('ui.plRemoteInstance', devices.length) }}</span>
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
                        class="hover:text-indigo-900 hover:bg-transparent!"
                        @click="onRemoveFromSelection(row)"
                    >
                        {{ $t('ui.remove') }}
                    </ff-button>
                </template>
            </ff-data-table>
        </template>
    </ff-accordion>
</template>

<script>
import { mapState } from 'pinia'

import { pluralize } from '../../../../composables/strings/String.js'
import { t } from '../../../../i18n.js'
import FfDataTable from '../../../../ui-components/components/data-table/DataTable.vue'
import Accordion from '../../../Accordion.vue'

import { useUxDialogStore } from '@/stores/ux-dialog.js'

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
        ...mapState(useUxDialogStore, ['dialog']),
        columns () {
            return [
                { label: t('ui.name'), key: 'name', class: ['grow'], sortable: true },
                { label: t('ui.application'), key: 'application.name', sortable: true },
                { label: t('ui.instance2'), key: 'instance.name', sortable: true }
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
