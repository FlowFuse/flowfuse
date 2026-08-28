import AuditEventsGrouped from '../data/audit-events.json'
import { t } from '../i18n.js'

/**
 * Message key for an audit event id.
 *
 * `data/audit-events.json` keeps the English labels, and stays the source of
 * truth for which events exist and how they group. The labels shown to someone
 * come from the `auditEvents` namespace instead, keyed by the camel-cased event
 * id — `team.user.invite.accepted` becomes `teamUserInviteAccepted`.
 *
 * @param {string} eventId e.g. 'team.user.added'
 * @returns {string} e.g. 'auditEvents.teamUserAdded'
 */
function messageKey (eventId) {
    const parts = eventId.split(/[.\-_]/)
    return 'auditEvents.' + parts[0] + parts.slice(1)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join('')
}

/*
 Function set to make retrieving the formatted labels for audit events easier
*/
export default {
    get () {
        const auditEvts = {}
        const groups = Object.values(AuditEventsGrouped)

        groups.forEach((group) => {
            for (const key of Object.keys(group)) {
                auditEvts[key] = t(messageKey(key))
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
        for (const eventId of Object.keys(events)) {
            const label = t(messageKey(eventId))
            if (!mapping[label]) {
                mapping[label] = []
            }
            mapping[label].push(eventId)
        }
        return mapping
    }
}
