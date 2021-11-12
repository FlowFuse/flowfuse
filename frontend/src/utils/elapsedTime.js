export default function(delta) {
    delta /= 1000;

    if (delta < 60) {
        return "seconds";
    }

    delta = Math.floor(delta/60);

    if (delta < 10) {
        return "minutes";
    }
    if (delta < 60) {
        return delta+" minutes";
    }

    delta = Math.floor(delta/60);

    if (delta < 24) {
        return delta+" hour"+(delta>1?"s":"");
    }

    delta = Math.floor(delta/24);

    if (delta < 7) {
        return delta+" day"+(delta>1?"s":"");
    }
    var weeks = Math.floor(delta/7);
    var days = delta%7;

    if (weeks < 4) {
        if (days === 0) {
            return weeks+" week"+(weeks>1?"s":"");
        } else {
            return weeks+" week"+(weeks>1?"s":"")+", "+days+" day"+(days>1?"s":"");
        }
    }

    var months = Math.floor(weeks/4);
    weeks = weeks%4;

    if (months < 12) {
        if (weeks === 0) {
            return months+" month"+(months>1?"s":"");
        } else {
            return months+" month"+(months>1?"s":"")+", "+weeks+" week"+(weeks>1?"s":"");
        }
    }

    var years = Math.floor(months/12);
    months = months%12;

    if (months === 0) {
        return years+" year"+(years>1?"s":"");
    } else {
        return years+" year"+(years>1?"s":"")+", "+months+" month"+(months>1?"s":"");
    }
}
