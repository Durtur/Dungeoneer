

var mathyUtil = function () {
    function getNormallyDistributedNum(mean, std_dev) {
        return mean + (gaussRandom() * std_dev);
    }

    /*
     * Returns random number in normal distribution centering on 0.
     * ~95% of numbers returned should fall between -2 and 2
     * ie within two standard deviations
     */
    function gaussRandom() {
        var u = 2 * Math.random() - 1;
        var v = 2 * Math.random() - 1;
        var r = u * u + v * v;
        /*if outside interval [0,1] start over*/
        if (r == 0 || r >= 1) return gaussRandom();

        var c = Math.sqrt(-2 * Math.log(r) / r);
        return u * c;

        /* todo: optimize this algorithm by caching (v*c) 
         * and returning next time gaussRandom() is called.
         * left out for simplicity */
    }
    return {
        getNormallyDistributedNum: getNormallyDistributedNum,
    }
}();

module.exports = mathyUtil;

