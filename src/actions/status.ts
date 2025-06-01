import { action, DidReceiveSettingsEvent, DidReceiveGlobalSettingsEvent, JsonObject, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { LogLevel } from "@elgato/streamdeck";
import WebSocket from 'ws';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

let statusTitle: string = 'Status';
let configJson: JsonObject = {};
let evAction: WillAppearEvent<JsonObject> | null = null;


// Global variables for camilla connection
let camIp: string | null = null;
let camPort: number | null = null;

// Interfaces for global settings and websocket response
interface GlobalSettings {
    camillaIP?: string;
    camillaPort?: string;
    [key: string]: any;
}

interface WebSocketResponse {
    success: boolean;
    data?: any;
    error?: string;
}

// Function to send websocket messages
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

// Handle global settings updates to get IP and Port
async function handleGlobalSettings(settings: GlobalSettings) {
    streamDeck.logger.info('Received global settings:', JSON.stringify(settings, null, 2));

    if (settings.camillaIP) {
        camIp = settings.camillaIP;
        streamDeck.logger.info(`Camilla IP: ${camIp}`);
    } else {
        streamDeck.logger.warn('Missing Camilla IP configuration');
    }
    
    if (settings.camillaPort) {
        camPort = parseInt(settings.camillaPort);
        streamDeck.logger.info(`Camilla Port: ${camPort}`);
    } else {
        streamDeck.logger.warn('Missing Camilla Port configuration');
    }
}

// Initial settings load
streamDeck.settings.getGlobalSettings()
    .then(handleGlobalSettings)
    .catch((error) => {
        streamDeck.logger.error('Failed to get global settings:', error);
    });

// Settings change handler
streamDeck.settings.onDidReceiveGlobalSettings((ev: DidReceiveGlobalSettingsEvent<GlobalSettings>) => {
    streamDeck.logger.info('STATUS ACTION: Received  settings update event');
    // Store the interval ID in a module-level variable
    let statusCheckInterval: NodeJS.Timeout | null = null;

    handleGlobalSettings(ev.settings)
        .then(() => {
            // Only start the interval if it's not already running and we have valid connection details
            if (!statusCheckInterval && camIp && camPort) {
                statusCheckInterval = setInterval(async () => {
                    const response = await sendWebSocketMessage(camIp!, camPort!, JSON.stringify("GetConfigJson"));
                    if (response.success) {
                        // streamDeck.logger.info('WebSocket Status response:', response.data.GetConfigJson.value
                        // );
                        configJson = JSON.parse(response.data.GetConfigJson.value);
                        // streamDeck.logger.info('Config JSON:', configJson.devices.samplerate);
                        if (typeof configJson === 'object' && configJson?.devices && typeof configJson.devices === 'object' && 'chunksize' in configJson.devices) {
                            evAction?.action.setTitle("Chunksize:\n"+ String(configJson.devices.chunksize));
                        }
                
                    } 
                    // Update all instances of this action
                    // streamDeck.actions.getAll().forEach(action => {
                    //     action.setTitle(statusTitle);
                    // });
                }, 500);
            }
        })
        .catch((error) => {
            streamDeck.logger.error('Failed to handle global settings update:', error);
        });
});


@action({ UUID: "com.alexander-vyverman.sdcamilladsp.status" })
export class Status extends SingletonAction {
    

    override onWillAppear(ev: WillAppearEvent<JsonObject>): void | Promise<void> {
        const { settings } = ev.payload;
        streamDeck.logger.info('local onWillAppear Status Action settings:', settings);
        // ev.action.setTitle(statusTitle);
        evAction = ev


    }


    override onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> | void {
        const { settings } = ev.payload;
        // streamDeck.logger.info('local keydown status settings:', settings);



        return Promise.resolve();
    }

}