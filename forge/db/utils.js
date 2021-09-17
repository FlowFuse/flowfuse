const bcrypt = require("bcrypt");
const crypto = require("crypto");

const base64URLEncode = str => str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');


module.exports = {
    generateToken: (length,prefix) =>  (prefix?prefix+"_":"")+base64URLEncode(crypto.randomBytes(length || 32)),
    hash: value => bcrypt.hashSync(value, 10),
    sha256: value => crypto.createHash('sha256').update(value).digest().toString('base64'),
    compareHash: (plain,hashed) => bcrypt.compareSync(plain, hashed)
}
