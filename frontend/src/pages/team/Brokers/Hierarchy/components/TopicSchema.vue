<template>
    <div class="topic-schema">
        <div v-if="schemaType === 'string'">
            <b>Type</b>: String
        </div>
        <div v-else-if="schemaType === 'number'">
            <b>Type</b>: Number
        </div>
        <div v-else-if="schemaType === 'boolean'">
            <b>Type</b>: JSON Boolean
        </div>
        <div v-else-if="schemaType === 'object'">
            <div class="mb-2"><b>Type</b>: JSON Object</div>
            <div class="font-mono">
                <div>{</div>
                <div v-for="(property, name) in schema.properties" :key="name" class="ml-4">{{ name }} ({{ property.type }})</div>
                <div>}</div>
            </div>
        </div>
        <div v-else-if="schemaType === 'array'">
            <div class="mb-2"><b>Type</b>: JSON Array</div>
            <div class="font-mono">
                <div>[</div>
                <div class="ml-4">...</div>
                <div v-if="schema.items?.type" class="ml-4">({{ schema.items.type }})</div>
                <div v-else class="ml-4">(unknown)</div>
                <div class="ml-4">...</div>
                <div>]</div>
            </div>
        </div>
        <div v-else-if="schemaType === 'bin'">
            <b>Type</b>: Binary Data
        </div>
        <div v-else class="topic-schema-unknown">
            We haven't been able to determine the payload format
        </div>
    </div>
</template>

<script>

export default {
    name: 'TopicSchema',
    components: { },
    props: {
        schema: {
            required: true,
            type: Object
        }
    },
    emits: [],
    data () {
        return {
        }
    },
    computed: {
        schemaType: function () {
            return this.schema?.type
        }
    },
    methods: {
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
}

.topic-schema-unknown {
    color: $ff-grey-500;
    text-align: center;
    font-style: italic;
}
</style>
