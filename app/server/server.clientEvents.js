const CLIENT_EVENT_HANLDERS = {
    init: function (data, connection, peer) {
        peer.name = data.name;
        peers.onchange();
        appendServerLog(`${data.name} connected`, SERVER_EVENTS.CONNECTED);
        pendingStateRequests.push(peer);
        window.subscribe.requestMapToolState();
        connection.send({ event: "enabled-features", data: ["dice-roller"] });
    },
    "object-moved": function (data, connection, peer) {
        if (peer.partyAccess == null) return;

        data.data.forEach((ele) => {
            var access = peer.partyAccess.find((x) => x.element_id == ele.id || x.element_id == "all");

            if (access) {
                notifyMaptool({ event: data.event, data: ele });
                var player = peer.partyAccess.find((x) => x.id == ele.id);

                if (player || ele.idx) {
                    var pwnName = player?.character_name || `token ${ele.idx}`;
                    appendServerLog(`${peer.name} moved ${pwnName} ${ele.distance}`, SERVER_EVENTS.MOVE);
                }

                var otherPeers = peers.filter((x) => x.connection.connectionId != peer.connection.connectionId);
                otherPeers.forEach((otherPeer) => {
                    otherPeer.connection.send({ event: data.event, data: [ele] });
                });
            }
        });
    },
    "request-sound": function (data, connection, peer) {
        var effectSrc = data.data;
        sendSoundBase64(effectSrc, connection);
    },
    "roll-dice": function (data, connection, peer) {
        var result = diceRoller.rollFromString(data.diceString);
        appendServerLog(`${peer.name} rolled ${data.diceString}: ${result}`, SERVER_EVENTS.MOVE);
        return connection.send({
            event: "dice-result",
            data: {
                result: result,
                diceString: data.diceString,
            },
        });
    },
};
