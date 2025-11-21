<template>
    <ff-accordion class="max-w-full w-full broker-client">
        <template #label>
            <div class="username text-left flex">
                <text-copier v-if="!client.owner" :text="username" confirmation-type="alert" @click.prevent.stop>
                    <span :title="username" class="title-wrapper">
                        <span class="mt-1 font-bold">{{ client.username }}</span>
                        <span class="italic mt-1">@{{ team.id }}</span>
                    </span>
                </text-copier>
                <span v-else class="mt-1 font-bold">
                    {{ username }}
                </span>
            </div>
            <div class="rules text-left">
                <span>{{ client.acls.length }} Rule{{ client.acls.length > 1 ? 's' : '' }}</span>
            </div>
        </template>
        <template #meta>
            <span
                class="edit hover:cursor-pointer"
                data-action="nav-to-client-owner"
            >
                <ChipIcon
                    v-if="client.owner?.instanceType === 'device'"
                    v-ff-tooltip:left="`Client is linked to Device '${client.owner.name || client.owner.id}'`"
                    class="ff-icon-sm"
                    @click.prevent.stop="$router.push({ name: 'Device', params: { id: client.owner.id } })"
                />

                <ProjectsIcon
                    v-else-if="client.owner?.instanceType === 'instance'"
                    v-ff-tooltip:left="`Client is linked to Instance '${client.owner.name || client.owner.id}'`"
                    class="ml-0! ff-icon-sm"
                    @click.prevent.stop="$router.push({ name: 'Instance', params: { id:client.owner.id } })"
                />
            </span>
            <span
                v-if="hasPermission('broker:clients:edit', applicationContext)"
                class="edit hover:cursor-pointer"
                data-action="edit-client"
                @click.prevent.stop="$emit('edit-client', client)"
            >
                <PencilIcon class="ff-icon-sm" />
            </span>
            <span
                v-if="hasPermission('broker:clients:delete', applicationContext)"
                class="delete hover:cursor-pointer "
                data-action="delete-client"
                @click.prevent.stop="$emit('delete-client',client)"
            >
                <TrashIcon class="ff-icon-sm text-red-500" />
            </span>
        </template>
        <template #content>
            <ul class="acl-list">
                <li v-for="(acl, $key) in client.acls" :key="$key" class="acl-wrapper" data-el="acl">
                    <BrokerAclRule :acl="acl" />
                </li>
            </ul>
        </template>
    </ff-accordion>
</template>

<script>
import { ChipIcon, PencilIcon, TrashIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import FfAccordion from '../../../../../components/Accordion.vue'
import TextCopier from '../../../../../components/TextCopier.vue'
import ProjectsIcon from '../../../../../components/icons/Projects.js'
import usePermissions from '../../../../../composables/Permissions.js'
import { Roles } from '../../../../../utils/roles.js'

import BrokerAclRule from './BrokerAclRule.vue'

export default {
    name: 'BrokerClient',
    components: {
        BrokerAclRule,
        ChipIcon,
        ProjectsIcon,
        TextCopier,
        PencilIcon,
        FfAccordion,
        TrashIcon
    },
    props: {
        client: {
            required: true,
            type: Object
        }
    },
    emits: ['edit-client', 'delete-client'],
    setup () {
        const { hasPermission } = usePermissions()

        return {
            hasPermission
        }
    },
    computed: {
        ...mapState('account', ['team']),
        Roles () {
            return Roles
        },
        username () {
            if (this.client.owner) {
                return this.client.owner.name || this.client.owner.id
            }
            return `${this.client.username}@${this.team.id}`
        },
        applicationContext () {
            let applicationId = null
            if (Object.prototype.hasOwnProperty.call(this.client, 'applicationId')) {
                applicationId = this.client.applicationId
            } else if (Object.prototype.hasOwnProperty.call(this.client?.owner ?? {}, 'applicationId')) {
                applicationId = this.client.owner.applicationId
            }

            return applicationId ? { applicationId } : {}
        }
    }
}
</script>

<style lang="scss">
.ff-accordion.broker-client {
    margin-bottom: 0;

    button {
        border: none;
        background: none;
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 15px;
        padding: 0;

        .username {
            padding: 15px 10px;
            grid-column: span 2;
            overflow: hidden;

            .ff-text-copier {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                & > span {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .title-wrapper {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

            }

            .ff-icon {
                margin-left: 0;
                min-width: 20px;
            }
        }

        .rules {
            padding: 15px 10px;

        }

        .toggle {
            grid-column: span 3;
            text-align: right;
            padding-right: 10px;
            display: flex;
            align-items: center;
            justify-content: flex-end;

            .edit, .delete {
                padding: 24px 15px;
                display: inline-block;
                position: relative;
                align-self: stretch;

                .ff-icon-sm {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    transition: ease-in-out .3s;
                }

                &:hover {
                    .ff-icon-sm {
                        width: 20px;
                        height: 20px;
                    }
                }
            }

            .edit:hover {
                color: var(--ff-grey-700);
            }
            .delete:hover {
                color: var(--ff-red-700);
            }
        }
    }

    .ff-accordion--content {
        background: var(--ff-grey-100);
        .acl-list {
            .acl-wrapper {
                border-bottom: 1px solid var(--ff-grey-200);
                padding: 15px 10px;
                gap: 10px;
                font-size: 80%;

                &:last-of-type {
                    border: none;
                }
            }
        }
    }
}
</style>
