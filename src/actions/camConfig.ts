import { action, KeyDownEvent, SingletonAction, DialRotateEvent, DidReceiveSettingsEvent, DialDownEvent, DidReceiveGlobalSettingsEvent, WillAppearEvent, SendToPluginEvent } from "@elgato/streamdeck";
import streamDeck from '@elgato/streamdeck';
import WebSocket from 'ws';
import fs from 'fs';
import yaml from 'js-yaml';





let configYml: object = {}
let ws: any = null;
let localSettings: any = null;
let configPath: any = null
let yamlJson: any = ""
let camIp: any = "192.168.0.83";
let camPort: any = "1234";




@action({ UUID: "com.alexander-vyverman.camilladsp.camconfig" })
export class camConfig extends SingletonAction { 
	async onKeyDown(ev: KeyDownEvent<object>) {
		if (configPath != null) {
			const ws = new WebSocket(`ws://${camIp}:${camPort}`);

			let payload = {
				"SetConfigJson": JSON.stringify(yamlJson)
			}

			console.log(payload)
			console.log(JSON.stringify(payload))

			ws.on('open', () => {
				ws.send(JSON.stringify(payload), (err) => {
					if (err) {
						console.error('Error sending message:', err);
					}
				});
			});

				ws.on('message', (data) => {
					console.log(`Received response: ${data}`);
					ws.close();
				});

			ws.on('error', (err) => {
				console.error('WebSocket error:', err);
			});

		}

	}
	// async onDidReceiveSettings(ev: DidReceiveSettingsEvent<object>): Promise<void> {
	// 	console.log("Received local settings", ev.payload.settings);
	// }

	async onSendToPlugin(ev: SendToPluginEvent<{ payload: { settings: { elgfilepicker: string } } }, object>): Promise<void> {
		console.log("Received data", ev.payload);
		try {
			configPath = ev.payload.payload.settings.elgfilepicker
			console.log("config path: ", configPath)

			if (configPath != null) {
				const configFile = fs.readFileSync(configPath, 'utf8');
				const yamlContent = yaml.load(configFile);
				yamlJson = yamlContent;

				console.log("yamlJson: ",yamlJson) 




			}
			
		} catch (error) {
			console.log(error)
		}

		
	}

	



}