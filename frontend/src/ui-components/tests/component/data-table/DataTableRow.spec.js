import { mount } from '@vue/test-utils'
import DataTableRow from '@/components/data-table/DataTableRow.vue'

const TestComponent = {
    template: '{{name}}: {{value}}',
    props: ['name', 'value']
}

describe('DataTableRow', () => {
    describe('subcomponents', () => {
        it('render if set in the column', async () => {
            const wrapper = mount(DataTableRow, {
                props: {
                    columns: [{
                        component: {
                            is: TestComponent
                        }
                    }],
                    data: {
                        name: 'Film',
                        value: 'Star Wars'
                    }
                }
            })

            expect(wrapper.text()).toMatch('Film: Star Wars')

            await wrapper.setProps({
                data: {
                    name: 'TV',
                    value: 'Black Mirror'
                }
            })

            expect(wrapper.text()).toMatch('TV: Black Mirror')
        })

        it('support receiving extra properties', async () => {
            const wrapper = mount(DataTableRow, {
                props: {
                    columns: [{
                        component: {
                            is: TestComponent,
                            extraProps: {
                                value: 'Star wars'
                            }
                        }
                    }],
                    data: {
                        name: 'Film'
                    }
                }
            })

            expect(wrapper.text()).toMatch('Film: Star Wars')

            await wrapper.setProps({
                columns: [{
                    component: {
                        is: TestComponent,
                        extraProps: {
                            value: 'Return of the Jedi'
                        }
                    }
                }]
            })

            expect(wrapper.text()).toMatch('Film: Return of the Jedi')

            // Props from data override extraProps
            await wrapper.setProps({
                data: {
                    name: 'TV',
                    value: 'Black Mirror'
                }
            })

            expect(wrapper.text()).toMatch('TV: Black Mirror')
        })
    })
})
