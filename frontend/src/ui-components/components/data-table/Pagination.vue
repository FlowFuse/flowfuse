<template>
    <div class="ff-pagination" data-el="pagination">
        <div class="ff-pagination--page-size">
            <label>Rows per page:</label>
            <ff-listbox
                v-model="pageSizeModel"
                :options="pageSizeListboxOptions"
                :min-width="64"
                :options-min-width="64"
                data-form="page-size"
            />
        </div>
        <div class="ff-pagination--summary">{{ summary }}</div>
        <nav class="ff-pagination--pages" aria-label="Pagination">
            <ff-button
                kind="tertiary"
                size="small"
                :disabled="props.page <= 1"
                title="Previous page"
                data-action="page-prev"
                @click="goTo(props.page - 1)"
            >
                <template #icon><ChevronLeftIcon /></template>
            </ff-button>
            <template v-for="(p, idx) in pageItems" :key="idx">
                <span v-if="p === '...'" class="ff-pagination--ellipsis">…</span>
                <ff-button
                    v-else
                    :kind="p === props.page ? 'primary' : 'tertiary'"
                    size="small"
                    :data-action="'page-' + p"
                    @click="goTo(p)"
                >
                    {{ p }}
                </ff-button>
            </template>
            <ff-button
                kind="tertiary"
                size="small"
                :disabled="props.page >= pageCount"
                title="Next page"
                data-action="page-next"
                @click="goTo(props.page + 1)"
            >
                <template #icon><ChevronRightIcon /></template>
            </ff-button>
        </nav>
    </div>
</template>

<script setup>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/solid'
import { computed } from 'vue'

defineOptions({ name: 'ff-pagination' })

const props = defineProps({
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 25 },
    total: { type: Number, default: 0 },
    pageSizeOptions: { type: Array, default: () => [10, 25, 50, 100] }
})

const emit = defineEmits(['update:page', 'update:pageSize'])

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const summary = computed(() => {
    if (props.total === 0) return '0 of 0'
    const from = (props.page - 1) * props.pageSize + 1
    const to = Math.min(props.total, props.page * props.pageSize)
    return `${from}–${to} of ${props.total}`
})

const pageItems = computed(() => {
    // Compact list: 1, …, page-1, page, page+1, …, N (always show first, last, and a window around current).
    const total = pageCount.value
    const current = props.page
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }
    const items = new Set([1, total, current, current - 1, current + 1])
    const list = [...items].filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
    const out = []
    for (let i = 0; i < list.length; i++) {
        if (i > 0 && list[i] - list[i - 1] > 1) out.push('...')
        out.push(list[i])
    }
    return out
})

const pageSizeListboxOptions = computed(() =>
    props.pageSizeOptions.map(size => ({ label: String(size), value: size }))
)

const pageSizeModel = computed({
    get: () => props.pageSize,
    set: (value) => {
        const next = Number(value)
        if (!isNaN(next) && next !== props.pageSize) emit('update:pageSize', next)
    }
})

function goTo (target) {
    if (typeof target !== 'number') return
    const next = Math.min(pageCount.value, Math.max(1, target))
    if (next !== props.page) emit('update:page', next)
}
</script>
