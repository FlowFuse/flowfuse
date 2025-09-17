<template>
    <td colspan="5" :class="collapsed ? 'collapsed' : 'expanded'">
        <div class="content">
            <ul>
                <li v-for="application in rows" :key="application.id" class="application">
                    <span class="item" />
                    <span class="item name">
                        <ff-team-link :to="{name: 'application-settings-user-access', params: {id: application.id}}" class="ff-link">
                            {{ application.name }}
                        </ff-team-link>
                    </span>
                    <span class="item role w-40 flex gap-1 items-center">
                        <component
                            :is="application.icon"
                            v-if="application.icon"
                            :class="application.iconClass"
                            class="ff-icon ff-icon-sm"
                        />
                        <span :class="application.roleClass">
                            {{ application.role }}
                        </span>
                    </span>
                    <span class="item w-40" />
                </li>
            </ul>
        </div>
    </td>
</template>

<script>
import { ArrowDownIcon, ArrowUpIcon, BanIcon } from '@heroicons/vue/outline'
import { defineComponent } from 'vue'

import FfTeamLink from '../../../../components/router-links/TeamLink.vue'

import { capitalize } from '../../../../composables/String.js'
import { RoleNames } from '../../../../utils/roles.js'

export default defineComponent({
    name: 'ApplicationPermissionsRow',
    components: { FfTeamLink },
    props: {
        applications: {
            required: true,
            type: Array
        },
        collapsed: {
            required: true,
            type: Boolean,
            default: true
        },
        data: {
            type: Object,
            required: true
        }
    },
    setup () {
        return { ArrowDownIcon, ArrowUpIcon, BanIcon }
    },
    computed: {
        rows () {
            return this.applications.map(application => {
                const teamRole = parseInt(this.data.role)
                const customRole = this.getCustomRoleForApplication(application)
                const { icon, iconClass, roleClass } = this.extracted(customRole, teamRole)

                return {
                    id: application.id,
                    name: application.name,
                    role: capitalize(this.formatRole(customRole || teamRole)),
                    icon,
                    iconClass,
                    roleClass
                }
            })
        }
    },
    methods: {
        formatRole: r => RoleNames[r] || 'unknown',
        getCustomRoleForApplication (application) {
            let customRole = null
            if (
                Object.prototype.hasOwnProperty.call(this.data.permissions, 'applications') &&
                Object.prototype.hasOwnProperty.call(this.data.permissions.applications, application.id)
            ) {
                customRole = this.data.permissions?.applications[application.id]
            }

            return customRole
        },
        extracted (customRole, teamRole) {
            let icon
            let iconClass
            let roleClass = ''

            switch (true) {
            case parseInt(customRole) === 0:
                icon = this.BanIcon
                iconClass = 'text-red-500'
                break
            case parseInt(customRole) < teamRole:
                icon = this.ArrowDownIcon
                iconClass = 'text-red-500'
                break
            case parseInt(customRole) > teamRole:
                icon = this.ArrowUpIcon
                iconClass = 'text-green-500'
                break
            case parseInt(customRole) === null:
            case parseInt(customRole) === teamRole:
            case Number.isNaN(customRole):
            default:
                roleClass = 'opacity-50'
                icon = null
            }
            return {
                icon,
                iconClass,
                roleClass
            }
        }
    }
})
</script>

<style scoped lang="scss">
td {
    .content {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: max-height 0.3s ease-in-out;
        height: fit-content;
        box-shadow: inset 0 2px 15px 0 rgba(0,0,0,0.1);
        overflow-y: auto;

        .application {
            line-height: 29px;
            display: grid;
            grid-template-columns: 55px repeat(10, 1fr) 56px;
            border-bottom: 1px solid $ff-grey-200;

            .name {
                grid-column: span 8;
            }
            .role {
                padding-left: 15px;
            }

            &:last-of-type {
                border-bottom: none;
            }
        }

    }

    &.collapsed {
        .content {
            max-height: 0
        }
    }

    &.expanded {
        .content {
            max-height: 150px;
        }
    }
}
</style>
