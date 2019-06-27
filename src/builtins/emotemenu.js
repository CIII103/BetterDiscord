import Builtin from "../structs/builtin";
import {Utilities, Events} from "modules";

import EmoteModule from "./emotes";

const headerHTML = `<div id="bda-qem">
    <button class="active" id="bda-qem-twitch">Twitch</button>
    <button id="bda-qem-favourite">Favourite</button>
    <button id="bda-qem-emojis">Emojis</buttond>
</div>`;

const twitchEmoteHTML = `<div id="bda-qem-twitch-container">
    <div class="scroller-wrap scrollerWrap-2lJEkd fade">
        <div class="scroller scroller-2FKFPG">
            <div class="emote-menu-inner">

            </div>
        </div>
    </div>
</div>`;

const favoritesHTML = `<div id="bda-qem-favourite-container">
    <div class="scroller-wrap scrollerWrap-2lJEkd fade">
        <div class="scroller scroller-2FKFPG">
            <div class="emote-menu-inner">

            </div>
        </div>
    </div>
</div>`;

const makeEmote = (emote, url, options = {}) => {
    const {onContextMenu, onClick} = options;
    const emoteContainer = Utilities.parseHTML(`<div class="emote-container">
        <img class="emote-icon" alt="${emote}" src="${url}" title="${emote}">
    </div>`);
    if (onContextMenu) emoteContainer.addEventListener("contextmenu", onContextMenu);
    emoteContainer.addEventListener("click", onClick);
    return emoteContainer;
};

export default new class EmoteMenu extends Builtin {
    get name() {return "EmoteMenu";}
    get collection() {return "emotes";}
    get category() {return "general";}
    get id() {return "emoteMenu";}
    get hideEmojisID() {return "hideEmojiMenu";}
    get hideEmojis() {return this.get(this.hideEmojisID);}

    constructor() {
        super();
        this.lastTab = "bda-qem-emojis";

        this.qmeHeader = Utilities.parseHTML(headerHTML);
        for (const button of this.qmeHeader.getElementsByTagName("button")) button.addEventListener("click", this.switchMenu.bind(this));

        this.teContainer = Utilities.parseHTML(twitchEmoteHTML);
        this.teContainerInner = this.teContainer.querySelector(".emote-menu-inner");

        this.faContainer = Utilities.parseHTML(favoritesHTML);
        this.faContainerInner = this.faContainer.querySelector(".emote-menu-inner");

        this.observer = new MutationObserver(mutations => {for (const mutation of mutations) this.observe(mutation);});
        this.enableHideEmojis = this.enableHideEmojis.bind(this);
        this.disableHideEmojis = this.disableHideEmojis.bind(this);
        this.updateTwitchEmotes = this.updateTwitchEmotes.bind(this);
    }

    async enabled() {
        this.log("Starting to observe");
        this.observer.observe(document.getElementById("app-mount"), {
            childList: true,
            subtree: true
        });
        this.hideEmojiCancel = this.registerSetting(this.hideEmojisID, this.enableHideEmojis, this.disableHideEmojis);
        if (this.hideEmojis) this.enableHideEmojis();
        if (EmoteModule.emotesLoaded) this.updateTwitchEmotes();
        Events.on("emotes-loaded", this.updateTwitchEmotes);
    }

    disabled() {
        Events.off("emotes-loaded", this.updateTwitchEmotes);
        this.observer.disconnect();
        this.disableHideEmojis();
        if (this.hideEmojiCancel) this.hideEmojiCancel();
    }

    enableHideEmojis() {
        const picker = document.querySelector(".emojiPicker-3m1S-j");
        if (picker) picker.classList.add("bda-qme-hidden");
    }

    disableHideEmojis() {
        const picker = document.querySelector(".emojiPicker-3m1S-j");
        if (picker) picker.classList.remove("bda-qme-hidden");
    }

    insertEmote(emote) {
        const ta = Utilities.getTextArea();
        Utilities.insertText(ta[0], ta.val().slice(-1) == " " ? ta.val() + emote : ta.val() + " " + emote);
    }

    favContext(e) {
        e.stopPropagation();
        const em = e.target.closest(".emote-container").children[0];
        const menu = $(`<div id="removemenu" class="bd-context-menu context-menu theme-dark">Remove</div>`);
        menu.css({
            top: e.pageY - $("#bda-qem-favourite-container").offset().top,
            left: e.pageX - $("#bda-qem-favourite-container").offset().left
        });
        $(em).parent().append(menu);
        menu.on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            $(em).remove();
            EmoteModule.removeFavorite($(em).attr("title"));
            this.updateFavorites();
            $(document).off("mousedown.emotemenu");
        });
        $(document).on("mousedown.emotemenu", function(event) {
            if (event.target.id == "removemenu") return;
            $("#removemenu").remove();
            $(document).off("mousedown.emotemenu");
        });
    }

    switchMenu(e) {
        let id = typeof(e) == "string" ? e : e.target.id;
        if (id == "bda-qem-emojis" && this.hideEmojis) id = "bda-qem-favourite";
        const twitch = $("#bda-qem-twitch");
        const fav = $("#bda-qem-favourite");
        const emojis = $("#bda-qem-emojis");
        twitch.removeClass("active");
        fav.removeClass("active");
        emojis.removeClass("active");

        $(".emojiPicker-3m1S-j").hide();
        $("#bda-qem-favourite-container").hide();
        $("#bda-qem-twitch-container").hide();

        switch (id) {
            case "bda-qem-twitch":
                twitch.addClass("active");
                $("#bda-qem-twitch-container").show();
                break;
            case "bda-qem-favourite":
                fav.addClass("active");
                $("#bda-qem-favourite-container").show();
                break;
            case "bda-qem-emojis":
                emojis.addClass("active");
                $(".emojiPicker-3m1S-j").show();
                $(".emojiPicker-3m1S-j input").focus();
                break;
        }
        if (id) this.lastTab = id;
    }

    observe(mutation) {
        if (!mutation.addedNodes.length || !(mutation.addedNodes[0] instanceof Element)) return;
        const node = mutation.addedNodes[0];
        if (!node.classList.contains("popout-3sVMXz") || node.classList.contains("popoutLeft-30WmrD") || !node.getElementsByClassName("emojiPicker-3m1S-j").length) return;

        const e = $(node);
        if (this.hideEmojis) e.addClass("bda-qme-hidden");
        else e.removeClass("bda-qme-hidden");

        e.prepend(this.qmeHeader);
        e.append(this.teContainer);
        e.append(this.faContainer);

        this.switchMenu(this.lastTab);
    }

    updateTwitchEmotes() {
        while (this.teContainerInner.firstChild) this.teContainerInner.firstChild.remove();
        for (const emote in EmoteModule.getCategory("TwitchGlobal")) {
            if (!EmoteModule.getCategory("TwitchGlobal").hasOwnProperty(emote)) continue;
            const url = EmoteModule.getCategory("TwitchGlobal")[emote];
            const emoteElement = makeEmote(emote, url, {onClick: this.insertEmote.bind(this, emote)});
            this.teContainerInner.append(emoteElement);
        }
    }

    updateFavorites() {
        while (this.faContainerInner.firstChild) this.faContainerInner.firstChild.remove();
        for (const emote in EmoteModule.favorites) {
            const url = EmoteModule.favorites[emote];
            const emoteElement = makeEmote(emote, url, {onClick: this.insertEmote.bind(this, emote), onContextMenu: this.favContext.bind(this)});
            this.faContainerInner.append(emoteElement);
        }
        EmoteModule.saveFavorites();
    }

};