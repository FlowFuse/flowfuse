/**
 * The data controllers.
 *
 * These provide the main interface the application should use to interact with
 * the models.
 *
 *
 * @namespace models
 * @memberof forge.db
 */

const modelTypes = ['User','Session','AuthClient','Team','Invitation'];

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
