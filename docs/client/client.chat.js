class Chat {
    render(container, sendHandler) {
        this.buttonContainer = container;
        this.createButton();
        this.chatVisible = localStorage.getItem("chat-visible") == "true";
        this.sendHandler = sendHandler;
    }

    messageReceived(message) {
        if (!this.chatContainer) this.createChatContainer();

        var messages = localStorage.getItem("chat-messages");
        if (!messages) messages = [];
        try {
            messages = JSON.parse(messages);
        } catch (e) {
            messages = [];
        }
        messages.push(message);
        messages.length = Math.min(messages.length, 700);
        localStorage.setItem("chat-messages", JSON.stringify(messages));
        this.displayMessages();
    }
    displayMessages() {
        var messages = localStorage.getItem("chat-messages");
        if (!messages) messages = [];
        messages = JSON.parse(messages);
        var cls = this;
        var messageCont = this.chatContainer.querySelector(".chat-container-messages");
        while (messageCont.firstChild) messageCont.removeChild(messageCont.firstChild);
        messages.forEach((message) => {
            this.chatContainer.querySelector(".chat-container-messages").appendChild(this.createChatMessage(message));
        });
        
        messageCont.scrollTop = messageCont.scrollHeight;
    }
    createChatMessage(message) {
        var cont = Util.ele("div", "row chat-message-node");
        var sender = Util.ele("strong", "chat-message-sender", `${message.name}:`);
        var msg = Util.ele("p", "chat-message", message.text);
        cont.appendChild(sender);
        cont.appendChild(msg);
        return cont;
    }
    createButton() {
        if(document.getElementById("chat-button"))return;
        var btn = Util.ele("button", "button_style chat-button toggle_button ");
        btn.id = "chat-button";
        this.buttonContainer.appendChild(btn);

        btn.onclick = () => this.toggleChat();
    }

    createChatContainer() {
        this.chatContainer = Util.ele("div", "chat-container");
        if (!this.chatVisible) this.chatContainer.classList.add("hidden");
        var chatMessageContainer = Util.ele("div", "chat-container-messages");
        this.chatContainer.appendChild(chatMessageContainer);
        var input = Util.ele("input", "chat-message-input");
        input.id = "chat-message-input";
        var cls = this;
        input.setAttribute("placeholder", "Type message...");
        input.onkeydown = (e) => {
            if (e.keyCode == 13 && e.target.value) {
                cls.sendHandler(e.target.value);
                e.target.value = "";
            }
        };
        this.chatContainer.appendChild(input);
        document.body.appendChild(this.chatContainer);
        this.displayMessages();
    }

    toggleChat() {
        this.chatVisible = !this.chatVisible;
        if (!this.chatContainer) {
            this.createChatContainer();
            return;
        }
        if (this.chatVisible) {
            this.chatContainer.classList.remove("hidden");
        } else {
            this.chatContainer.classList.add("hidden");
        }
    }
}
