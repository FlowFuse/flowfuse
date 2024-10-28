<template>
    <ff-accordion class="max-w-full w-full broker-client">
        <template #label>
            <div class="username text-left flex">
                <text-copier :text="client.username + '@' + team.id" @click.prevent.stop>
                    <span :title="client.username + '@' + team.id" class="title-wrapper">
                        <span class="mt-1 font-bold">{{ client.username }}</span>
                        <span class="italic mt-1">@{{ team.id }}</span>
                    </span>
                </text-copier>
            </div>
            <div class="rules text-left">
                <span>{{ client.acls.length }} Rule{{ client.acls.length > 1 ? 's' : '' }}</span>
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
import { PencilIcon, TrashIcon } from '@heroicons/vue/outline'

import FfAccordion from '../../../../components/Accordion.vue'
import TextCopier from '../../../../components/TextCopier.vue'
import permissionsMixin from '../../../../mixins/Permissions.js'
import { Roles } from '../../../../utils/roles.js'

import BrokerAclRule from './BrokerAclRule.vue'

export default {
    name: 'BrokerClient',
    components: {
        BrokerAclRule,
        TextCopier,
        PencilIcon,
        FfAccordion,
        TrashIcon
    },
    mixins: [permissionsMixin],
    props: {
        client: {
            required: true,
            type: Object
        }
    },
    emits: ['edit-client', 'delete-client'],
    computed: {
        Roles () {
            return Roles
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
                @include ellipsis;
                & > span {
                    @include ellipsis;
                }
                .title-wrapper {
                    @include ellipsis;
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
