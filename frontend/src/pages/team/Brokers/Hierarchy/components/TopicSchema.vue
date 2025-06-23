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
            ]
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
        .show-more {
            position: absolute;
            bottom: 0;
            left: 45%;
        }

    }

    &.collapsed {
        overflow: hidden;
        box-shadow: inset 0 -30px 20px -20px rgba(49, 46, 129, 0.2);
        padding-bottom: 35px;

        .schema-container {
            max-height: 400px;
        }

        .show-more {
            padding: 10px;
        }
    }
}
</style>
