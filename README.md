# CamillaDSP Stream Deck Plugin

A Stream Deck plugin for controlling [CamillaDSP](https://github.com/HEnquist/camilladsp), a flexible digital signal processor for audio applications.

## Features

### 🔧 Configuration Management
- **Change Configuration**: Switch between different CamillaDSP YAML configurations with a single button press
- **Visual Feedback**: Button displays the configuration filename for easy identification

### 🔊 Volume Control
- **Rotary Encoder Support**: Use Stream Deck's rotary encoder for precise volume adjustment
- **Real-time Feedback**: Visual indicator shows current volume level
- **Dim Function**: Press the encoder to toggle a -20dB dim function
- **Safe Limits**: Volume clamped between -80dB and 0dB

## Requirements

- **Stream Deck Software**: Version 6.4 or higher
- **Operating System**: 
  - macOS 12 or higher
  - Windows 10 or higher
- **CamillaDSP**: Running instance with WebSocket API enabled (On the same, or on a remote system)

## Installation

### From Stream Deck Store
*(Coming soon)*

### Manual Installation
1. Download the latest release from the [Releases](../../releases) page
2. Double-click the `.streamDeckPlugin` file to install
3. The plugin will appear in your Stream Deck software

## Setup

### 1. Configure CamillaDSP Connection
1. Make sure CamillaDSP is compiled, and running with the websocket server enabled and reachable. 
For example: 
`camilladsp --address 127.0.0.1 --port 1234` for a local host
or `camilladsp --address 0.0.0.0 --port 1234` for a remote host
2. Open Stream Deck software
3. Go to plugin settings (global settings)
4. Enter your CamillaDSP details:
   - **IP Address**: The IP where CamillaDSP is running (e.g., `localhost` or `192.168.1.100`)
   - **Port**: The WebSocket port (default: `1234`)
   - Press the 'test' button. If a connection is established, you will see the info on the version and ip adress where CamillaDSP is running.
  

### 2. Add Actions to Your Stream Deck

#### Change Configuration Action
1. Drag the "Change configuration" action to a button
2. In the property inspector, set the **YAML Path** to your configuration file
3. The button will display the filename and switch to that config when pressed

  Note: 
  The YAML configuration file is sent from the system running the StreamDeck plugin to CamillaDSP and applied directly.
  This is particularly important to note if you’re running CamillaDSP with its GUI on a separate system from the one hosting the StreamDeck software.
  
  In such cases, changes made to the configuration file on the remote system (where CamillaDSP is running) will not be reflected automatically, since the StreamDeck plugin does not have access to that file.
  Therefore, whenever you update the configuration on the remote system, you’ll need to manually transfer the updated YAML file to the local system running the StreamDeck plugin.
  
  As long as the path and filename remain unchanged on the local system, no adjustments to the plugin settings are necessary after each update.

#### Volume Control Action
1. Drag the "Main Volume Encoder" action to a rotary encoder
2. No additional configuration required
3. Rotate to adjust volume, press to toggle dim

## Usage

### Configuration Switching
- Press any configured button to instantly switch CamillaDSP to that configuration
- Perfect for switching between different audio profiles (music, movies, gaming, etc.), headphones and different sets of speakers

### Volume Control
- **Rotate**: Adjust main volume in 1dB increments
- **Press**: Toggle 20dB dim function
- **Visual Feedback**: Real-time volume level display with progress indicator

## Development

### Prerequisites
```bash
npm install
```

### Building
```bash
npm run build
```

### Development with Auto-reload
```bash
npm run watch
```

This will automatically rebuild and restart the plugin when source files change.

### Project Structure
```
src/
├── plugin.ts              # Main plugin entry point
└── actions/
    ├── change-config.ts    # Configuration switching action
    └── volume.ts          # Volume control action

com.alexander-vyverman.sdcamilladsp.sdPlugin/
├── manifest.json          # Plugin metadata
├── bin/                   # Compiled JavaScript
├── imgs/                  # Icons and assets
└── ui/                    # Property inspector HTML
```

## Configuration File Format

The plugin works with standard CamillaDSP YAML configuration files. Example:

```yaml
devices:
  samplerate: 44100
  chunksize: 1024
  capture:
    type: Alsa
    channels: 2
    device: "hw:1,0"
  playback:
    type: Alsa
    channels: 2
    device: "hw:0,0"

mixers:
  - name: volume
    type: Volume
    parameters:
      ramp_time: 200.0

filters: []

pipeline:
  - type: Mixer
    name: volume
```

## API Communication

The plugin communicates with CamillaDSP via WebSocket using these commands:

- `SetConfigJson`: Load a new configuration
- `GetVolume`: Retrieve current volume level
- `AdjustVolume`: Change volume by relative amount
- `SetVolume`: Set absolute volume level

## Troubleshooting

### Plugin Not Connecting
1. Verify CamillaDSP is running with WebSocket enabled
2. Check IP address and port in global settings
3. Ensure firewall allows connections on the specified port

### Configuration Not Loading
1. Verify YAML file path is correct and accessible
2. Check YAML syntax is valid
3. Review Stream Deck logs for error details

### Volume Control Not Working
1. Ensure CamillaDSP has a volume mixer configured
2. Check WebSocket connection status
3. Verify encoder is properly assigned to the action

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [CamillaDSP](https://github.com/HEnquist/camilladsp) - The audio DSP engine this plugin controls
- [Elgato Stream Deck SDK](https://docs.elgato.com/sdk/) - For the plugin development framework
- Stream Deck community for inspiration and feedback
- icons by https://icons8.com

## Support

- **Issues**: Report bugs and feature requests in the [Issues](../../issues) section
- **Discussions**: Join the conversation in [Discussions](../../discussions)
- **CamillaDSP Help**: Visit the [CamillaDSP documentation](https://henquist.github.io/camilladsp/index.html)
