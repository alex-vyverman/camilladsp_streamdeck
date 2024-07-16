import WebSocket from 'ws';

let ws: any = null;
let muteValue: boolean;
let volValue: any = null;

export function connectSocket(camIp: string, camPort: number): any {
	ws = new WebSocket(`ws://${camIp}:${camPort}`);

	ws.onopen = function open() {
		console.log('Connected to WebSocket');
		ws.send(JSON.stringify("GetMute"));
		ws.send(JSON.stringify("GetVolume"))
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
		} else if (data.AdjustVolume) {
			volValue = data.AdjustVolume.value;
			volValue = Math.round(volValue)
			console.log(volValue);
		} else if (data.GetVolume) {
			volValue = data.GetVolume.value;
			volValue = Math.round(volValue)
			console.log(volValue);
		} else {
			console.log('Unknown message type:', data);
		}
	};

	return ws;
}

export async function getWebSocket() {
	return ws;
}

export async function getMuteValue() {
	return muteValue;
}

export async function GetVolumeValue() {
	return volValue;
}
