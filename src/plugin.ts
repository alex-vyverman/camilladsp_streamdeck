import streamDeck, { action, LogLevel } from "@elgato/streamdeck";
import streamDeckClient from "@elgato/streamdeck";

// import { IncrementCounter } from "./actions/increment-counter";
import { Volume } from "./actions/volume";
import { mute } from "./actions/mute"
// import { log } from "console";
import { camConfig } from "./actions/camConfig"
// import { connection } from "websocket";


// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// console.error(...)
streamDeck.logger.error("Failures or exceptions");

// console.warn(...)
streamDeck.logger.warn("Recoverable errors");

// console.log(...);
streamDeck.logger.info("Hello world");
streamDeck.logger.debug("Debugging information");
streamDeck.logger.trace("Detailed messages");




// streamDeck.settings.getGlobalSettings().then((settings) => {
//     console.log('Global settings:', settings);
// }).catch((error) => {
//     console.error('Failed to get global settings:', error);
// });





// Register the increment action.
// streamDeck.actions.registerAction(new IncrementCounter());
streamDeck.actions.registerAction(new Volume());
streamDeck.actions.registerAction(new mute())
streamDeck.actions.registerAction(new camConfig())

// Finally, connect to the Stream Deck.
streamDeck.connect().then((obj) => {
    console.log('Connected to Stream Deck', obj);
    
}).catch((error) => {
    console.error('Failed to connect to Stream Deck:', error);
});