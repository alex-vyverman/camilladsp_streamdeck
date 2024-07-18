import streamDeck, { LogLevel } from "@elgato/streamdeck";
import streamDeckClient from "@elgato/streamdeck";

// import { IncrementCounter } from "./actions/increment-counter";
import { volume } from "./actions/volume";
import { mute } from "./actions/mute"
import { log } from "console";


// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// streamDeck.settings.getGlobalSettings().then((settings) => {
//     console.log('Global settings:', settings);
// }).catch((error) => {
//     console.error('Failed to get global settings:', error);
// });





// Register the increment action.
// streamDeck.actions.registerAction(new IncrementCounter());
streamDeck.actions.registerAction(new volume());
streamDeck.actions.registerAction(new mute())

// Finally, connect to the Stream Deck.
streamDeck.connect().then(() => {
    console.log('Connected to Stream Deck');
    
}).catch((error) => {
    console.error('Failed to connect to Stream Deck:', error);
});