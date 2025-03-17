<template>
    <li class="ff-nav-item">
        <div class="flex w-full justify-between items-center">
            <component v-if="icon" :is="icon" class="ff-icon transition-fade--color" />
            <img v-if="avatar" :src="avatar" class="ff-avatar">
            <label class="transition-fade--color flex-grow">{{ label }}</label>
            <span v-if="featureUnavailable" data-el="premium-feature" v-ff-tooltip="'Not available in this Tier'">
                <SparklesIcon class="ff-icon transition-fade--color hollow" style="stroke-width: 1;" />
            </span>
            <span v-if="alert" data-el="nav-alert" v-ff-tooltip="alert.title ?? 'Attention required'" @click="onAlertClick">
                <ExclamationCircleIcon class="ff-icon transition-fade--color hollow " style="stroke-width: 1.5;" />
            </span>
        </div>
        <ff-notification-pill v-if="notifications > 0" :count="notifications" />
    </li>
</template>

<script>

import { ExclamationCircleIcon, SparklesIcon } from '@heroicons/vue/outline'

import { useNavigationHelper } from '../composables/NavigationHelper.js'

export default {
    name: 'NavItem',
    components: {
        SparklesIcon,
        ExclamationCircleIcon
    },
    props: {
        icon: {
            type: Function,
            default: () => null
        },
        avatar: {
            type: String,
            default: () => null
        },
        label: {
            type: String,
            required: true
        },
        featureUnavailable: {
            type: Boolean,
            default: false
        },
        notifications: {
            type: Number,
            default: () => 0
        },
        alert: {
            type: Object,
            default: null
        }
    },
    setup () {
        const { openInANewTab } = useNavigationHelper()
        return {
            openInANewTab
        }
    },
    methods: {
        onAlertClick () {
            if (this.alert.url) {
                this.openInANewTab(this.alert.url)
            }
        }
    }
}
</script>
