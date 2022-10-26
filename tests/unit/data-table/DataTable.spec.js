import { mount } from '@vue/test-utils'
import DataTable from '@/components/data-table/DataTable.vue'

import FfDataTableRow from '@/components/data-table/DataTableRow.vue'
import FfDataTableCell from '@/components/data-table/DataTableCell.vue'
import FfKebabMenu from '@/components/KebabMenu.vue'
import FfTextInput from '@/components/form/TextInput.vue'
import FfCheck from '@/components/Check.vue'

describe('DataTable UX', () => {
    it('supports searching rows by values', async () => {
        const wrapper = mount(DataTable, {
            props: {
                columns: [{
                    key: 'name',
                    label: 'Name'
                }],
                rows: [
                    { name: 'Apple' },
                    { name: 'Orange', details: null },
                    { name: 'Grapefruit', details: { color: 'Orangey' } }
                ],
                showSearch: true
            },
            global: {
                components: {
                    FfDataTableRow, FfDataTableCell, FfTextInput, FfCheck, FfKebabMenu
                }
            }
        })

        expect(wrapper.find('tbody').text()).toBe('AppleOrangeGrapefruit')

        await wrapper.find('[data-form="search"] input').setValue('Orange')

        expect(wrapper.find('tbody').text()).toBe('OrangeGrapefruit')
    })

    it('supports searching rows by values in specific fields only', async () => {
        const wrapper = mount(DataTable, {
            props: {
                columns: [{
                    key: 'name',
                    label: 'Name'
                }],
                rows: [
                    { name: 'Apple' },
                    { name: 'Orange' },
                    { name: 'Grapefruit', details: { color: 'Orangey' } }
                ],
                showSearch: true,
                searchFields: ['name']
            },
            global: {
                components: {
                    FfDataTableRow, FfDataTableCell, FfTextInput, FfCheck, FfKebabMenu
                }
            }
        })

        expect(wrapper.find('tbody').text()).toBe('AppleOrangeGrapefruit')

        await wrapper.find('[data-form="search"] input').setValue('Orange')

        expect(wrapper.find('tbody').text()).toBe('Orange')
    })
})

describe('DataTable', () => {
    describe('filterRows', () => {
        it('searches all properties and returns matching subset of rows', () => {
            const rows = [{
                name: 'Apple',
                desc: 'Is Green'
            }, {
                name: 'Banana',
                desc: 'Not as good as an Apple'
            }, {
                name: 'Pear',
                color: 'Green'
            }]

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'Apple' }, rows)
            ).toEqual([{
                name: 'Apple',
                desc: 'Is Green'
            }, {
                name: 'Banana',
                desc: 'Not as good as an Apple'
            }])

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'Green' }, rows)
            ).toEqual([{
                name: 'Apple',
                desc: 'Is Green'
            }, {
                name: 'Pear',
                color: 'Green'
            }])
        })

        it('searches case-insensitively', () => {
            const rows = [{
                name: 'Apple',
                desc: 'green'
            }]

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'Green' }, rows)
            ).toEqual([{
                name: 'Apple',
                desc: 'green'
            }])

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'apple' }, rows)
            ).toEqual([{
                name: 'Apple',
                desc: 'green'
            }])
        })

        it('searches numbers as if they were strings', () => {
            const rows = [{
                number: '123'
            },
            {
                number: 23
            },
            {
                number: 12
            }]

            expect(
                DataTable.methods.filterRows.call({ internalSearch: '23' }, rows)
            ).toEqual([{
                number: '123'
            },
            {
                number: 23
            }])

            expect(
                DataTable.methods.filterRows.call({ internalSearch: '12' }, rows)
            ).toEqual([{
                number: '123'
            },
            {
                number: 12
            }])
        })

        it('searches nested objects recursively', () => {
            const rows = [{
                name: 'Apple',
                details: {
                    color: 'Green',
                    scientific: {
                        name: 'Malus domestica'
                    }
                }
            }, {
                name: 'Banana',
                details: {
                    color: 'Yellow',
                    scientific: {
                        name: 'Musaceae'
                    }
                }
            }]

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'Green' }, rows)[0]?.name
            ).toEqual('Apple')

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'Musaceae' }, rows)[0]?.name
            ).toEqual('Banana')
        })

        it('searches (nested) arrays', () => {
            const rows = [{
                name: 'Apple',
                colors: ['green', 'red']
            }, {
                name: 'Banana',
                details: {
                    colors: [{ name: 'yellow' }]
                }
            }]

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'green' }, rows).map((row) => row.name)
            ).toEqual(['Apple'])

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'yellow' }, rows).map((row) => row.name)
            ).toEqual(['Banana'])
        })

        it('handles searchFields prop being empty or undefined', () => {
            const rows = [{
                name: 'Apple',
                desc: 'Is Green'
            }, {
                name: 'Banana',
                desc: 'Not as good as an Apple'
            }, {
                name: 'Pear',
                color: 'Green'
            }]

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'green', searchFields: undefined }, rows).map((row) => row.name)
            ).toEqual(['Apple', 'Pear'])

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'green', searchFields: [] }, rows).map((row) => row.name)
            ).toEqual(['Apple', 'Pear'])
        })

        it('handles prop values being being explicitly null, undefined or empty', () => {
            const rows = [{
                name: 'Apple',
                meta: null
            }, {
                name: 'Banana',
                meta: undefined
            }, {
                name: 'Pear',
                meta: []
            }, {
                name: 'Orange',
                meta: ''
            }]

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'apple' }, rows).map((row) => row.name)
            ).toEqual(['Apple'])

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'banana' }, rows).map((row) => row.name)
            ).toEqual(['Banana'])

            expect(
                DataTable.methods.filterRows.call({ internalSearch: 'pear' }, rows).map((row) => row.name)
            ).toEqual(['Pear'])
        })

        describe('with searchFields prop set', () => {
            it('only searches matching properties', () => {
                const rows = [{
                    name: 'Apple',
                    desc: 'Is Green'
                }, {
                    name: 'Banana',
                    desc: 'Not as good as an Apple'
                }, {
                    name: 'Pear',
                    color: 'Green'
                }]

                expect(
                    DataTable.methods.filterRows.call({ internalSearch: 'Green', searchFields: ['desc'] }, rows)
                ).toEqual([{
                    name: 'Apple',
                    desc: 'Is Green'
                }])

                expect(
                    DataTable.methods.filterRows.call({ internalSearch: 'Green', searchFields: ['desc', 'color'] }, rows)
                ).toEqual([{
                    name: 'Apple',
                    desc: 'Is Green'
                },
                {
                    name: 'Pear',
                    color: 'Green'
                }])
            })

            it('only searches nested matching properties', () => {
                const rows = [{
                    name: 'Apple',
                    details: {
                        color: 'Green',
                        antiColor: 'Not Yellow',
                        scientific: {
                            name: 'Non-Banana'
                        }
                    }
                }, {
                    name: 'Banana',
                    details: {
                        color: 'Yellow',
                        antiColor: 'Not Green',
                        scientific: {
                            ignored: 'Still a Banana'
                        }
                    }
                }]

                expect(
                    DataTable.methods.filterRows.call({ internalSearch: 'Green', searchFields: ['details.color'] }, rows)[0]?.name
                ).toEqual('Apple')

                expect(
                    DataTable.methods.filterRows.call({ internalSearch: 'Banana', searchFields: ['details.scientific.name'] }, rows)[0]?.name
                ).toEqual('Apple')
            })

            it('can search very nested properties', () => {
                const rows = [{
                    a: { b: { c: { d: { e: { f: 'Apple' } } } } }, name: 'Row 1'
                }]

                expect(
                    DataTable.methods.filterRows.call({ internalSearch: 'Apple', searchFields: ['a.b.c.d.e.f'] }, rows)[0]?.name
                ).toEqual('Row 1')

                expect(
                    DataTable.methods.filterRows.call({ internalSearch: 'Apple', searchFields: ['a.b.c.d.e.none'] }, rows)
                ).toEqual([])
            })

            it('can search a mix of lightly and deeply nested properties', () => {
                const rows = [{
                    a: { b: { c: 'Apple' } }, name: 'Row 1'
                }, {
                    a: 'Apple', name: 'Row 2'
                }, {
                    description: 'apple', name: 'Row 3'
                }, {
                    details: { name: 'apple' }, name: 'Row 4'
                }, {
                    details: { type: 'apple' }, name: 'Row 5'
                }, {
                    name: 'Does not match'
                }]

                expect(
                    DataTable.methods.filterRows
                        .call(
                            {
                                internalSearch: 'Apple',
                                searchFields: ['a.b.c', 'description']
                            },
                            rows
                        )
                        .map((row) => row.name)
                ).toEqual(['Row 1', 'Row 2', 'Row 3'])

                expect(
                    DataTable.methods.filterRows
                        .call(
                            {
                                internalSearch: 'Apple',
                                searchFields: [
                                    'details.name',
                                    'details.type',
                                    'description'
                                ]
                            },
                            rows
                        )
                        .map((row) => row.name)
                ).toEqual(['Row 3', 'Row 4', 'Row 5'])
            })

            it('can search multiple sub-properties of the same property', () => {
                const rows = [{
                    details: {
                        name: 'Apple',
                        color: 'Green'
                    }
                }, {
                    details: {
                        name: 'Green Banana',
                        color: 'Not Yellow'
                    }
                }]

                expect(
                    DataTable.methods.filterRows
                        .call(
                            {
                                internalSearch: 'Green',
                                searchFields: ['details.name', 'details.color']
                            },
                            rows
                        )
                        .map((row) => row.details.name)
                ).toEqual(['Apple', 'Green Banana'])

                expect(
                    DataTable.methods.filterRows
                        .call(
                            {
                                internalSearch: 'Yellow',
                                searchFields: ['details.name', 'details.color']
                            },
                            rows
                        )
                        .map((row) => row.details.name)
                ).toEqual(['Green Banana'])
            })
        })
    })

    describe('filteredRows', () => {
        it('Sorts numbers descending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: 15 },
                    { value: 21 },
                    { value: 9 },
                    { value: 1 },
                    { value: 4 },
                    { value: 3 }
                ],
                sort: {
                    key: 'value',
                    order: 'desc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual([21, 15, 9, 4, 3, 1])
        })

        it('Sorts numbers ascending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: 21 },
                    { value: 15 },
                    { value: 9 },
                    { value: 4 },
                    { value: 3 },
                    { value: 1 }
                ],
                sort: {
                    key: 'value',
                    order: 'asc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual([1, 3, 4, 9, 15, 21])
        })

        it('Sorts strings ascending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: 'apple' },
                    { value: 'orange' },
                    { value: 'zebra' },
                    { value: 'Zebras' },
                    { value: 'Apples' }
                ],
                sort: {
                    key: 'value',
                    order: 'asc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual(['apple', 'Apples', 'orange', 'zebra', 'Zebras'])
        })

        it('Sorts strings descending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: 'apple' },
                    { value: 'orange' },
                    { value: 'zebra' },
                    { value: 'Zebras' },
                    { value: 'Apples' }
                ],
                sort: {
                    key: 'value',
                    order: 'desc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual(['Zebras', 'zebra', 'orange', 'Apples', 'apple'])
        })

        it('Sorts a mix of strings and numbers naturally ascending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: '1 dog' },
                    { value: 12 },
                    { value: '21 dogs' },
                    { value: '3 dogs' },
                    { value: 30 }
                ],
                sort: {
                    key: 'value',
                    order: 'asc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual(['1 dog', '3 dogs', 12, '21 dogs', 30])
        })

        it('Sorts a mix of strings and numbers naturally descending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: 'device 1' },
                    { value: 'device 3' },
                    { value: 'device 21' }
                ],
                sort: {
                    key: 'value',
                    order: 'desc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual(['device 21', 'device 3', 'device 1'])
        })

        it('Treats null and undefined as equivalent to empty string ascending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    {},
                    { value: 'zebra' },
                    { value: null },
                    { value: 'apple' },
                    { value: '' }
                ],
                sort: {
                    key: 'value',
                    order: 'asc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual([undefined, null, '', 'apple', 'zebra'])
        })

        it('Treats null and undefined as equivalent to empty string descending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    {},
                    { value: 'zebra' },
                    { value: null },
                    { value: 'apple' },
                    { value: '' }
                ],
                sort: {
                    key: 'value',
                    order: 'desc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual(['zebra', 'apple', undefined, null, ''])
        })

        it('Sorts booleans descending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: true },
                    { value: false },
                    { value: true }
                ],
                sort: {
                    key: 'value',
                    order: 'desc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual([true, true, false])
        })

        it('Sorts booleans ascending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: true },
                    { value: false },
                    { value: true }
                ],
                sort: {
                    key: 'value',
                    order: 'asc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual([false, true, true])
        })

        it('Groups booleans together by treating them as strings ascending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: true },
                    { value: false },
                    { value: true },
                    { value: 'a-string' },
                    { value: 'z-string' },
                    { value: 2 },
                    { value: 1 },
                    { value: 0 }
                ],
                sort: {
                    key: 'value',
                    order: 'asc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual([0, 1, 2, 'a-string', 'z-string', false, true, true])
        })

        it('Groups booleans together by treating them as strings descending', () => {
            const localThis = {
                lookupProperty: DataTable.methods.lookupProperty,
                filterRows: DataTable.methods.filterRows,
                rows: [
                    { value: true },
                    { value: false },
                    { value: true },
                    { value: 'a-string' },
                    { value: 'z-string' },
                    { value: 2 },
                    { value: 1 },
                    { value: 0 }
                ],
                sort: {
                    key: 'value',
                    order: 'desc'
                }
            }

            expect(
                DataTable.computed.filteredRows.call(localThis).map((row) => row.value)
            ).toEqual([true, true, false, 'z-string', 'a-string', 2, 1, 0])
        })
    })
})
