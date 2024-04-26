import AuditEventsService from '../services/audit-events.js'

export default {
    data () { return { AuditEvents: AuditEventsService.get() } },
    setup () {
        return {
            AuditEvents: AuditEventsService.get()
        }
    },
    methods: {
        labelForAuditLogEntry (eventName) {
            if (!eventName) return 'Unknown Event'
            if (this.AuditEvents && this.AuditEvents[eventName]) {
                return this.AuditEvents[eventName]
            }
            let labelText = eventName
            labelText = labelText.replace(/[-._:]/g, ' ')
            labelText = labelText.replace(/\b\w/g, l => l.toUpperCase())
            labelText = labelText.replace(/([a-z])([A-Z])/g, '$1 $2')
            return labelText
        }
    }
}
