<template>
    <div class="ff-pipeline">
        <router-link
            :to="{name: 'ApplicationPipelines', params: {id: pipeline.application.id}}"
            class="ff-pipeline-header flex gap-5 self-end items-center truncate"
        >
            <div class="flex flex-col gap-0.5">
                <span class="name">
                    {{ pipeline.name }}
                </span>
                <span class="text-xs text-gray-500">{{ pipeline.application.name }}</span>
            </div>
            <span class="to">
                <ChevronRightIcon class="ff-icon " />
            </span>
        </router-link>
        <div class="ff-pipeline-content">
            <ul v-if=" pipeline.stages.length > 0" class="ff-pipeline-stages-list">
                <li v-for="stage in pipeline.stages" :key="stage.id">
                    <TeamPipelineStage :stage="stage" :application="pipeline.application" />
                    <ChevronRightIcon class="ff-icon" />
                </li>
            </ul>
            <p v-else class="ff-empty-stages-message">No stages in sight just yet!</p>
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
.ff-pipeline {
    border: 1px solid $ff-grey-300;
    border-radius: 5px;
    overflow: hidden;

    & > .ff-pipeline-header {
        background: $ff-grey-100;
        padding: 15px;
        border-bottom: 1px solid $ff-grey-300;
        transition: ease-in-out .3s;

        &:hover {
            color: $ff-white;
            background: $ff-indigo-700;
            .ff-pipeline-application-name {
                transition: ease-in-out .3s;
                color:  $ff-grey-400;
            }
        }

        &:has(.ff-pipeline-application-name:hover) {
            color: $ff-grey-500;

            .ff-pipeline-application-name:hover {
                color: $ff-white;
            }
        }

        .ff-application-name {
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

    & > .ff-pipeline-content {
        padding: 15px;
        overflow: auto;

        .ff-pipeline-stages-list {
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

        .ff-empty-stages-message {
            text-align: center;
            color: $ff-grey-500;
        }
    }
}
</style>
