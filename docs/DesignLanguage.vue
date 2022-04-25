<template>
    <nav>
        <h1 class="">Components</h1>
        <ul id="grouplist">
            <li v-for="g in groups" :key="g.name">
                <h3>{{ g.name }}</h3>
                <ul v-for="c in g.components" :key="c.name">
                    <li @click="toSection(c.name)">{{ c.name }}</li>
                </ul>
            </li>
        </ul>
    </nav>
    <main>
        <!-- <h1>Documentation</h1> -->
        <div class="section" id="section-buttons">
            <!-- <markdown-viewer :content="'# Hello World'"/> -->
            <div>
                <h1>Buttons</h1>
                <h2 ref="ff-button"><pre>ff-button</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups[0].components[0].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="groups[0].components[0].slots"></slots-table>
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
                        <ff-button :disabled="true">Hello World</ff-button>
                        <code>{{ groups[0].components[0].examples[4].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon-left><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ groups[0].components[0].examples[5].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon-right><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ groups[0].components[0].examples[6].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary" size="small">
                            <template v-slot:icon-left><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ groups[0].components[0].examples[7].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon><PlusSmIcon /></template>
                        </ff-button>
                        <code>{{ groups[0].components[0].examples[8].code }}</code>
                    </div>
                </div>
            </div>
            <div>
                <h1>Inputs</h1>
                <h2 ref="ff-text-input"><pre>ff-text-input</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups[1].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-text-input placeholder="Insert something here..." v-model="models.textInput0"/>
                        {{ models.textInput0 }}
                        <code>{{ groups[1].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-text-input type="password" placeholder="Password goes here..."/>
                        <code>{{ groups[1].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-text-input type="email"/>
                        <code>{{ groups[1].components[0].examples[2].code }}</code>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script>

import _ from 'underscore'

import PropsTable from './components/PropsTable.vue'
import SlotsTable from './components/SlotsTable.vue'

// icons
import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'DesignLanguage',
    components: {
        PropsTable,
        SlotsTable,
        // icons
        PlusSmIcon
    },
    data () {
        return {
            models: {
                textInput0: ''
            },
            groups: [{
                name: 'Buttons',
                id: 'buttons',
                components: [{
                    name: 'ff-button',
                    examples: [{
                        code: '<ff-button @click="doSomething()>Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="secondary">Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="tertiary">Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="danger">Hello World</ff-button>'
                    }, {
                        code: '<ff-button :disabled="true">Hello World</ff-button>'
                    }, {
                        code: '<ff-button kind="primary">\n\t<template v-slot:icon-left><PlusSmIcon /></template>\n\tHello World\n</ff-button>'
                    }, {
                        code: '<ff-button kind="primary">\n\t<template v-slot:icon-right><PlusSmIcon /></template>\n\tHello World\n</ff-button>'
                    }, {
                        code: '<ff-button kind="primary" size="small">\n\t<template v-slot:icon-left><PlusSmIcon /></template>\n\tHello World\n</ff-button>'
                    }, {
                        code: '<ff-button kind="primary">\n\t<template v-slot:icon><PlusSmIcon /></template>\n</ff-button>'
                    }],
                    props: [{
                        key: 'type',
                        default: '"button"',
                        description: 'The standard HTML "type" attribute for a <button/> element that can define behaviour inside a <form />, e.g. "button", "submit", "reset"'
                    }, {
                        key: 'kind',
                        default: '"primary"',
                        description: 'Standard interactive button which comes in four different "kinds" - "primary", "secondary", "tertiary" or "danger".'
                    }, {
                        key: 'size',
                        default: '"normal"',
                        description: 'For inline buttons, it is recommended to use size: "small". You can also use "full-width" to center the text and position the icon absolutely."'
                    }, {
                        key: 'to',
                        default: 'null',
                        description: 'Pass in a URL path or router-view object, e.g. {name: ""}, and the button will act as a router-link.'
                    }],
                    slots: [{
                        name: 'icon-left',
                        description: 'Can be used to add an icon to the left of any value/label'
                    }, {
                        name: 'icon',
                        description: 'If the button has no text, and only shows an icon, use this slot to render the icon'
                    }, {
                        name: 'icon-right',
                        description: 'Can be used to add an icon to the right of any value/label'
                    }]
                }]
            }, {
                name: 'Inputs',
                id: 'inputs',
                components: [{
                    name: 'ff-text-input',
                    examples: [{
                        code: '<ff-text-input v-model="myVar" placeholder="Insert something here..." />'
                    }, {
                        code: '<ff-text-input :type"password" v-model="myPassword" placeholder="Password goes here..." />'
                    }, {
                        code: '<ff-text-input :type"email" v-model="myEmail" />'
                    }],
                    props: [{
                        key: 'disabled',
                        default: 'false',
                        description: 'Whether or not the input field can be modified.'
                    }, {
                        key: 'placeholder',
                        default: 'null',
                        description: 'Informative text to assist the user with the information required in this input field.'
                    }, {
                        key: 'type',
                        default: 'text',
                        description: 'text, email, or password. password hides the content of the text input'
                    }]
                }]
            }]
        }
    },
    computed: {
        groups_ordered: function () {
            return _.sortedBy(this.groups, 'name')
        }
    },
    async mounted () {
        await this.$nextTick()
        console.log(window.location.hash)
        this.toSection(window.location.hash.replace('#', ''))
    },
    methods: {
        toSection (ref) {
            const element = this.$refs[ref]
            const top = element.offsetTop
            window.scrollTo(0, top)
            console.log(window.location)
            console.log(top)
            window.location.hash = ref
        }
    }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
