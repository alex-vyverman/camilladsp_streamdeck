import streamDeck, { LogLevel } from "@elgato/streamdeck";

// import { IncrementCounter } from "./actions/increment-counter";
import { ChangeConfig } from "./actions/change-config";
import { Volume } from "./actions/volume";
import { Status } from "./actions/status";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the increment action.
// streamDeck.actions.registerAction(new IncrementCounter());
streamDeck.actions.registerAction(new ChangeConfig());
streamDeck.actions.registerAction(new Volume());
streamDeck.actions.registerAction(new Status());

// Finally, connect to the Stream Deck.
streamDeck.connect();
streamDeck.logger.info("Plugin connected to Stream Deck software");


