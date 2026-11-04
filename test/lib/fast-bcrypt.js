// Hashing at the production cost of 10 rounds dominates test CPU time.
// Tests only need valid hashes, so use the minimum cost.
const bcrypt = require('bcrypt')

const hashSync = bcrypt.hashSync
bcrypt.hashSync = (value) => hashSync(value, 4)
