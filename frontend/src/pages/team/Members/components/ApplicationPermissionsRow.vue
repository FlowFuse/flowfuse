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
                    <span class="item action w-40 pl-5">
                        <PencilAltIcon class="ff-icon ff-icon-sm ff-link" @click.prevent="onUpdateRole(application)" />
                    </span>
                </li>
            </ul>
        </div>
    </td>
</template>

<script>
import { ArrowDownIcon, ArrowUpIcon, BanIcon, PencilAltIcon } from '@heroicons/vue/outline'
import { defineComponent } from 'vue'

import FfTeamLink from '../../../../components/router-links/TeamLink.vue'

import { capitalize } from '../../../../composables/String.js'
import { RoleNames } from '../../../../utils/roles.js'

export default defineComponent({
    name: 'ApplicationPermissionsRow',
    components: { FfTeamLink, PencilAltIcon },
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
    emits: ['application-role-updated'],
    setup () {
        return { ArrowDownIcon, ArrowUpIcon, BanIcon }
    },
    computed: {
        rows () {
            return this.applications.map(application => {
                const teamRole = parseInt(this.data.role)
                const customRole = this.getCustomRoleForApplication(application)
                const { icon, iconClass, roleClass } = this.getRoleIconProperties(customRole, teamRole)

                return {
                    id: application.id,
                    name: application.name,
                    role: capitalize(this.formatRole(customRole ?? teamRole)),
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
        getRoleIconProperties (customRole, teamRole) {
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
        },
        onUpdateRole (application) {
            const payload = {
                application,
                user: this.data
            }
            this.$emit('application-role-updated', payload)
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
            transition: ease-in-out .3s;

            .name {
                grid-column: span 8;
            }
            .role {
                padding-left: 15px;
            }

            .action {
                .ff-icon {
                    transition: ease-in-out .2s;
                    opacity: 0;
                }
            }

            &:hover {
                background: $ff-grey-100;
                .action {
                    .ff-icon {
                        opacity: 1;
                    }
                }
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
