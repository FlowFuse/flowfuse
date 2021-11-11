import elapsedTime from '@/utils/elapsedTime';

export default function(dateString) {
    if (!dateString) {
        return "";
    }
    if (!dateString) {
        return "";
    }
    var now = Date.now();
    var d = new Date(dateString);
    var delta = now - d.getTime();

    return elapsedTime(delta)+" ago"
}
