import WebSocket from 'ws';
import streamDeck from '@elgato/streamdeck';

export interface WebSocketResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export interface CamillaConfig {
    ip: string;
    port: string | number;
}

export class CamillaWebSocketService {
    private config: CamillaConfig | null = null;
    private isConfigured: boolean = false;

    setConfig(config: CamillaConfig): boolean {
        // Only update if configuration actually changed
        if (this.isConfigured && 
            this.config?.ip === config.ip && 
            this.config?.port === config.port) {
            return false;
        }

        this.config = config;
        this.isConfigured = true;
        streamDeck.logger.info(`WebSocket config updated - IP: ${config.ip}, Port: ${config.port}`);
        return true;
    }

    async sendMessage(message: string | object): Promise<WebSocketResponse> {
        if (!this.config) {
            return {
                success: false,
                error: 'WebSocket configuration not set'
            };
        }

        return new Promise((resolve) => {
            try {
                if (!this.config) {
                    resolve({
                        success: false,
                        error: 'WebSocket configuration not set'
                    });
                    return;
                }
                const ws = new WebSocket(`ws://${this.config.ip}:${this.config.port}`);

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
}

export const camillaWebSocket = new CamillaWebSocketService();