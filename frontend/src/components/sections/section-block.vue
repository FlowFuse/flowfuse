<template>
    <section class="ff-section-block">
        <router-link
            :to="linkTo"
            class="ff-section-block-header flex gap-5 self-end items-center truncate"
        >
            <span class="name"><slot name="title" /></span>
            <router-link
                v-if="application"
                :to="{name: 'Application', params: {id: application.id}}"
                class="ff-section-block-application-name truncate"
                @click.stop
            >
                {{ application.name }}
            </router-link>
            <span class="to">
                <ChevronRightIcon class="ff-icon " />
            </span>
        </router-link>
        <div class="ff-section-block-content">
            <slot name="default" />
        </div>
    </section>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/outline'

export default {
    name: 'SectionBlock',
    components: {
        ChevronRightIcon
    },
    props: {
        linkTo: {
            required: true,
            type: Object
        },
        application: {
            required: false,
            type: [Object, null],
            default: null
        }
    }
}
</script>

<style scoped lang="scss">
.ff-section-block {
    border: 1px solid $ff-grey-300;
    border-radius: 5px;
    overflow: hidden;

    & > .ff-section-block-header {
        background: $ff-grey-100;
        padding: 15px;
        border-bottom: 1px solid $ff-grey-300;
        transition: ease-in-out .3s;

        &:hover {
            color: $ff-white;
            background: $ff-indigo-700;
            .ff-section-block-name {
                transition: ease-in-out .3s;
                color:  $ff-grey-400;
            }
        }

        &:has(.ff-section-block-name:hover) {
            color: $ff-grey-500;

            .ff-section-block-name:hover {
                color: $ff-white;
            }
        }

        .ff-section-block-application-name {
            transition: ease-in-out .3s;
            color: $ff-grey-400;

            &:hover {
                color: white;
            }
        }

        .to {
            display: flex;
            flex: 1;
            justify-content: end;
        }
    }

    & > .ff-section-block-content {
        padding: 15px;
        overflow: auto;
    }
}
</style>
