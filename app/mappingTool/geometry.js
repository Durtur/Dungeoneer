

class Geometry {

    area(x1, y1, x2, y2, x3, y3) {
        return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2.0);
    }

    insideCone(x1, y1, x2, y2, x3, y3, x, y) {
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

    insideRect(x1, y1, x2, y2, x, y) {
        return x >= Math.min(x1, x2)
            && y >= Math.min(y1, y2)
            && x <= Math.max(x1, x2)
            && y <= Math.max(y1, y2)

    }

    distance(a, b) {
        return Math.round(
            Math.sqrt(
                Math.pow(a.x - b.x, 2) +
                Math.pow(a.y - b.y, 2)
            ));
    }
}
module.exports = new Geometry();