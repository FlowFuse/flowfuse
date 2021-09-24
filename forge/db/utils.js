const bcrypt = require("bcrypt");
const crypto = require("crypto");

const base64URLEncode = str => str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const md5 = str => crypto.createHash('md5').update(str).digest("hex");
const sha256 = value => crypto.createHash('sha256').update(value).digest().toString('base64');

module.exports = {
    generateToken: (length,prefix) =>  (prefix?prefix+"_":"")+base64URLEncode(crypto.randomBytes(length || 32)),
    hash: value => bcrypt.hashSync(value, 10),
    compareHash: (plain,hashed) => bcrypt.compareSync(plain, hashed),
    md5,
    sha256,
    generateAvatar: key => {
        const keyHash = md5(key.trim().toLowerCase());
        return `//www.gravatar.com/avatar/${keyHash}?d=identicon` //retro mp
    },
    slugify: str => str.trim().toLowerCase().replace(/ /g,"-").replace(/[^a-z0-9-_]/ig,"")
}
