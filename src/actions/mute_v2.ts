import streamDeck, { action, KeyDownEvent, SingletonAction, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { connectSocket, getWebSocket, getMuteValue, GetVolumeValue } from '../websocket';

let camIp: any = null;
let camPort: any = null;
let muteTitle: string = "null";

@action({ UUID: "com.alexander-vyverman.camilladsp.mute" })
export class mute extends SingletonAction {
    async onKeyDown(ev: KeyDownEvent<object>) {
        console.log(" mute Pressed");

        const ws = getWebSocket();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify("ToggleMute"));
        } else {
            console.error('WebSocket for mute is not open. Cannot send message.');
        }

        const muteValue = getMuteValue();
        console.log("mutevalue BOOL: ", muteValue);

        if (!muteValue) {
            muteTitle = "Muted";
        } else if (muteValue) {
            muteTitle = "unmuted";
        }

        await ev.action.setTitle(muteTitle);
    }

    async onDidReceiveSettings(ev: DidReceiveSettingsEvent<object>): Promise<void> {
        console.log("Received settings", ev.payload.settings);
        camIp = ev.payload.settings.camillaIP;
        camPort = ev.payload.settings.camillaPORT;
        console.log("Camilla IP: " + camIp);
        console.log("Camilla port: " + camPort);

        if (camIp && camPort) {
            try {
                await connectSocket(camIp, camPort);
            } catch (error) {
                console.error("Failed to connect socket:", error);
            }
        }

        const muteValue = getMuteValue();
        if (!muteValue) {
            muteTitle = "Muted";
        } else if (muteValue) {
            muteTitle = "unmuted";
        }

        await ev.action.setTitle(muteTitle);
    }
}
