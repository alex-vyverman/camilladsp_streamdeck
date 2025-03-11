import { action, SingletonAction, DialRotateEvent, DialDownEvent, DidReceiveGlobalSettingsEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck from '@elgato/streamdeck';
import { camillaWebSocket, WebSocketResponse } from '../services/camillaWebSocket';





let camIp: any = null;
let camPort: any = null;
const incrdB = 1; // dB change per tick
let volValue: any = null;
let dimOn: boolean = false;


interface GlobalSettings {
	camillaIP?: string;
	camillaPort?: string;
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

async function handleVolumeResponse(response: WebSocketResponse): Promise<number | null> {
    if (!response.success || !response.data) {
        return null;
    }

    const data = response.data as VolumeResponse;
    if (data.GetVolume?.value !== undefined) {
        return Math.round(data.GetVolume.value);
    }
    if (data.AdjustVolume?.value !== undefined) {
        return Math.round(data.AdjustVolume.value);
    }
    return null;
}

async function getVolume(): Promise<number | null> {
    const response = await camillaWebSocket.sendMessage('"GetVolume"');
    return handleVolumeResponse(response);
}

async function adjustVolume(ticks: number): Promise<number | null> {
    const response = await camillaWebSocket.sendMessage({ "AdjustVolume": ticks });
    return handleVolumeResponse(response);
}

async function setVolume(value: number): Promise<number | null> {
    const response = await camillaWebSocket.sendMessage({ "SetVolume": value });
    return handleVolumeResponse(response);
}

async function handleGlobalSettings(settings: GlobalSettings) {
    streamDeck.logger.info('Received global settings:', JSON.stringify(settings, null, 2));


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
        camillaWebSocket.setConfig({ ip: camIp, port: camPort });

        try {
            streamDeck.logger.info(`Attempting to connect to WebSocket at ws://${camIp}:${camPort}`);
            const newVolume = await getVolume();

            if (newVolume !== null) {
                volValue = newVolume;
                streamDeck.logger.info(`Volume updated to ${volValue}`);
            } else {
                console.error('Failed to get initial volume');
            }
        } catch (error) {
            console.error('Failed to initialize connection:', error);
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

@action({ UUID: "com.alexander-vyverman.sdcamilladsp.volume" })
export class Volume extends SingletonAction {
	constructor() {
		super();
	}

	override async onWillAppear(ev: WillAppearEvent<Record<string, any>>): Promise<void> {

	}

	override async onDialRotate(ev: DialRotateEvent<Record<string, any>>) {
		if (!camIp || !camPort) {
			console.error('Missing IP or Port configuration');
			return;
		}

		const dialVal = volValue + ev.payload.ticks;
		if (dialVal <= 0 && dialVal >= -80) {
			const newVolume = await adjustVolume(ev.payload.ticks);
            
            if (newVolume !== null) {
                volValue = newVolume;
                ev.action.setFeedback({
                    value: volValue,
                    indicator: {
                        value: ((volValue + 80) / 80) * 100,
                        enabled: true
                    }
                });
            }
		}
	}

	override async onDialDown(ev: DialDownEvent<Record<string, any>>) {
		if (!camIp || !camPort) return;
		
		dimOn = !dimOn;
		streamDeck.logger.info("dial down pressed");
		
		const dimVol = dimOn ? volValue - 20 : volValue + 20;
		volValue = Math.min(Math.max(dimVol, -80), 100); // Clamp between -80 and 100
		
		const newVolume = await setVolume(volValue);
    
        if (newVolume !== null) {
            ev.action.setFeedback({ 
                title: dimOn ? "DIM ON" : "Volume",
                value: volValue,
                indicator: {
                    value: ((volValue + 80) / 80) * 100,
                    enabled: true
                }
            });
        }
	}
}


