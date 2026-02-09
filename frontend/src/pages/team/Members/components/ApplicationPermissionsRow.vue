<template>
    <td colspan="5" :class="collapsed ? 'collapsed' : 'expanded'" data-el="application-permissions-row">
        <div class="content">
            <ul>
                <li
                    v-for="application in rows"
                    :key="application.id"
                    class="application"
                    :data-el="'app-item-' + slugify(application.name)"
                >
                    <span class="item" />
                    <span class="item name" data-el="application-name">
                        <ff-team-link v-if="!application.disabled" :to="{name: 'application-settings-user-access', params: {id: application.id}}" class="ff-link">
                            {{ application.name }}
                        </ff-team-link>
                        <span v-else>{{ application.name }}</span>
                    </span>
                    <RoleCompare :baseRole="data.role" :overrideRole="application.role" class="w-40" />
                    <span class="item action w-40 pl-5" data-action="update-role">
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

import RoleCompare from '../../../../components/permissions/RoleCompare.vue'
import FfTeamLink from '../../../../components/router-links/TeamLink.vue'
import usePermissions from '../../../../composables/Permissions.js'

import { slugify } from '../../../../composables/String.js'

export default defineComponent({
    name: 'ApplicationPermissionsRow',
    components: { FfTeamLink, PencilAltIcon, RoleCompare },
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
        const { hasPermission } = usePermissions()
        return { ArrowDownIcon, ArrowUpIcon, BanIcon, slugify, hasPermission }
    },
    computed: {
        rows () {
            return this.applications.map(application => {
                const teamRole = parseInt(this.data.role)
                const customRole = this.getCustomRoleForApplication(application)

                return {
                    id: application.id,
                    name: application.name,
                    role: customRole ?? teamRole,
                    disabled: !this.hasPermission('project:read', { application })
                }
            })
        }
    },
    methods: {
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
            case parseInt(customRole) === 0 && parseInt(teamRole) !== parseInt(customRole):
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
            max-height: 200px;
        }
    }
}
</style>
