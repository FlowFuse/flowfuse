<template>
    <nav>
        <h1 class="">Components</h1>
        <ul id="grouplist">
            <li v-for="g in groups" :key="g.name">
                <h3>{{ g.name }}</h3>
                <ul v-for="c in g.components" :key="c.name">
                    <li>{{ c.name }}</li>
                </ul>
            </li>
        </ul>
    </nav>
    <main>
        <!-- <h1>Documentation</h1> -->
        <div class="section" id="section-buttons">
            <markdown-viewer :content="'# Hello World'"/>
            <h1>Buttons</h1>
            <h2><pre>ff-button</pre></h2>
            <h3>Examples:</h3>
            <div class="examples">
                <div class="example">
                    <ff-button>Hello World</ff-button>
                    <code>{{ groups[0].components[0].examples[0].code }}</code>
                </div>
                <div class="example">
                    <ff-button kind="secondary">Hello World</ff-button>
                    <code>{{ groups[0].components[0].examples[1].code }}</code>
                </div>
                <div class="example">
                    <ff-button kind="tertiary">Hello World</ff-button>
                    <code>{{ groups[0].components[0].examples[2].code }}</code>
                </div>
                <div class="example">
                    <ff-button kind="danger">Hello World</ff-button>
                    <code>{{ groups[0].components[0].examples[3].code }}</code>
                </div>
                <div class="example">
                    <ff-button kind="primary">
                        <template v-slot:icon-left><PlusSmIcon /></template>
                        Hello World
                    </ff-button>
                    <code>{{ groups[0].components[0].examples[4].code }}</code>
                </div>
                <div class="example">
                    <ff-button kind="primary">
                        <template v-slot:icon-right><PlusSmIcon /></template>
                        Hello World
                    </ff-button>
                    <code>{{ groups[0].components[0].examples[5].code }}</code>
                </div>
                <div class="example">
                    <ff-button kind="primary" size="small">
                        <template v-slot:icon-left><PlusSmIcon /></template>
                        Hello World
                    </ff-button>
                    <code>{{ groups[0].components[0].examples[6].code }}</code>
                </div>
            </div>
            <h3>Properties:</h3>
            <props-table :rows="groups[0].components[0].props"></props-table>
            <h3>Slots:</h3>
            <slots-table :rows="groups[0].components[0].slots"></slots-table>
        </div>
    </main>
</template>

<script>

import _ from 'underscore'

import PropsTable from './components/PropsTable.vue'
import SlotsTable from './components/SlotsTable.vue'
import MarkdownViewer from './components/Markdown.vue'

// icons
import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'DesignLanguage',
    components: {
        MarkdownViewer,
        PropsTable,
        SlotsTable,
        // icons
        PlusSmIcon
    },
    data () {
        return {
            groups: [{
                name: 'Buttons',
                id: 'buttons',
                components: [{
                    name: 'ff-button',
                    examples: [{
                        code: '<ff-button>Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="secondary">Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="tertiary">Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="danger">Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="primary">\n\t<template v-slot:icon-left><PlusSmIcon /></template>\n\tHello World\n</ff-button>'
                    }, {
                        code: '<ff-button kind="primary">\n\t<template v-slot:icon-right><PlusSmIcon /></template>\n\tHello World\n</ff-button>'
                    }, {
                        code: '<ff-button kind="primary" size="small">\n\t<template v-slot:icon-left><PlusSmIcon /></template>\n\tHello World\n</ff-button>'
                    }],
                    props: [{
                        key: 'kind',
                        default: '"primary"',
                        description: 'Standard interactive button which comes in four different "kinds" - "primary", "secondary", "tertiary" or "danger".'
                    }, {
                        key: 'size',
                        default: '"normal"',
                        description: 'For inline buttons, it is recommended to use size: "small"'
                    }],
                    slots: [{
                        name: 'icon-left',
                        description: 'Can be used to add an icon to the left of any value/label'
                    }, {
                        name: 'icon-right',
                        description: 'Can be used to add an icon to the right of any value/label'
                    }]
                }]
            }]
        }
    },
    computed: {
        groups_ordered: function () {
            return _.sortedBy(this.groups, 'name')
        }
    }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
