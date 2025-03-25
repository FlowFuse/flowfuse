<template>
    <div class="topic-schema">
        <template v-if="schema === null">
            <p class="text-center opacity-50">
                No schema defined
            </p>
        </template>
        <template v-else-if="!isAllowedSchema">
            <section class="topic-schema-unknown">
                We haven't been able to determine the payload format
            </section>
        </template>
        <template v-else>
            <section class="type">
                <span class="type"><b>Type</b>: {{ typeText }}</span>
            </section>
            <section v-if="!isPrimitiveSchema" ref="schemaContainer" class="schema-container mt-2">
                <b>Schema</b>:
                <object-properties v-if="schemaType === 'object'" :properties="schema.properties" />
                <array-properties v-else-if="schemaType === 'array'" :items="schema.items" />
            </section>
        </template>
    </div>
</template>

<script>

import ArrayProperties from './schema/ArrayProperties.vue'
import ObjectProperties from './schema/ObjectProperties.vue'

export default {
    name: 'TopicSchema',
    components: { ArrayProperties, ObjectProperties },
    props: {
        schema: {
            required: true,
            type: [Object, null]
        }
    },
    emits: [],
    data () {
        return {
            allowedSchemaTypes: [
                'string',
                'number',
                'boolean',
                'object',
                'array',
                'bin'
            ],
            schemaContainerMaxHeight: 400,
            schemaContainerHeight: 0,
            isSchemaExtended: false,
            resizeObserver: null
        }
    },
    computed: {
        isPrimitiveSchema () {
            return ['string', 'number', 'boolean'].includes(this.schemaType)
        },
        isAllowedSchema () {
            return this.allowedSchemaTypes.includes(this.schemaType)
        },
        schemaType: function () {
            return this.schema?.type
        },
        typeText () {
            switch (this.schemaType) {
            case 'string':
                return 'String'
            case 'number':
                return 'Number'
            case 'boolean':
                return 'JSON Boolean'
            case 'object':
                return 'JSON Object'
            case 'array':
                return ' SON Array'
            case 'bin':
                return 'Binary Data'
            default:
                return ''
            }
        }
    },
    // mounted () {
    //     this.updateResizeObserver()
    // },
    // updated () {
    //     this.updateResizeObserver()
    // },
    methods: {
        updateHeight () {
            return new Promise(resolve => {
                // we need to schedule the height request before the next repaint to avoid a ResizeObserver loop
                requestAnimationFrame(() => {
                    this.schemaContainerHeight = this.$refs.schemaContainer?.scrollHeight || 0
                })
                resolve()
            })
        },
        observeHeightChanges () {
            return new Promise(resolve => {
                if (!this.$refs.schemaContainer) return

                this.resizeObserver = new ResizeObserver(() => {
                    this.updateHeight()
                })

                this.resizeObserver.observe(this.$refs.schemaContainer)
                resolve()
            })
        }
        // updateResizeObserver () {
        //     return new Promise((resolve) => {
        //         if (this.resizeObserver) {
        //             this.resizeObserver.disconnect()
        //         }
        //         resolve()
        //     })
        //         .then(() => this.updateHeight())
        //         .then(() => this.observeHeightChanges())
        //         .catch(e => e)
        // }
    }
}
</script>

<style scoped lang="scss">
.topic-schema {
    background-color: $ff-indigo-50;
    color: $ff-indigo-600;
    border-radius: 6px;
    border: 1px solid $ff-indigo-100;
    padding: 10px 6px;
    font-size: 0.875rem;
    line-height: 1.25rem;
    overflow: auto;
    position: relative;

    .topic-schema-unknown {
        color: $ff-grey-500;
        text-align: center;
        font-style: italic;
    }

    .schema-container {
        overflow: hidden;

        .show-more {
            position: absolute;
            bottom: 0;
            left: 45%;
        }

    }
}
</style>
