export default function (name: string): string {
    return name.trim().toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-_]/ig, '')
}
