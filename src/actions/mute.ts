import streamDeck, { action, KeyDownEvent, SingletonAction, DialRotateEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";

import WebSocket from 'ws';

let ws: any = null;
let camIp: any = null;
let camPort: any = null;
let muteValue: boolean
let muteTitle: string = "null";

function connectSocket(camIp: string, camPort: number): any {
	ws = new WebSocket(`ws://${camIp}:${camPort}`);

	ws.onopen = function open() {
		console.log('Connected to WebSocket');

		ws.send(JSON.stringify("GetMute"))


	};

	ws.onclose = function close() {
		console.log('Disconnected from WebSocket');
	};

	ws.onerror = function error(err: any) {
		console.error('WebSocket error:', err);
	};

	ws.onmessage = function message(event: { data: string }) {
		console.log('Received message from WebSocket:', event.data);


		let data;
		try {
			data = JSON.parse(event.data);
		} catch (e) {
			console.error('Failed to parse message:', event.data);
			return;
		}


		if (data.ToggleMute) {
			muteValue = data.ToggleMute.value;
			console.log(muteValue);
		} else if (data.GetMute) {
			muteValue = data.GetMute.value;
			console.log(muteValue);
		} else {
			console.log('Unknown message type:', data);
		}
	};

	return ws;
}







@action({ UUID: "com.alexander-vyverman.camilladsp.mute" })
export class mute extends SingletonAction {
	async onKeyDown(ev: KeyDownEvent<object>) {

		console.log(" mute Pressssed")
		// await ev.action.setImage
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify("ToggleMute"));
		} else {
			console.error('WebSocke for mute is not open. Cannot send message.');
		}

		console.log("mutevalue BOOL: ", muteValue)

		if (!muteValue) {
			muteTitle = "Muted"
		} else if (muteValue) {
			muteTitle = "unmuted"
		}

		await ev.action.setTitle(muteTitle);





	}

	async onDidReceiveSettings(ev: DidReceiveSettingsEvent<object>): Promise<void> {
		console.log("Received settings", ev.payload.settings);
		camIp = ev.payload.settings.camillaIP;
		camPort = ev.payload.settings.camillaPORT;
		console.log("Camilla IP: " + camIp);
		console.log("Cammila port: " + camPort)


		if (camIp && camPort) {
			try {
				await connectSocket(camIp, camPort);

			} catch (error) {
				console.error("Failed to connect socket:", error);
			}
		}

		if (!muteValue) {
			muteTitle = "Muted"
		} else if (muteValue) {
			muteTitle = "unmuted"
		}

		await ev.action.setTitle(muteTitle);

	}

}