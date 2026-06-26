export function debounce<Args extends unknown[]> (fn: (...args: Args) => void, wait: number) {
    let timer: ReturnType<typeof setTimeout> | undefined
    return function (this: unknown, ...args: Args) {
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn.apply(this, args)
        }, wait)
    }
}
