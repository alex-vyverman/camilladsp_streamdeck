import { action, KeyDownEvent, SingletonAction, DialRotateEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import streamDeck from '@elgato/streamdeck';
import WebSocket from 'ws';

// / <reference path="@elgato/streamdeck" />

let defVal = 50;
let reconnectInterval = 5000;
let camIp: any = null;
let camPort: any = null;
const incrdB = 1; // dB change per tick
let ws: any = null; // Declare a variable to hold the WebSocket connection
let inContext: any = null;
let volValue: any = null;



function connectSocket(camIp: string, camPort: number): any {
  ws = new WebSocket(`ws://${camIp}:${camPort}`);

  ws.onopen = function open() {
    console.log('Connected to WebSocket');
	
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

    if (data.AdjustVolume) {
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

@action({ UUID: "com.alexander-vyverman.camilladsp.volume" })
export class volume extends SingletonAction {
  async onDialRotate(ev: DialRotateEvent<object>) {
    defVal += ev.payload.ticks;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ "AdjustVolume": ev.payload.ticks  }));
    } else {
      console.error('WebSocket is not open. Cannot send message.');
    }
    if (defVal > 100) defVal = 100;
    if (defVal < 0) defVal = 0;
    ev.action.setFeedback({ "value": volValue, "indicator": { "value": ((volValue + 80) / 80) * 100, "enabled": true } });
  }

  async onKeyDown(ev: KeyDownEvent<object>) {
    await ev.action.setTitle("Hello world");
  }
  async onDidReceiveSettings(ev: DidReceiveSettingsEvent<object>): Promise<void> {
    console.log("Received settings", ev.payload.settings);
    camIp = ev.payload.settings.camillaIP;
    camPort = ev.payload.settings.camillaPORT;
    console.log("Camilla IP: " + camIp);
	console.log("Cammila port: " + camPort)

    ev.action.setFeedback({ 
        "value": volValue, 
        "indicator": { 
            "value": ((volValue + 80) / 80) * 100, 
            "enabled": true 
        } 
    });

    if (camIp && camPort) {
        try {
            await connectSocket(camIp, camPort);
			
        } catch (error) {
            console.error("Failed to connect socket:", error);
        }
    }
	
}
}


