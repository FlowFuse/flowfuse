<template>
    <div
        v-ff-tooltip:bottom="isDevMode && isBadge ? 'Developer Mode: Enabled' : undefined"
        :class="{
            'forge-badge': isBadge,
            'forge-badge-devmode': isBadge && isDevMode,
            'forge-badge-fleetmode': isBadge && !isDevMode,
        }"
        :data-el="`${isBadge ? 'badge' : 'text'}-${mode === 'developer' ? 'dev' : 'fleet'}mode`"
    >
        <span v-ff-tooltip="isIcon ? (isDevMode ? 'Developer Mode' : 'Fleet Mode') : (isDevMode ? 'Make changes to the Instance Editor directly' : 'Deploy changes to this Instance via Pipelines')" class="inline-flex space-x-2 items-center">
            <template v-if="isDevMode">
                <BeakerIcon :class="`text-purple-600 w-${size} h-${size}`" />
                <span v-if="!isIcon" class="ml-1"> Developer Mode</span>
            </template>
            <template v-else>
                <IconDeviceSolid :class="`text-teal-700 w-${size} h-${size}`" />
                <span v-if="!isIcon" class="ml-1"> Fleet Mode</span>
            </template>
        </span>
    </div>
</template>

<script>
import { BeakerIcon } from '@heroicons/vue/outline'

import IconDeviceSolid from '../../../components/icons/DeviceSolid.js'

export default {
    name: 'DeviceModeBadge',
    components: {
        BeakerIcon,
        IconDeviceSolid
    },
    props: {
        mode: {
            type: String, // "developer", "autonomous" (fleet)
            required: true
        },
        type: {
            default: 'badge',
            type: String // "badge", "text", "icon"
        }
    },
    computed: {
        isDevMode () {
            return this.mode === 'developer'
        },

        isBadge () {
            return this.type === 'badge'
        },
        isIcon () {
            return this.type === 'icon'
        },

        size () {
            return this.isIcon ? '6' : '4'
        }
    }
}
</script>
