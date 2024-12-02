<template>
    <div class="pipeline">
        <router-link
            :to="{name: 'ApplicationPipelines', params: {id: pipeline.application.id}}"
            class="header flex gap-5 self-end items-center truncate"
        >
            <span class="name">
                {{ pipeline.name }}
            </span>
            <router-link
                :to="{name: 'Application', params: {id: pipeline.application.id}}"
                class="application-name truncate"
                @click.stop
            >
                {{ pipeline.application.name }}
            </router-link>
            <span class="to">
                <ChevronRightIcon class="ff-icon " />
            </span>
        </router-link>
        <div class="content">
            <ul v-if=" pipeline.stages.length > 0" class="stages-list">
                <li v-for="stage in pipeline.stages" :key="stage.id">
                    <TeamPipelineStage :stage="stage" :application="pipeline.application" />
                    <ChevronRightIcon class="ff-icon" />
                </li>
            </ul>
            <p v-else class="empty-stages-message">There don't seem to be any stages yet!</p>
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/outline'

import TeamPipelineStage from './TeamPipelineStage.vue'

export default {
    name: 'TeamPipeline',
    components: {
        TeamPipelineStage,
        ChevronRightIcon
    },
    props: {
        pipeline: {
            required: true,
            type: Object
        }
    }
}
</script>

<style scoped lang="scss">
.pipeline {
    border: 1px solid $ff-grey-300;
    border-radius: 5px;
    overflow: hidden;

    & > .header {
        background: $ff-grey-100;
        padding: 15px;
        border-bottom: 1px solid $ff-grey-300;
        transition: ease-in-out .3s;

        &:hover {
            color: $ff-white;
            background: $ff-indigo-700;
            .application-name {
                color: $ff-grey-300;
            }
        }

        &:has(.application-name:hover) {
            color: $ff-grey-800;
        }

        .application-name {
            transition: ease-in-out .3s;
            color: $ff-grey-400;

            &:hover {
                color: $ff-indigo-700;
            }
        }

        .to {
            display: flex;
            flex: 1;
            justify-content: end;
        }
    }

    & > .content {
        padding: 15px;
        overflow: auto;

        .stages-list {
            display: flex;
            flex-direction: row;
            gap: 15px;

            li {
                display: flex;
                gap: 15px;
                align-items: center;

                &:last-child > .ff-icon {
                    display: none;
                }
            }
        }

        .empty-stages-message {
            text-align: center;
            color: $ff-grey-500;
    }
    }
}
</style>
