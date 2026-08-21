<template>
    <div class="ff-announcement-body" :class="{ compact }" data-el="announcement-body">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="isMarkdown" class="ff-announcement-body--rich" data-el="announcement-rich" v-html="renderedMessage" />
        <p v-else class="ff-announcement-body--plain" data-el="announcement-plain">{{ data.message }}</p>

        <div v-if="videoEmbedUrl" class="ff-announcement-body--video" data-el="announcement-video">
            <iframe
                :src="videoEmbedUrl"
                :title="data.title"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowfullscreen
            />
        </div>

        <div v-if="fallbackLink" class="ff-announcement-body--actions" data-el="announcement-fallback-link">
            <!--
                A plain announcement carries its link on the whole card in the
                drawer. In the toast there is no card-wide target, so the link
                is surfaced here instead.
            -->
            <a
                class="ff-announcement-body--link"
                :href="fallbackLink"
                target="_blank"
                rel="noopener noreferrer"
                data-action="announcement-fallback-link"
                @click="$emit('engaged')"
            >
                Learn more
            </a>
        </div>

        <div v-if="data.cta" class="ff-announcement-body--actions" data-el="announcement-cta">
            <!--
                An in-app destination routes, so the app is not torn down and
                rebooted. An external one is a plain anchor: ff-button's anchor
                variant is a router-link, which would resolve an absolute url
                against the current route.
            -->
            <router-link
                v-if="ctaIsInApp"
                class="ff-btn ff-btn--primary ff-btn-small transition-fade--color"
                :to="data.cta.url"
                data-action="announcement-cta"
                @click="$emit('engaged')"
            >
                {{ data.cta.label }}
            </router-link>
            <a
                v-else
                class="ff-btn ff-btn--primary ff-btn-small transition-fade--color"
                :href="data.cta.url"
                target="_blank"
                rel="noopener noreferrer"
                data-action="announcement-cta"
                @click="$emit('engaged')"
            >
                {{ data.cta.label }}
            </a>
        </div>
    </div>
</template>

<script>
import { Marked } from 'marked'

import { sanitize } from '../../../composables/strings/String.js'

export default {
    name: 'AnnouncementBody',
    props: {
        /**
         * The `data` payload of an announcement notification:
         * { title, message, format?, video?: { provider, id }, cta?: { label, url } }
         */
        data: {
            type: Object,
            required: true
        },
        /** Tighter spacing, used inside the toast */
        compact: {
            type: Boolean,
            default: false
        }
    },
    emits: ['engaged'],
    setup () {
        // A plain renderer rather than the shared markdown helper: that one is
        // built for the Expert chat and emits code-block and table furniture
        // whose styling and copy-button handler only exist in that component,
        // so it would render as broken chrome here.
        return { markedInstance: new Marked({ breaks: true, gfm: true }) }
    },
    computed: {
        isMarkdown () {
            return this.data?.format === 'markdown'
        },
        renderedMessage () {
            // The body is authored by a platform admin, but it still goes through
            // the same sanitiser as any other rendered markdown in the app.
            return sanitize(this.markedInstance.parse(this.data?.message ?? ''), { targetBlank: true })
        },
        videoEmbedUrl () {
            // The provider and id are validated server side, so the embed url is
            // built from known-good parts rather than from admin input.
            const video = this.data?.video
            if (video?.provider !== 'youtube' || !video?.id) {
                return null
            }
            return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`
        },
        ctaIsInApp () {
            // Validated server side, so a leading slash here really is a path
            // within the platform
            return !!this.data?.cta?.url?.startsWith('/')
        },
        fallbackLink () {
            // Only when there is no button of its own to click.
            if (this.data?.cta || !this.compact) {
                return null
            }
            return typeof this.data?.url === 'string' ? this.data.url : null
        }
    }
}
</script>

<style lang="scss">
.ff-announcement-body {
    display: flex;
    flex-direction: column;
    gap: $ff-unit-md;

    &.compact {
        gap: $ff-unit-sm;
    }

    .ff-announcement-body--plain {
        margin: 0;
    }

    .ff-announcement-body--rich {
        display: flex;
        flex-direction: column;
        gap: $ff-unit-sm;

        p, ul, ol {
            margin: 0;
        }

        ul, ol {
            padding-left: $ff-unit-lg;
        }

        ul {
            list-style: disc;
        }

        ol {
            list-style: decimal;
        }

        h1, h2, h3, h4 {
            font-weight: 600;
            color: var(--ff-color-text);
        }

        a {
            color: var(--ff-color-link);
            text-decoration: underline;
        }

        code {
            background-color: var(--ff-color-bg-surface-raised);
            padding: 0 $ff-unit-xs;
            border-radius: 3px;
        }

        blockquote {
            border-left: 3px solid var(--ff-color-border-strong);
            padding-left: $ff-unit-md;
            color: var(--ff-color-text-subtle);
        }
    }

    .ff-announcement-body--video {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        background-color: var(--ff-color-bg-surface-raised);
        border: 1px solid var(--ff-color-border);

        iframe {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
        }
    }

    .ff-announcement-body--actions {
        display: flex;
        gap: $ff-unit-sm;
    }

    .ff-announcement-body--link {
        color: var(--ff-color-link);
        text-decoration: underline;
    }
}
</style>
