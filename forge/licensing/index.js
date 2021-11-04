const loader = require("./loader");
const fp = require("fastify-plugin");

module.exports = fp(async function(app, opts, next) {
    // Dev License:
    // {
    //     iss: "FlowForge Inc.",
    //     exp: "2200-01-01",
    //     sub: "FlowForge Inc. Development",
    //     tier: "teams",
    //     note: "For development only"
    // }
    const devLicense = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsImV4cCI6NzI1ODExODQwMCwic3ViIjoiRmxvd0ZvcmdlIEluYy4gRGV2ZWxvcG1lbnQiLCJ0aWVyIjoidGVhbXMiLCJub3RlIjoiRm9yIGRldmVsb3BtZW50IG9ubHkiLCJpYXQiOjE2Mjc1OTM1NTR9.RUoavN-5mAkpw2EMCrQF39zjrttixvxPJ0vupA1VLs53WOPjXFEM8YrMQdk7_Bxq9n-osdGIInM2ZAmLKtDFsQ";

    // TODO: load license from local file or app.config.XYZ

    let userLicense = await app.settings.get('license');

    // if (!userLicense) {
    //     console.log("No user-provided license found - using development license")
    //     userLicense = devLicense;
    // }
    let activeLicense = null;

    const licenseApi = {
        apply: async (license) => {
            activeLicense = await loader.verifyLicense(license);
            console.log("License verified:")
            console.log(" Org:    ",activeLicense.organisation)
            console.log(" Tier:   ",activeLicense.tier)
            console.log(" Expires:",activeLicense.expiresAt.toISOString())
        },
        active: () => activeLicense !== null,
        get: (key) => {
            return activeLicense && activeLicense[key]
        }
    }

    if (userLicense) {
        try {
            licenseApi.apply(userLicense)
        } catch(err) {
            throw new Error("Failed to apply license: "+err.toString());
        }
    } else {
        console.log("No license applied");
    }
    app.decorate("license", licenseApi);

    next();
});
