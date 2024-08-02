<template>
    <ul v-if="updates">
        <li v-for="(update) in updates" :key="update.key">
            <template v-if="update.dif === 'created' || update.dif === 'new'">
                Added: '{{ update.key }}'.
                <template v-if="includeValues(update)">
                    Value: '{{ update.new }}'.
                </template>
            </template>
            <template v-else-if="update.dif === 'updated'">
                <template v-if="update.old && !update.new">
                    Cleared: '{{ update.key }}'.
                    <template v-if="includeValues(update)">
                        Old value: '{{ update.old }}'
                    </template>
                </template>
                <template v-if="!update.old && update.new">
                    Set: '{{ update.key }}'.
                    <template v-if="includeValues(update)">
                        Value: '{{ update.new }}'
                    </template>
                </template>
                <template v-else>
                    Changed: '{{ update.key }}'.
                    <template v-if="includeValues(update)">
                        Old value: '{{ update.old }}'. New value: '{{ update.new }}'.
                    </template>
                </template>
            </template>
            <template v-else-if="update.dif === 'deleted'">
                Deleted: '{{ update.key }}'.
                <template v-if="includeValues(update)">
                    Old value: '{{ update.old }}'
                </template>
            </template>
            <template v-else>{{ update.dif || 'Unknown action on ' }} property: '{{ update.key }}'.</template>
        </li>
    </ul>
</template>

<script>

// Array of keys that are allowed to have extra details shown
const ALLOW_DETAILS = ['name', 'type', 'slug', 'autoSnapshot', /.+\.enabled$/, /.+\.name$/, /.+\.version$/i]

export default {
    name: 'AuditEntryUpdates',
    props: {
        entry: {
            type: Object,
            required: true
        }
    },
    computed: {
        updates () {
            return this.entry.body?.updates && this.entry.body.updates.length ? this.entry.body.updates : null
        }
    },
    methods: {
        includeValues (updateItem) {
            if (!updateItem) {
                return false
            }
            if (ALLOW_DETAILS.includes(updateItem.key)) {
                return true
            }
            const regexTests = ALLOW_DETAILS.filter((allowDetail) => allowDetail instanceof RegExp)
            return regexTests.some((regex) => regex.test(updateItem.key))
        }
    }
}
</script>
