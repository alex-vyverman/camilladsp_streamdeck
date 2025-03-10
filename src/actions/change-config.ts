import { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent, Action} from "@elgato/streamdeck";
import streamDeck, { LogLevel } from "@elgato/streamdeck";


import path from 'path';

streamDeck.logger.setLevel(LogLevel.TRACE);



@action({ UUID: "com.alexander-vyverman.sdcamilladsp.change-config" })
export class ChangeConfig extends SingletonAction<ChangeConfigSettings> {
    override onWillAppear(ev: WillAppearEvent<ChangeConfigSettings>): void | Promise<void> {
        streamDeck.logger.info("onWillAppear")
        const { settings } = ev.payload;
        const filename = path.basename(settings.yamlpath, path.extname(settings.yamlpath))
        ev.action.setTitle(filename);
        // console.log(ev.action.getSettings().then((settings) => {
        //     const filename = path.basename(settings.yamlpath, path.extname(settings.yamlpath))
        //     console.log("filename: ", filename)
        //     ev.action.setTitle(filename);

        // }));
        // return ev.action.setTitle(`Change Config`);
    }


    // override async onSendToPlugin(ev: SendToPluginEvent<any, ChangeConfigSettings>): Promise<void> {
    //     const { action, payload } = ev;
    //     streamDeck.logger.info(`Received sendToPlugin: ${action}, ${JSON.stringify(payload)}`);
    //     if (payload.event = "browse_folder") {
    //         const { canceled, filePaths } = await dialog.showOpenDialog({
    //             properties: ['openDirectory']
    //         });

    //         if (canceled) {
    //             streamDeck.logger.info("User canceled the folder selection");
    //         } else {
    //             const selectedPath = filePaths[0];
    //             streamDeck.logger.info(`Selected folder: ${selectedPath}`);
    //             // You can now use the selectedPath as needed
    //         }
    //     }

    // }

    
    

    override async onKeyDown(ev: KeyDownEvent<ChangeConfigSettings>): Promise<void> {
        // Update the count from the settings.
        const { settings } = ev.payload;
        streamDeck.logger.info("settings: ", settings.yamlpath)
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