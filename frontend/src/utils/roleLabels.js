import { t } from '../i18n.js'

import { Roles } from './roles.js'

/**
 * Human-readable, translated labels for team roles.
 *
 * `RoleNames` in `utils/roles.js` maps a role to a lowercase identifier
 * (`'owner'`, `'member'`) that code compares against — it is not display text
 * and must not be translated. This maps the same roles onto message keys for
 * the places a role is shown to someone.
 */
const ROLE_LABEL_KEYS = {
    [Roles.None]: 'ui.noAccess',
    [Roles.Dashboard]: 'ui.dashboard',
    [Roles.Viewer]: 'ui.viewer',
    [Roles.Member]: 'ui.member',
    [Roles.Owner]: 'ui.owner',
    [Roles.Admin]: 'ui.admin2'
}

/**
 * @param {number} role a value from `Roles`
 * @returns {string} the translated label, or an empty string for an unknown role
 */
export function roleLabel (role) {
    const key = ROLE_LABEL_KEYS[role]
    return key ? t(key) : ''
}

export default roleLabel
