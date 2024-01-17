/* eslint-disable no-unused-vars */
/**
 * Add targetSnapshotId to DeviceGroups
 *
 * -- DDL for table DeviceGroups - before migration
 * CREATE TABLE DeviceGroups (
 *     id            INTEGER       PRIMARY KEY AUTOINCREMENT,
 *     name          VARCHAR (255) NOT NULL,
 *     description   TEXT,
 *     createdAt     DATETIME      NOT NULL,
 *     updatedAt     DATETIME      NOT NULL,
 *     ApplicationId INTEGER       REFERENCES Applications (id) ON DELETE CASCADE
 *                                                              ON UPDATE CASCADE
 * );
 *
 *
 * -- DDL for table DeviceGroups - after migration
 * CREATE TABLE DeviceGroups (
 *     id               INTEGER       PRIMARY KEY AUTOINCREMENT,
 *     name             VARCHAR (255) NOT NULL,
 *     description      TEXT,
 *     createdAt        DATETIME      NOT NULL,
 *     updatedAt        DATETIME      NOT NULL,
 *     ApplicationId    INTEGER       REFERENCES Applications (id) ON DELETE CASCADE
 *                                                                 ON UPDATE CASCADE,
 *     targetSnapshotId INTEGER       REFERENCES ProjectSnapshots (id) ON DELETE SET NULL
 *                                                                     ON UPDATE CASCADE
 * );
 *
 *
 * -- DDL for table DeviceGroups - auto created by sequelize
 * CREATE TABLE DeviceGroups (
 *     id               INTEGER       PRIMARY KEY AUTOINCREMENT,
 *     name             VARCHAR (255) NOT NULL,
 *     description      TEXT,
 *     targetSnapshotId INTEGER       REFERENCES ProjectSnapshots (id) ON DELETE SET NULL
 *                                                                     ON UPDATE CASCADE,
 *     createdAt        DATETIME      NOT NULL,
 *     updatedAt        DATETIME      NOT NULL,
 *     ApplicationId    INTEGER       REFERENCES Applications (id) ON DELETE CASCADE
 *                                                                 ON UPDATE CASCADE
 * );
 *
 */

const { Sequelize, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context QueryInterface
     */
    up: async (context) => {
        await context.addColumn('DeviceGroups', 'targetSnapshotId', {
            type: Sequelize.INTEGER,
            references: {
                model: 'ProjectSnapshots',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        })
    },

    down: async (queryInterface, Sequelize) => {

    }
}
