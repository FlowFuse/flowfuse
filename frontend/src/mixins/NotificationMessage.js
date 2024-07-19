export default {
    props: {
        notification: {
            type: Object,
            required: true
        },
        selections: {
            type: Array,
            required: true
        }
    },
    computed: {
        isSelected () {
            return !!this.selections.find(n => n.id === this.notification.id)
        }
    },
    emits: ['selected', 'deselected'],
    methods: {
        onSelect () {
            this.$emit('selected', this.notification)
        },
        onDeselect () {
            this.$emit('deselected', this.notification)
        },
        toggleSelection () {
            if (this.isSelected) {
                this.onDeselect()
            } else this.onSelect()
        }
    }
}
