<template>
<div class="text-sm w-full border rounded border-gray-300 overflow-hidden mb-4">
    <div class="flex font-medium bg-gray-100 items-center">
        <template v-for="(col, colIdx) in columns" :key="col.name">
            <div class="p-3" :class="[{'flex-grow':colIdx == 0, 'w-40': colIdx > 0},...(col.class||[])]">{{ col.name }}</div>
        </template>
    </div>
    <template v-for="(item, itemIdx) in items">
        <div class="flex border-t border-gray-300 items-center hover:bg-blue-100">
            <template v-for="(col, colIdx) in columns" :key="col.name">
                <div class="p-3 pl-4" :class="[{'flex-grow':colIdx == 0, 'w-40': colIdx > 0},...(col.class||[])]">
                    <template v-if="col.component">
                        <component :is="col.component.is" v-bind="item"></component>
                    </template>
                    <template v-else-if="col.link && ((typeof col.link === 'boolean' && item.link) || (item[col.link]))">
                        <router-link v-if="!col.external" :to="(typeof col.link === 'boolean' && item.link) || item[col.link]">{{ col.value || item[col.property] }}</router-link>
                        <a v-else :href="(typeof col.link === 'boolean' && item.link) || item[col.link]" target="_blank">{{ col.value || item[col.property] }}</a>
                    </template>
                    <template v-else>{{ item[col.property] }}</template>
                </div>
            </template>
        </div>
    </template>
</div>
</template>
<script>

/**
 * TODO: how to pass in custom component for table cell. For example, team/user tables
 * should include avatar next to name without it being its own column
 * <img class="rounded-md mr-3 w-6 inline" :src="item.avatar"/>
 */
export default {
    name: "ItemTable",
    props: ['items', 'columns'],
}
</script>
