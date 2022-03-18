<template>
    <table class="text-sm w-full rounded ring-1 ring-gray-200 border-gray-200 mb-4">
        <thead>
            <tr class="font-medium bg-gray-100">
                <template v-for="col in columns" :key="col.name">
                    <th class="px-3 py-1 border-b first:rounded-tl last:rounded-tr" :class="col.class">{{ col.name }}</th>
                </template>
            </tr>
        </thead>
        <tbody>
            <template v-if="items.length === 0">
                <tr class="">
                    <td v-for="(col, colIdx) in columns" :key="colIdx" class="px-4 py-3 first:rounded-bl last:rounded-br" :class="col.class||[]">&nbsp;</td>
                </tr>
            </template>
            <template v-for="(item, itemIdx) in items" :key="itemIdx">
                <tr class="even:bg-gray-50">
                    <template v-for="col in columns" :key="col.name">
                        <td class="px-4 py-3" :class="[...(col.class||[]),itemIdx===items.length-1?'first:rounded-bl last:rounded-br':'']">
                            <template v-if="col.link && ((typeof col.link === 'boolean' && item.link) || (item[col.link]))">
                                <router-link v-if="!col.external" :to="(typeof col.link === 'boolean' && item.link) || item[col.link]" :class="col.linkClass">
                                    <template v-if="col.component">
                                        <component :is="col.component.is" v-bind="col.property?item[col.property]:item"></component>
                                    </template>
                                    <template v-else>{{ col.value || item[col.property] }}</template>
                                </router-link>
                                <a v-else :href="(typeof col.link === 'boolean' && item.link) || item[col.link]" target="_blank" :class="col.linkClass">
                                    <template v-if="col.component">
                                        <component :is="col.component.is" v-bind="col.property?item[col.property]:item"></component>
                                    </template>
                                    <template v-else>{{ col.value || item[col.property] }}</template>
                                </a>
                            </template>
                            <template v-else-if="col.component">
                                <component :is="col.component.is" v-bind="col.property?item[col.property]:item"></component>
                            </template>
                            <template v-else>{{ item[col.property] }}</template>
                        </td>
                    </template>
                </tr>
                <!-- <div v-if="debug" class="flex border-t border-gray-300 items-center hover:bg-blue-100">
            <pre>{{ item }}</pre>
        </div> -->
            </template>
        </tbody>
    </table>
</template>
<script>

/**
 * TODO: how to pass in custom component for table cell. For example, team/user tables
 * should include avatar next to name without it being its own column
 * <img class="rounded-md mr-3 w-6 inline" :src="item.avatar"/>
 */
export default {
    name: 'ItemTable',
    props: ['items', 'columns', 'debug']
}
</script>
