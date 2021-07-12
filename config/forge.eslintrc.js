module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true
    },
    extends: [
        'airbnb-base'
    ],
    parserOptions: {
        ecmaVersion: 12
    },
    plugins: [
        'vue'
    ],
    rules: {
        semi: ["warn", "never"],
        quotes: "off",
        indent: ["error", 4],
        "comma-dangle": ["error", "never"],
        "no-param-reassign": ["error", { props: false }]
    }
};
