import { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent, Action, DidReceiveGlobalSettingsEvent} from "@elgato/streamdeck";
import streamDeck, { LogLevel } from "@elgato/streamdeck";
import WebSocket from 'ws';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

import path from 'path';

streamDeck.logger.setLevel(LogLevel.TRACE);

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
    streamDeck.logger.info('Received settings update event');
    handleGlobalSettings(ev.settings)
        .catch((error) => {
            streamDeck.logger.error('Failed to handle global settings update:', error);
        });
});


@action({ UUID: "com.alexander-vyverman.sdcamilladsp.change-config" })
export class ChangeConfig extends SingletonAction<ChangeConfigSettings> {
    override onWillAppear(ev: WillAppearEvent<ChangeConfigSettings>): void | Promise<void> {
        // streamDeck.logger.info("onWillAppear") 
        const { settings } = ev.payload;
        streamDeck.logger.info("onWillAppear triggered with yamlpath: ", settings.yamlpath);
        const filename = path.basename(settings.yamlpath, path.extname(settings.yamlpath))
        ev.action.setTitle(filename);
    }


    
    

    override async onKeyDown(ev: KeyDownEvent<ChangeConfigSettings>): Promise<void> {
        const { settings } = ev.payload;
        streamDeck.logger.info("onKeyDown triggered with yamlpath: ", settings.yamlpath);

        // Check if we have the required connection settings
        if (!camIp || !camPort) {
            streamDeck.logger.error('Missing Camilla IP or Port configuration');
            return;
        }

        // Check if yamlpath is provided
        if (!settings.yamlpath) {
            streamDeck.logger.error('No YAML path configured');
            return;
        }

        try {
            // Read the YAML file contents
            const yamlContent = fs.readFileSync(settings.yamlpath, 'utf8');
            streamDeck.logger.info(`Successfully read YAML file: ${settings.yamlpath}`);
            streamDeck.logger.debug(`YAML content length: ${yamlContent.length} characters`);
            streamDeck.logger.debug(`YAML content preview (first 200 chars): ${yamlContent.substring(0, 200)}`);

            // Parse YAML to JavaScript object
            const yamlObject = yaml.load(yamlContent);
            streamDeck.logger.info('Successfully parsed YAML to JavaScript object');
            streamDeck.logger.debug('Parsed YAML object keys:', Object.keys(yamlObject as object));

            // Convert the JavaScript object to JSON string
            const jsonString = JSON.stringify(yamlObject);
            streamDeck.logger.info(`Converted YAML to JSON string (length: ${jsonString.length} characters)`);
            streamDeck.logger.debug(`JSON string preview (first 200 chars): ${jsonString.substring(0, 200)}`);

            // Prepare the message with SetConfigJson key and JSON content as string value
            const message = {
                "SetConfigJson": jsonString
            };

            streamDeck.logger.info(`Sending SetConfigJson message to ${camIp}:${camPort}`);
            streamDeck.logger.info(`Complete message being sent over WebSocket:`);
            streamDeck.logger.info(JSON.stringify(message, null, 2));
            streamDeck.logger.debug(`Raw message string length: ${JSON.stringify(message).length} characters`);
            streamDeck.logger.debug(`Raw message string: ${JSON.stringify(message)}`);

            // Send the message over websocket
            const response = await sendWebSocketMessage(camIp, camPort, message);

            if (response.success) {
                streamDeck.logger.info('WebSocket communication successful');
                streamDeck.logger.info('Full response:', JSON.stringify(response.data, null, 2));
                
                // Check if the response contains an error
                if (response.data && response.data.SetConfigJson) {
                    if (response.data.SetConfigJson.result === "Error") {
                        streamDeck.logger.error('CamillaDSP returned an error result for SetConfigJson');
                        streamDeck.logger.error('SetConfigJson response:', JSON.stringify(response.data.SetConfigJson, null, 2));
                        
                        // Look for additional error information
                        if (response.data.SetConfigJson.message) {
                            streamDeck.logger.error('Error message:', response.data.SetConfigJson.message);
                        }
                        if (response.data.SetConfigJson.details) {
                            streamDeck.logger.error('Error details:', response.data.SetConfigJson.details);
                        }
                    } else {
                        streamDeck.logger.info('CamillaDSP accepted the JSON configuration successfully');
                        streamDeck.logger.info('SetConfigJson result:', response.data.SetConfigJson.result);
                    }
                } else {
                    streamDeck.logger.warn('Unexpected response structure - no SetConfigJson field found');
                    streamDeck.logger.warn('Response keys:', Object.keys(response.data || {}));
                }
            } else {
                streamDeck.logger.error('WebSocket communication failed:', response.error);
            }

        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('ENOENT')) {
                    streamDeck.logger.error(`YAML file not found: ${settings.yamlpath}`);
                } else if (error.message.includes('EACCES')) {
                    streamDeck.logger.error(`Permission denied reading file: ${settings.yamlpath}`);
                } else if (error.message.includes('YAMLException')) {
                    streamDeck.logger.error(`YAML parsing error: ${error.message}`);
                    streamDeck.logger.error('Please check the YAML file syntax');
                } else {
                    streamDeck.logger.error(`Error processing YAML file: ${error.message}`);
                    streamDeck.logger.error(`Error stack: ${error.stack}`);
                }
            } else {
                streamDeck.logger.error('Unknown error occurred while processing YAML file:', error);
            }
        }
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ChangeConfigSettings>): Promise<void> {
        // Update the count from the settings.
        const { settings } = ev.payload;
        const filename = path.basename(settings.yamlpath, path.extname(settings.yamlpath))
        ev.action.setTitle(filename);
        streamDeck.logger.info("these are the current settings for the change config action: ", settings.yamlpath)
    }
}



type ChangeConfigSettings = {
    yamlpath: string;

};