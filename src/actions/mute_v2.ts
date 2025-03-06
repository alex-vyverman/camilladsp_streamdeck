import streamDeck, { action, KeyDownEvent, SingletonAction, DidReceiveSettingsEvent } from "@elgato/streamdeck";

interface Settings {
    camillaIP: string;
    camillaPORT: string;
}
import { connectSocket, getWebSocket, getMuteValue, GetVolumeValue } from '../websocket';

let camIp: any = null;
let camPort: any = null;
let muteTitle: string = "null";

@action({ UUID: "com.alexander-vyverman.camilladsp.mute" })
export class mute extends SingletonAction {
    async onKeyDown(ev: KeyDownEvent<object>) {
        console.log(" mute Pressed");

        const ws = await getWebSocket();
        if (ws && ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify("ToggleMute"));
        } else {
            console.error('WebSocket for mute is not open. Cannot send message.');
        }

        const muteValue = await getMuteValue();
        console.log("mutevalue BOOL: ", muteValue);

        if (!muteValue) {
            muteTitle = "Muted";
        } else if (muteValue) {
            muteTitle = "unmuted";
        }

        await ev.action.setTitle(muteTitle);
    }

    async onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): Promise<void> {
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

        const muteValue = await getMuteValue();
        if (!muteValue) {
            muteTitle = "Muted";
        } else if (muteValue) {
            muteTitle = "unmuted";
        }

        await ev.action.setTitle(muteTitle);
    }
}
