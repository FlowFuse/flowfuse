<template>
    <ul v-if="updates">
        <li v-for="(update) in updates" :key="update.key">
            <template v-if="update.dif === 'created' || update.dif === 'new'">
                {{ $t('ui.addedP0', { p0: update.key }) }}<template v-if="includeValues(update)">{{ $t('ui.valueP0', { p0: update.new }) }}</template>
            </template>
            <template v-else-if="update.dif === 'updated'">
                <template v-if="update.old && !update.new">
                    {{ $t('ui.clearedP0', { p0: update.key }) }}<template v-if="includeValues(update)">{{ $t('ui.oldValueP0', { p0: update.old }) }}</template>
                </template>
                <template v-else-if="!update.old && update.new">
                    {{ $t('ui.setP0', { p0: update.key }) }}<template v-if="includeValues(update)">{{ $t('ui.valueP02', { p0: update.new }) }}</template>
                </template>
                <template v-else>
                    {{ $t('ui.changedP0', { p0: update.key }) }}<template v-if="includeValues(update)">{{ $t('ui.oldValueP0NewValueP1', { p0: update.old, p1: update.new }) }}</template>
                </template>
            </template>
            <template v-else-if="update.dif === 'deleted'">
                {{ $t('ui.deletedP0', { p0: update.key }) }}<template v-if="includeValues(update)">{{ $t('ui.oldValueP0', { p0: update.old }) }}</template>
            </template>
            <template v-else>{{ $t('ui.p0PropertyP1', { p0: update.dif || $t('ui.unknownActionOn'), p1: update.key }) }}</template>
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
            const oldType = typeof updateItem.old
            const newType = typeof updateItem.new
            if (oldType === 'boolean' && newType === 'boolean') {
                return true // allow boolean value changes to be shown by default
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
