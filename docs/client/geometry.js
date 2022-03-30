
class Geometry {

    static area(x1, y1, x2, y2, x3, y3) {
        return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2.0);
    }

    static insideCone(x1, y1, x2, y2, x3, y3, x, y) {
        /* Calculate area of triangle ABC */
        let A = this.area(x1, y1, x2, y2, x3, y3);

        /* Calculate area of triangle PBC */
        let A1 = this.area(x, y, x2, y2, x3, y3);

        /* Calculate area of triangle PAC */
        let A2 = this.area(x1, y1, x, y, x3, y3);

        /* Calculate area of triangle PAB */
        let A3 = this.area(x1, y1, x2, y2, x, y);

        /* Check if sum of A1, A2 and A3 is same as A */
        return (A == A1 + A2 + A3);
    }

    static insideRect(x1, y1, x2, y2, x, y) {
        return x >= Math.min(x1, x2)
            && y >= Math.min(y1, y2)
            && x <= Math.max(x1, x2)
            && y <= Math.max(y1, y2)

    }

    static distance(a, b) {
        return Math.round(
            Math.sqrt(
                Math.pow(a.x - b.x, 2) +
                Math.pow(a.y - b.y, 2)
            ));
    }

    static angleBetween(a, b) {
        return Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;;
    }

    static rotate(angle, origin, coords) {
        angle *= -1;
        var x = (coords.x - origin.x) * Math.cos(angle) - (coords.y - origin.y) * Math.sin(angle);
        var y = (coords.x - origin.x) * Math.sin(angle) + (coords.y - origin.y) * Math.cos(angle);
        return { "x": parseInt(x + origin.x * 1), "y": parseInt(y + origin.y * 1) }
    }

    static movePointToAnother(a, b, dist) {

        var totalDist = this.distance(a, b);
        var moveScale = 0.25;

        //P⃗ −B⃗ =[P1−B1,P2−B2,P3−B3]

        console.log(moveScale)
        var newX = a.x + (a.x - b.x) * moveScale;
        var newY = a.y + (a.y - b.y) * moveScale;
        console.log(newX, newY, a, b)
        return { x: newX, y: newY }

    }
}
module.exports =Geometry;