


class Timeout {

    constructor(connection) {
        this.ackRequested = false;
        this.POLL_SECONDS = 30;
        this.connection = connection;
        var cls = this;
        this.requestTimeout = window.setInterval(() => {
            if (cls.ackRequested) {
                //timed out
                cls.connection.close();
                console.error("Connection timed out");
                window.clearInterval(cls.requestTimeout);
                return;
            }
            console.log("Connection ping");
            cls.connection.send({ event: "ping" });
            cls.ackRequested = true;
        }, this.POLL_SECONDS * 1000)


    }

    destroy() {
        window.clearInterval(this.requestTimeout);
    }

    ack() {
        console.log("Connection ack");
        this.ackRequested = false;
    }
}