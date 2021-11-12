/**
 * The data views.
 *
 * These provide utility functions for rendering views of objects in the database.
 *
 * For example, the User.userProfile view takes a User model instance and returns
 * the object that is suitable for returning on the external API.
 *
 * @namespace models
 * @memberof forge.db
 */

 const modelTypes = ['User', 'Team','Project','Invitation'];

async function init(db) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`);
        module.exports[type] = {};
        for (let key in m) {
            module.exports[type][key] = m[key].bind(m,db)
        }
    });
}
module.exports.init = init;
