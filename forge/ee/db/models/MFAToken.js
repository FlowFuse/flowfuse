const speakeasy = require('@levminer/speakeasy')
const QRCode = require('qrcode')
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'MFAToken',
    schema: {
        token: {
            type: DataTypes.STRING,
            allowNull: false
        },
        verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    },
    associations: function (M) {
        this.belongsTo(M.User, { onDelete: 'CASCADE' })
    },
    hooks: function (M, app) {
        return {
            afterDestroy: async (token, opts) => {
                const user = await token.getUser()
                user.mfa_enabled = false
                return user.save()
            }
        }
    },
    finders: function (M) {
        return {
            instance: {
                generateAuthURL: async function () {
                    const user = await this.getUser()
                    const authURL = speakeasy.otpauthURL({ secret: this.token, label: `${user.username}@FlowFuse` })
                    return {
                        url: authURL,
                        qrcode: await QRCode.toDataURL(authURL)
                    }
                },
                verifyToken: function (token) {
                    return speakeasy.totp.verify({ secret: this.token, window: 1, token })
                },
                generateToken: function () {
                    return speakeasy.totp({
                        secret: this.token
                    })
                }
            },
            static: {
                createTokenForUser: async (user) => {
                    // There can be only one.
                    await M.MFAToken.destroy({ where: { UserId: user.id }, individualHooks: true })
                    // Generate a new token
                    const tokens = speakeasy.generateSecret()
                    return M.MFAToken.create({
                        token: tokens.ascii,
                        verified: false,
                        UserId: user.id
                    })
                },
                forUser: async (user) => {
                    return this.findOne({
                        where: { UserId: user.id }
                    })
                },
                verifyTokenForUser: async (user, token) => {
                    const mfaToken = await M.MFAToken.forUser(user)
                    return !!(mfaToken && mfaToken.verifyToken(token))
                },
                deleteTokenForUser: async (user) => {
                    return M.MFAToken.destroy({ where: { UserId: user.id }, individualHooks: true })
                }
            }
        }
    }
}
