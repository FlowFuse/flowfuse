export default function postHogMiddleware ({
    next,
    to,
    from
}) {
    window.posthog?.capture(
        '$pageleave',
        {
            to: to.fullPath,
            $current_url: from.fullPath
        }
    )
    window.posthog?.capture(
        '$pageview',
        {
            from: from.fullPath,
            $current_url: to.fullPath
        }
    )

    return next()
}
