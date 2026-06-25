import { action, KeyDownEvent, SingletonAction, DialRotateEvent, DidReceiveSettingsEvent, DialDownEvent, DidReceiveGlobalSettingsEvent, WillAppearEvent, JsonObject } from "@elgato/streamdeck";
import streamDeck from '@elgato/streamdeck';
import WebSocket from 'ws';


// / <reference path="@elgato/streamdeck" />

// let defVal = 50;
// let reconnectInterval = 5000;
let camIp: string | null = null;
let camPort: number | null = null;
let incrdB = 1; // dB change per tick
let volValue: number | null = null;
let dimOn: boolean = false;
let camSocketOpen: boolean = false;
let globSettings: GlobalSettings = {};

interface GlobalSettings {
	camillaIP?: string;
	camillaPort?: string;
	camSocketOpen?: boolean;
	[key: string]: any;
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
		streamDeck.logger.info(`Camilla IP: ${camIp}`);
	} else {
		streamDeck.logger.warn('Missing Camilla IP configuration');
	}
    if (settings.camillaPort)  {
		camPort = parseInt(settings.camillaPort);
		streamDeck.logger.info(`Camilla Port: ${camPort}`);
	} else {
		streamDeck.logger.warn('Missing Camilla Port configuration');
	}
    
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
			
				if ('GetVolume' in response.data && response.data.GetVolume?.value !== undefined) {
					const previousVolume = volValue;
					volValue = Math.round(response.data.GetVolume.value);
					streamDeck.logger.info(`Volume updated: ${previousVolume} -> ${volValue}`);
				} else {
					streamDeck.logger.warn('Invalid GetVolume response structure:', JSON.stringify(response.data, null, 2));
					throw new Error('Invalid response structure from CamillaDSP');
				}
			} else {
				streamDeck.logger.error(`Failed to get initial volume: ${response.error}`);
			}
        } catch (error) {
            streamDeck.logger.error('Failed to initialize connection:', error instanceof Error ? error.message : String(error));
        }
    } else {
        streamDeck.logger.warn('Missing IP or Port configuration:', JSON.stringify({ camIp, camPort }));
    }
}

// Initial settings load
streamDeck.logger.info('Loading initial global settings...');
streamDeck.settings.getGlobalSettings()
    .then(handleGlobalSettings)
    .catch((error) => {
        streamDeck.logger.error('Failed to get global settings:', error instanceof Error ? error.message : String(error));
    });

// Settings change handler
streamDeck.settings.onDidReceiveGlobalSettings((ev: DidReceiveGlobalSettingsEvent<GlobalSettings>) => {
    streamDeck.logger.info('Received settings update event');
	handleGlobalSettings(ev.settings)
        .catch((error) => {
            streamDeck.logger.error('Failed to handle global settings update:', error instanceof Error ? error.message : String(error));
        });
});

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
		if (!camIp || !camPort) {
			streamDeck.logger.error('Missing IP or Port configuration');
			return;
		}
		streamDeck.logger.info('Key down event received:', JSON.stringify(ev.payload.settings));
		let volumeNegative = (ev.payload.settings.upDown === "down");
		incrdB = ev.payload.settings.volumeStep || 1; // Default to 1 dB if not set
		streamDeck.logger.info('Volume negative:', String(volumeNegative));
		streamDeck.logger.info('Current volume value:', String(volValue));

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
			streamDeck.logger.error('Missing IP or Port configuration');
			return;
		}
		if (volValue === null) {
			streamDeck.logger.warn('Volume not yet initialized, skipping dial rotate');
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
				streamDeck.logger.error(response.error);
			}
		}
	}

	override async onDialDown(ev: DialDownEvent<Record<string, any>>) {
		if (!camIp || !camPort) return;
		if (volValue === null) {
			streamDeck.logger.warn('Volume not yet initialized, skipping dial down');
			return;
		}
		
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
			streamDeck.logger.error('Failed to set volume:', response.error);
		}
	}



}


