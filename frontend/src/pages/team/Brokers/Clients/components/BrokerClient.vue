<template>
    <ff-accordion class="max-w-full w-full broker-client">
        <template #label>
            <div class="username text-left flex">
                <text-copier :text="username" confirmation-type="alert" @click.prevent.stop>
                    <span :title="username" class="title-wrapper">
                        <template v-if="!client.owner">
                            <span class="mt-1 font-bold">{{ client.username }}</span>
                            <span class="italic mt-1">@{{ team.id }}</span>
                        </template>
                        <span v-else class="mt-1 font-bold">
                            {{ username }}
                        </span>
                    </span>
                </text-copier>
            </div>
            <div class="rules text-left">
                <span>{{ client.acls.length }} Rule{{ client.acls.length > 1 ? 's' : '' }}</span>
            </div>
            <div class="rules text-left">
                <template v-if="client.owner?.instanceType === 'device'">
                    <router-link class="flex content-center" :to="{ name: 'Device', params: { id:client.owner.id } }"><ChipIcon class="!ml-0 ff-icon relative invisible lg:visible " /></router-link>
                </template>
                <template v-else-if="client.owner?.instanceType === 'instance'">
                    <router-link class="flex content-center" :to="{ name: 'Instance', params: { id:client.owner.id } }"><ProjectsIcon class="!ml-0 ff-icon relative invisible lg:visible" /></router-link>
                </template>
            </div>
        </template>
        <template #meta>
            <span
                class="edit hover:cursor-pointer"
                data-action="edit-client"
                @click.prevent.stop="$emit('edit-client', client)"
            >
                <PencilIcon
                    v-if="hasAMinimumTeamRoleOf(Roles.Owner)"
                    class="ff-icon-sm"
                />
            </span>
            <span
                class="delete hover:cursor-pointer "
                data-action="delete-client"
                @click.prevent.stop="$emit('delete-client',client)"
            >
                <TrashIcon
                    v-if="hasAMinimumTeamRoleOf(Roles.Owner)"
                    class="ff-icon-sm text-red-500"
                />
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
        const { hasAMinimumTeamRoleOf } = usePermissions()

        return {
            hasAMinimumTeamRoleOf
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
        grid-template-columns: repeat(7, 1fr);
        gap: 15px;
        padding: 0;

        .username {
            padding: 15px 10px;
            grid-column: span 2;
            overflow: hidden;

            .ff-text-copier {
                @include truncate;
                & > span {
                    @include truncate;
                }
                .title-wrapper {
                    @include truncate;
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
                color: $ff-grey-700;
            }
            .delete:hover {
                color: $ff-red-700;
            }
        }
    }

    .ff-accordion--content {
        background: $ff-grey-100;
        .acl-list {
            .acl-wrapper {
                border-bottom: 1px solid $ff-grey-200;
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
