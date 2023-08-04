<template>
    <div class="ff-nav-breadcrumb" :class="{'ff-nav-breadcrumb--active': !to}">
        <router-link v-if="to" :to="to">
            <slot>
                {{ label }}
            </slot>
        </router-link>
        <span v-else>
            <slot>
                {{ label }}
            </slot>
        </span>
        <ChevronRightIcon v-if="to" class="ff-icon" />
    </div>
</template>

<script>

import { ChevronRightIcon } from '@heroicons/vue/solid'
export default {
    name: 'FfNavBreadcrumb',
    components: {
        ChevronRightIcon
    },
    props: {
        label: {
            default: 'Label',
            type: String
        },
        to: {
            default: '',
            type: [String, Object]
        }
    }
}
</script>
