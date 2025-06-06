import { action, KeyDownEvent, SingletonAction, DialRotateEvent, DidReceiveSettingsEvent, DialDownEvent, DidReceiveGlobalSettingsEvent, WillAppearEvent, JsonObject } from "@elgato/streamdeck";
import streamDeck from '@elgato/streamdeck';
import WebSocket from 'ws';


// / <reference path="@elgato/streamdeck" />

// let defVal = 50;
// let reconnectInterval = 5000;
let camIp: any = null;
let camPort: any = null;
let incrdB = 1; // dB change per tick
let ws: any = null; // Declare a variable to hold the WebSocket connection
// let inContext: any = null;
let volValue: any = null;
let dimOn: boolean = false;
let camSocketOpen: boolean = false;
let globSettings: GlobalSettings = {};
// let actionObj: object = {}

interface GlobalSettings {
	camillaIP?: string;
	camillaPORT?: string;
	camSocketOpen?: boolean;
	[key: string]: any; // Add this to allow for additional properties
}

interface VolumeResponse {
	GetVolume?: {
		value: number;
	};
	AdjustVolume?: {
		value: number;
	};
}

interface WebSocketResponse {
	success: boolean;
	data?: VolumeResponse;
	error?: string;
}


async function handleGlobalSettings(settings: GlobalSettings) {
    streamDeck.logger.info('Received global settings:', JSON.stringify(settings, null, 2));
    globSettings = settings;

    const previousIp = camIp;
    const previousPort = camPort;

    if (settings.camillaIP) {
		camIp = settings.camillaIP;
		console.info(`Camilla IP: ${camIp}`);
	} else {
		console.warn('Missing Camilla IP configuration');

	};
    if (settings.camillaPort)  {
		camPort = settings.camillaPort
		console.info(`Camilla Port: ${camPort}`);
	} else {
		console.warn('Missing Camilla Port configuration');
	};
    
    streamDeck.logger.info(`IP: ${previousIp} -> ${camIp}`);
    streamDeck.logger.info(`Port: ${previousPort} -> ${camPort}`);

    if (camIp && camPort) {
        try {
            streamDeck.logger.info(`Attempting to connect to WebSocket at ws://${camIp}:${camPort}`);
            const response = await sendWebSocketMessage(
                camIp,
                camPort,
                '"GetVolume"'
            );

            if (response.success && response.data) {
				camSocketOpen = true;
				if (globSettings.camSocketOpen !== camSocketOpen) {
					globSettings.camSocketOpen = camSocketOpen;
					streamDeck.logger.info('Successfully connected to WebSocket');
					await streamDeck.settings.setGlobalSettings(globSettings);
					streamDeck.logger.info('Updated global settings with connection status');
				}
			
				// Improved type checking and error handling
				if ('GetVolume' in response.data && response.data.GetVolume?.value !== undefined) {
					const previousVolume = volValue;
					volValue = Math.round(response.data.GetVolume.value);
					streamDeck.logger.info(`Volume updated: ${previousVolume} -> ${volValue}`);
				} else {
					console.warn('Invalid GetVolume response structure:', JSON.stringify(response.data, null, 2));
					throw new Error('Invalid response structure from CamillaDSP');
				}
			} else {
				console.error(`Failed to get initial volume: ${response.error}`);
				console.debug('Full response:', JSON.stringify(response, null, 2));
			}
        } catch (error) {
            console.error('Failed to initialize connection:', error);
            console.debug('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
        }
    } else {
        console.warn('Missing IP or Port configuration:', { camIp, camPort });
    }
}

// Initial settings load
streamDeck.logger.info('Loading initial global settings...');
streamDeck.settings.getGlobalSettings()
    .then(handleGlobalSettings)
    .catch((error) => {
        console.error('Failed to get global settings:', error);
        console.debug('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    });

// Settings change handler
streamDeck.settings.onDidReceiveGlobalSettings((ev: DidReceiveGlobalSettingsEvent<GlobalSettings>) => {
    streamDeck.logger.info('Received settings update event');
	handleGlobalSettings(ev.settings)
        .catch((error) => {
            console.error('Failed to handle global settings update:', error);
            console.debug('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
        });
});

interface WebSocketResponse {
	success: boolean;
	data?: VolumeResponse;
	error?: string;
}

async function sendWebSocketMessage(
	ip: string,
	port: number,
	message: string | object
): Promise<WebSocketResponse> {
	return new Promise((resolve) => {
		try {
			const ws = new WebSocket(`ws://${ip}:${port}`);

			const timeoutId = setTimeout(() => {
				ws.close();
				resolve({
					success: false,
					error: 'Connection timeout after 5 seconds'
				});
			}, 5000);

			ws.onopen = () => {
				const messageString = typeof message === 'string'
					? message
					: JSON.stringify(message);

				ws.send(messageString);
			};

			ws.onmessage = (event) => {
				clearTimeout(timeoutId);
				try {
					const data = JSON.parse(event.data.toString());
					resolve({
						success: true,
						data: data
					});
				} catch (e) {
					resolve({
						success: false,
						error: 'Failed to parse response data'
					});
				}
				ws.close();
			};

			ws.onerror = (error) => {
				clearTimeout(timeoutId);
				resolve({
					success: false,
					error: `WebSocket error: ${error}`
				});
				ws.close();
			};

		} catch (error) {
			resolve({
				success: false,
				error: `Failed to create WebSocket connection: ${error}`
			});
		}
	});
}



@action({ UUID: "com.alexander-vyverman.sdcamilladsp.volume" })
export class Volume extends SingletonAction {
	constructor() {
		super();
	}

	override onWillAppear(ev: WillAppearEvent<Record<string, any>>): void | Promise<void> {
		const { settings } = ev.payload;
		streamDeck.logger.info('local settings:', settings);

	}

	override async onKeyDown(ev: KeyDownEvent<Record<string, any>>){
		console.log('Key down event received:', ev.payload.settings);
		let volumeNegative = (ev.payload.settings.upDown === "down");
		incrdB = ev.payload.settings.volumeStep || 1; // Default to 1 dB if not set
		console.log('Volume negative:', volumeNegative);
		console.log('Current volume value:', volValue);

		if (volumeNegative) {
			incrdB = -Math.abs(incrdB);
		} else {
			incrdB = Math.abs(incrdB);
		}
		const response = await sendWebSocketMessage(
			camIp,
			camPort,
			{ "AdjustVolume": incrdB }
		);
		if (response.success) {
			// Handle successful response
			const data = response.data;
			if (data && data.AdjustVolume) {
				volValue = Math.round(data.AdjustVolume.value);
				// Display volume value immediately
				ev.action.setTitle(volValue.toString());
				
				// After 3 seconds, revert to showing +/- based on volumeNegative
				setTimeout(() => {
					const displaySymbol = volumeNegative ? "-" : "+";
					ev.action.setTitle(displaySymbol);
				}, 3000);
			}
		}




	}

	override async onDialRotate(ev: DialRotateEvent<Record<string, any>>) {
		if (!camIp || !camPort) {
			console.error('Missing IP or Port configuration');
			return;
		}

		const dialVal = volValue + ev.payload.ticks;
		if (dialVal <= 0 && dialVal >= -80) {
			const response = await sendWebSocketMessage(
				camIp,
				camPort,
				{ "AdjustVolume": ev.payload.ticks }
			);

			if (response.success) {
				// Handle successful response
				const data = response.data;
				if (data && data.AdjustVolume) {
					volValue = Math.round(data.AdjustVolume.value);
					ev.action.setFeedback({
						value: volValue,
						indicator: {
							value: ((volValue + 80) / 80) * 100,
							enabled: true
						}
					});
				}
			} else {
				console.error(response.error);
			}
		}
	}

	override async onDialDown(ev: DialDownEvent<Record<string, any>>) {
		if (!camIp || !camPort) return;
		
		dimOn = !dimOn;
		streamDeck.logger.info("dial down pressed");
		
		const dimVol = dimOn ? volValue - 20 : volValue + 20;
		volValue = Math.min(Math.max(dimVol, -80), 100); // Clamp between -80 and 100
		
		const response = await sendWebSocketMessage(
			camIp,
			camPort,
			{ "SetVolume": volValue }
		);
	
		if (response.success) {
			ev.action.setFeedback({ 
				title: dimOn ? "DIM ON" : "Volume",
				value: volValue,
				indicator: {
					value: ((volValue + 80) / 80) * 100,
					enabled: true
				}
			});
		} else {
			console.error('Failed to set volume:', response.error);
		}
	}



}


