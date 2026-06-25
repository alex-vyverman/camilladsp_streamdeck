# CamillaDSP Stream Deck Plugin

Control a [CamillaDSP](https://github.com/HEnquist/camilladsp) instance from an Elgato Stream Deck. This plugin connects to CamillaDSP over its WebSocket API and exposes quick actions for switching configuration files, adjusting the main volume, and showing basic runtime status.

## Features

- **Change configuration** from a Stream Deck key by selecting a YAML file and sending it to CamillaDSP as JSON.
- **Adjust main volume** from a key or encoder.
- **Show status information** from the current CamillaDSP configuration.
- **Reuse shared connection settings** across actions through global plugin settings.

## Requirements

### Runtime

- Elgato Stream Deck software **6.4 or newer**
- A supported host OS:
  - macOS 12+
  - Windows 10+
- A running CamillaDSP instance with its **WebSocket server enabled**

### Development

- Node.js **20**
- npm

## Repository layout

- `/home/runner/work/camilladsp_streamdeck/camilladsp_streamdeck/src/plugin.ts` registers the Stream Deck actions.
- `/home/runner/work/camilladsp_streamdeck/camilladsp_streamdeck/src/actions/change-config.ts` sends YAML-based configuration changes to CamillaDSP.
- `/home/runner/work/camilladsp_streamdeck/camilladsp_streamdeck/src/actions/volume.ts` handles volume control for keypad and encoder actions.
- `/home/runner/work/camilladsp_streamdeck/camilladsp_streamdeck/src/actions/status.ts` polls CamillaDSP and updates the action title with status data.
- `/home/runner/work/camilladsp_streamdeck/camilladsp_streamdeck/com.alexander-vyverman.sdcamilladsp.sdPlugin/` contains the Stream Deck plugin manifest, assets, and property inspector UI.
- `/home/runner/work/camilladsp_streamdeck/camilladsp_streamdeck/com.alexander-vyverman.sdcamilladsp.streamDeckPlugin` is the packaged plugin artifact currently committed in the repository.

## Installation

### Install the packaged plugin

If you only want to use the plugin:

1. Locate `/home/runner/work/camilladsp_streamdeck/camilladsp_streamdeck/com.alexander-vyverman.sdcamilladsp.streamDeckPlugin`.
2. Double-click the file, or open it with Stream Deck software.
3. Confirm the installation when Stream Deck prompts you.

### Install from source

1. Clone the repository.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Build the plugin bundle:

   ```bash
   npm run build
   ```

4. Load or package the contents of `com.alexander-vyverman.sdcamilladsp.sdPlugin` using your normal Stream Deck developer workflow.

## Configuration

All actions use the same CamillaDSP connection details stored as global settings.

1. Add any action from the **sdcamilladsp** category to your Stream Deck.
2. In the property inspector, enter:
   - **CamillaDSP IP Address**
   - **CamillaDSP Port**
3. Click **Test** / **test & save**.
4. When the connection succeeds, the plugin stores the settings for the other actions.

The property inspector defaults to `localhost` and port `1234` if you leave the fields empty while testing.

## Actions

### Change configuration

The **Change configuration** action lets you assign a CamillaDSP YAML file to a key.

How it works:

1. Configure the global CamillaDSP connection settings.
2. Select a YAML file in the **CamillaDSP Yaml config file** field.
3. The key title updates to the selected file name.
4. Press the key to:
   - read the YAML file from disk
   - parse it
   - convert it to JSON
   - send it to CamillaDSP using `SetConfigJson`

Use this action to switch full DSP presets directly from the Stream Deck.

### Main Volume Encoder

The **Main Volume Encoder** action supports both keypad and encoder controllers.

#### On a keypad

- Choose whether the key should represent **UP** or **DOWN**
- Choose the step size in dB
- Pressing the key sends `AdjustVolume`
- The key briefly shows the resulting volume value, then returns to `+` or `-`

#### On an encoder

- Rotating the encoder adjusts volume using the dial tick count
- Pressing the encoder toggles a simple **DIM** mode by subtracting or restoring 20 dB
- Feedback is shown on the encoder display with a value and indicator

### Status information

The **Status information** action monitors CamillaDSP and currently displays the configured `devices.chunksize` value from `GetConfigJson`.

Behavior:

- it starts polling after valid global settings are received
- it refreshes roughly every 500 ms
- it updates the key title with the current chunksize

## Development

Install dependencies once:

```bash
npm ci
```

Available scripts:

```bash
npm run build
npm run watch
```

### What the scripts do

- `npm run build` bundles `src/plugin.ts` into `com.alexander-vyverman.sdcamilladsp.sdPlugin/bin/plugin.js`
- `npm run watch` rebuilds on change and asks Stream Deck to restart the plugin

## Implementation notes

- The plugin uses the Stream Deck SDK from `@elgato/streamdeck`.
- CamillaDSP communication uses plain WebSocket connections in the form `ws://<ip>:<port>`.
- The property inspector UI is implemented with `sdpi-components`.
- The plugin logs at `TRACE` level, which is useful during development but verbose during debugging.

## Troubleshooting

### The test button fails

Check that:

- CamillaDSP is running
- the WebSocket interface is enabled
- the IP address and port are correct
- local firewall rules are not blocking the connection

### A configuration file does not load

Check that:

- the selected YAML file still exists
- Stream Deck has permission to read the file
- the YAML syntax is valid
- CamillaDSP accepts the generated configuration

### Volume or status actions do nothing

Check that:

- global settings were saved successfully from any property inspector
- CamillaDSP is still reachable at the saved address
- the Stream Deck action is using the expected controller type

## Current limitations

- Connection settings are shared globally rather than per action.
- The plugin currently targets unsecured WebSocket connections only.
- The status action is focused on a single value (`devices.chunksize`) rather than a broader health summary.

## License

No license file is currently included in this repository. Add one if you plan to distribute the source publicly under specific terms.
