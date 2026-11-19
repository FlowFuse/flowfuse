/**
 * A named group of data schemas in a team. A schema belongs to at most one group.
 * @namespace forge.db.models.DataSchemaGroup
 */

const { DataTypes, literal } = require('sequelize')

const nameValidator = { msg: 'Schema group name cannot be empty' }

module.exports = {
    name: 'DataSchemaGroup',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            set (value) {
                this.setDataValue('name', typeof value === 'string' ? value.trim() : value)
            },
            validate: {
                notEmpty: nameValidator,
                notNull: nameValidator,
                len: { args: [1, 255], msg: 'Schema group name must be at most 255 characters' }
            }
        }
    },
    meta: {
        slug: false,
        links: false
    },
    associations: function (M) {
        this.belongsTo(M.Team, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })
        this.hasMany(M.DataSchema)
    },
    finders: function (M) {
        const schemaCountLiteral = literal(`(
            SELECT COUNT(*)
            FROM "DataSchemas" AS "schema"
            WHERE "schema"."DataSchemaGroupId" = "DataSchemaGroup"."id"
        )`)
        return {
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        [id] = M.DataSchemaGroup.decodeHashid(id) || []
                        if (id === undefined) {
                            return null
                        }
                    }
                    return this.findOne({
                        where: { id },
                        attributes: { include: [[schemaCountLiteral, 'schemaCount']] }
                    })
                },
                /**
                 * Every group in the team with its schema count, sorted by name
                 * @param {number} teamId
                 */
                forTeam: async (teamId) => {
                    return this.findAll({
                        where: { TeamId: teamId },
                        attributes: { include: [[schemaCountLiteral, 'schemaCount']] },
                        order: [['name', 'ASC']]
                    })
                }
            }
        }
    }
}
