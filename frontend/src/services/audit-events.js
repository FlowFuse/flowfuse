
import AuditEventsGrouped from '@/data/audit-events.json'

/*
 Function set to make retrieving the formatted labels for audit events easier
*/
export default {
    get () {
        const auditEvts = {}
        const groups = Object.values(AuditEventsGrouped)

        groups.forEach((group) => {
            for (const [key, value] of Object.entries(group)) {
                auditEvts[key] = value
            }
        })

        return auditEvts
    },
    /*
     * get just a group of events for display in audit filtering
     * ensures our election list is limited to just those events that can appear in a given log
     * */
    getGroup (group) {
        // because of legacy log types, in some cases we have duplicate labels
        // this ensures we hide them for the sake of the dropdowns
        const events = AuditEventsGrouped[group]
        // index by the label to allow for grouping of legacy keys
        const mapping = {}
        for (const [eventId, label] of Object.entries(events)) {
            if (!mapping[label]) {
                mapping[label] = []
            }
            mapping[label].push(eventId)
        }
        return mapping
    }
}
