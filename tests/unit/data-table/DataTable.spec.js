import DataTable from '@/components/data-table/DataTable.vue'

describe('DataTable', () => {
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
            ).toEqual([false, true, true, 0, 1, 2, 'a-string', 'z-string'])
        })
        })
    })
})
