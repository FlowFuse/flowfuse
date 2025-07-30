<template>
    <div id="create-table">
        <div class="header">
            <div class="flex content">
                <h2 class="title flex-grow">Create a new table</h2>
            </div>
        </div>
        <div class="content-wrapper">
            <div class="header grid grid-cols-12 gap-1 mb-1">
                <span class="col-span-3 title">Name</span>
                <span class="col-span-2 title">Type</span>
                <span class="col-span-2 title">Default</span>
                <span class="col-span-2 title">Options</span>
                <span class="col-span-1 title -ml-1">Nullable</span>
                <span class="col-span-1 title -ml-2">Unsigned</span>
            </div>
            <ul class="columns">
                <li v-for="(column, $key) in columns" :key="$key">
                    <table-column :column="column" @remove="removeColumn($key)" />
                </li>
            </ul>
            <ff-button type="button" kind="secondary" class="w-full" @click="onNewColumn">Add a new column</ff-button>
        </div>
        <div class="footer flex gap-3">
            <ff-button type="button" kind="secondary" class="w-full" @click="closeRightDrawer">Cancel</ff-button>
            <ff-button type="button" kind="primary" class="w-full" :disabled="!isFormValid">Save</ff-button>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions } from 'vuex'

import TableColumn from './TableColumn.vue'
const emptyColumn = {
    name: '',
    type: '',
    nullable: false,
    default: '',
    hasDefault: false,
    unsigned: false
}

export default defineComponent({
    name: 'CreateTable',
    components: { TableColumn },
    data () {
        return {
            columns: [{ ...emptyColumn }]
        }
    },
    computed: {
        isFormValid () {
            return !this.columns.map(col => {
                if (col._errors_ === true) return true
                return !col.name || !col.type
            }).includes(true)
        }
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer']),
        onNewColumn () {
            this.columns.push({ ...emptyColumn })
        },
        removeColumn (key) {
            this.columns.splice(key, 1)
        }
    }
})
</script>

<style lang="scss">

#create-table {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: $ff-grey-50;

    > .header {
        border-bottom: 1px solid $ff-grey-300;
        padding: 10px 0;
        width: 100%;

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
        background-color: $ff-grey-100;
        overflow: auto;
        padding: 12px;

        .header {
            .title {
                color: $ff-grey-600;
                font-size: 10px;
            }
        }

        .columns {
            margin-bottom: 20px;
        }
    }

    .footer {
        padding: 10px 12px;
        border-top: 1px solid $ff-grey-300;
    }
}
</style>
