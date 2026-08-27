/**
 * Let a user pick the language the platform is presented in.
 *
 *   language - a BCP 47 locale tag, e.g. `zh-TW`. Null means the user has
 *              expressed no preference, in which case the platform negotiates a
 *              locale from the request (`Accept-Language` on the server,
 *              `navigator.language` in the browser) and falls back to English.
 *              Null is the default so existing users keep the behaviour they
 *              have today.
 *
 * This is stored server-side rather than kept in the browser — unlike the theme
 * preference, which is local-only — because content the platform generates
 * outside a browser session needs it too, most obviously the emails rendered in
 * forge/postoffice/templates.
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Users', 'language', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {}
}
