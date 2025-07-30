<template>
    <div id="table-schema">
        <div class="header">
            <div class="flex content">
                <h2 class="title flex-grow"><i>{{ table.name }}</i> schema</h2>
            </div>
        </div>
        <div class="content-wrapper">
            <h3>Columns</h3>
            <div class="header grid grid-cols-10 gap-1 mb-1">
                <span class="col-span-2 title">Name</span>
                <span class="col-span-2 title">Type</span>
                <span class="col-span-2 title">Nullable</span>
                <span class="col-span-2 title">Default</span>
                <span class="col-span-2 title">Generated</span>
            </div>
            <ul>
                <li v-for="(col, $key) in table.schema" :key="$key">
                    <div class="grid grid-cols-10 gap-1 mb-1">
                        <span class="col-span-2 value truncate cursor-default" :title="col.name">{{ col.name }}</span>
                        <span class="col-span-2 value truncate cursor-default" :title="col.type">{{ col.type }}</span>
                        <span class="col-span-2 value truncate cursor-default" :title="col.nullable">{{ col.nullable }}</span>
                        <span class="col-span-2 value truncate cursor-default" :title="col.default">{{ col.default }}</span>
                        <span class="col-span-2 value truncate cursor-default" :title="col.generated">{{ col.generated }}</span>
                    </div>
                </li>
            </ul>
        </div>
        <div class="footer flex gap-3">
            <ff-button type="button" kind="secondary" class="w-full" @click="closeRightDrawer">Close</ff-button>
            <ff-button
                type="button"
                kind="danger"
                class="w-full"
                @click="submit"
            >
                Delete Table
            </ff-button>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions, mapState } from 'vuex'

import Alerts from '../../../../../../services/alerts.js'
import Dialog from '../../../../../../services/dialog.js'

export default defineComponent({
    name: 'TableSchema',
    props: {
        table: {
            type: Object,
            required: true
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer']),
        ...mapActions('product/tables', ['deleteTable', 'getTables']),
        submit () {
            Dialog.show({
                header: 'Delete Table',
                text: `Are you sure you want to delete table ${this.table.name}`,
                confirmLabel: 'Delete',
                kind: 'danger'
            }, () => this.deleteTable({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName: this.table.name
            })
                .then(() => this.getTables(this.$route.params.id))
                .then(() => this.closeRightDrawer())
                .then(() => Alerts.emit('Table deleted successfully', 'confirmation'))
                .catch(e => e))
        }
    }
})
</script>

<style scoped lang="scss">
#table-schema {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: $ff-grey-50;

    > .header {
        border-bottom: 1px solid $ff-grey-300;
        padding: 10px 0;
        width: 100%;
        background: $ff-white;

        .content {
            padding: 0 12px;
            display: flex;
            align-items: baseline;

            .title {
                margin: 0;
                color: $ff-grey-800;
                font-weight: bold;
                font-size: 1.25rem;
                line-height: 1.75rem;
            }
        }
    }

    .content-wrapper {
        flex: 1;
        width: 100%;
        background-color: $ff-grey-50;
        overflow: auto;
        padding: 12px;

        .header {
            .title {
                color: $ff-grey-600;
                font-size: 10px;
            }
        }
    }

    .footer {
        background: $ff-white;
        padding: 10px 12px;
        border-top: 1px solid $ff-grey-300;
    }
}
</style>
