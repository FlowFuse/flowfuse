<template>
    <div data-el="role-compare">
        <span class="item role flex gap-1 items-center">
            <component
                :is="style.icon"
                v-if="style.icon"
                :class="style.iconClass"
                class="ff-icon ff-icon-sm"
            />
            <span :class="style.roleClass" class="">
                {{ role }}
            </span>
        </span>
        <span v-if="showOverrideRole" class="text-gray-500 italic flex gap-1">
            <span>Team Role:</span>
            <span :class="style.roleClass">
                {{ readableBaseRole }}
            </span>
        </span>
    </div>
</template>

<script>
import { ArrowDownIcon, ArrowUpIcon, BanIcon } from '@heroicons/vue/outline'

import { capitalize } from '../../composables/String.js'

import { RoleNames, Roles } from '../../utils/roles.js'

export default {
    name: 'RoleCompare',
    props: {
        baseRole: {
            type: Number,
            required: true
        },
        overrideRole: {
            type: Number,
            required: true
        },
        showOverrideRole: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        role () {
            return this.capitalize(this.roles[this.overrideRole] || 'unknown')
        },
        roles () {
            return { ...RoleNames, [Roles.None]: 'No Access' }
        },
        readableBaseRole () {
            return this.roles[this.baseRole] || 'unknown'
        },
        style () {
            if (parseInt(this.baseRole) === 0) {
                return {
                    icon: BanIcon,
                    iconClass: 'text-red-500',
                    roleClass: 'opacity-50'
                }
            } else if (parseInt(this.overrideRole) < parseInt(this.baseRole)) {
                return {
                    icon: ArrowDownIcon,
                    iconClass: 'text-red-500',
                    roleClass: ''
                }
            } else if (parseInt(this.overrideRole) > parseInt(this.baseRole)) {
                return {
                    icon: ArrowUpIcon,
                    iconClass: 'text-green-500',
                    roleClass: ''
                }
            } else {
                return {
                    icon: null,
                    iconClass: '',
                    roleClass: 'opacity-50'
                }
            }
        }
    },
    methods: {
        capitalize
    }
}
</script>
