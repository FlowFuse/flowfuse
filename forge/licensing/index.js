const loader = require("./loader");
const fp = require("fastify-plugin");

module.exports = fp(async function(app, opts, next) {
    // Dev License:
    // {
    //     iss: "FlowForge Inc.",
    //     sub: "FlowForge Inc. Development",
    //     nbf: 2021-12-17 14:26:00,
    //     exp: 2200-01-01,
    //     note: "For development only",
    //     tier: "teams",
    //     users: '100',
    //     teams: '100',
    //     projects: '100'
    // }
    const devLicense = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjM5NzUxMTc1LCJleHAiOjcyNTgxMTg0MDAsIm5vdGUiOiJGb3IgZGV2ZWxvcG1lbnQgb25seSIsInRpZXIiOiJ0ZWFtcyIsInVzZXJzIjoiMTAwIiwidGVhbXMiOiIxMDAiLCJwcm9qZWN0cyI6IjEwMCIsImlhdCI6MTYzOTc1MTE3NX0.CZwIbUV9-vC1dPHaJqVJx1YchK_4JgRMBCd5UEQfNYblXNJKiaR9BFY7T-Qvzg1HsR3rbDhmraiiVMfGuR75gw";

    // TODO: load license from local file or app.config.XYZ

    let userLicense = await app.settings.get('license');

    // if (!userLicense) {
    //     console.log("No user-provided license found - using development license")
    //     userLicense = devLicense;
    // }
    let activeLicense = null;

    const licenseApi = {
        apply: async (license) => {
            await applyLicense(license);
            await app.settings.set('license',license);
        },
        inspect: async (license) => {
            return await loader.verifyLicense(license);
        },
        active: () => activeLicense !== null,
        get: (key) => {
            return key?activeLicense && activeLicense[key]:activeLicense
        }
    }

    if (userLicense) {
        try {
            await applyLicense(userLicense)
        } catch(err) {
            throw new Error("Failed to apply license: "+err.toString());
        }
    } else {
        console.log("No license applied");
    }
    app.decorate("license", licenseApi);

    next();


    async function applyLicense(license) {
        activeLicense = await loader.verifyLicense(license);
        console.log("License verified:")
        console.log(" Org:    ",activeLicense.organisation)
        console.log(" Tier:   ",activeLicense.tier)
        console.log(" Expires:",activeLicense.expiresAt.toISOString())
        console.log(" Valid From:",activeLicense.expiresAt.toISOString())
    }
});
