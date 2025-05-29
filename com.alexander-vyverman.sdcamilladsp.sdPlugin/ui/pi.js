const { streamDeckClient } = SDPIComponents;


let localSettings = {}
let controllerType = ''

const version = '"GetVersion"'
streamDeckClient.getSettings().then((settings) => { 
    console.log("settings: ", settings)
    localSettings = settings;
    controllerType = settings.controller || 'default';
    console.log("controllerType: ", controllerType)
    console.log("localSettings: ", localSettings)
    
    // Update visibility based on controller type
    updateControllerVisibility();
});
streamDeckClient.getGlobalSettings().then((globalSettings) => { console.log("globalSettings: ", globalSettings) });
streamDeckClient.getConnectionInfo().then((info) => { console.log("info: ", info) });

streamDeckClient.didReceiveGlobalSettings.subscribe(console.log)


let validatedstate = false;
let savedstate = false;



streamDeckClient.didReceiveGlobalSettings.subscribe((globalSettings) => {
    console.log('Global settings received:', globalSettings);
    if (globalSettings.payload.settings.camillaIP && globalSettings.payload.settings.camillaPort) {
        document.getElementById('camillaip').value = globalSettings.payload.settings.camillaIP;
        document.getElementById('camillaport').value = globalSettings.payload.settings.camillaPort;
        savedstate = true;
        // Only test if not already validated
        if (!validatedstate) {
            test(version);
        } else {
            handlestate();
        }
    } else {
        console.warn('Global settings do not contain camillaIP or camillaPort');
    }
}
);

function handlestate() {
    if (validatedstate && savedstate) {
        console.log('validatedstate and savedstate are true');
        document.getElementById('configbutton').textContent = "edit settings";
        document.getElementById('camillaip').disabled = true;
        document.getElementById('camillaport').disabled = true;
    } else {
        console.log(`validatedstate is ${validatedstate} and savedstate is ${savedstate}`);
        document.getElementById('versionInfo').innerHTML = '';
        document.getElementById('configbutton').textContent = "test & save";
        document.getElementById('camillaip').disabled = false;
        document.getElementById('camillaport').disabled = false;
    }

}

function handlebutton() {
    if (validatedstate && savedstate) {
        document.getElementById('camillaip').disabled = false;
        document.getElementById('camillaport').disabled = false;
        validatedstate = false;
        savedstate = false;
        handlestate();
    } else if (!validatedstate && savedstate) {
        test(version);
    } else if (validatedstate && !savedstate) {
        saveGlobSettings();
    } else {
        test(version);
    }
}


function test(data) {
    const ipAddress = document.getElementById('camillaip').value || 'localhost';
    const port = document.getElementById('camillaport').value || '1234';

    if (ipAddress === '' || port === '') {
        alert('IP adress and port must be provided.');
        console.error('IP adress and port must be provided');
    } else {
        console.log('Hostname:', ipAddress);
        console.log('Port:', port);
        console.log('Data:', data);

        const websocket = new WebSocket(`ws://${ipAddress}:${port}`);

        const timeout = setTimeout(() => {
            console.error('WebSocket connection timed out.');
            websocket.close();
            alert('WebSocket connection timed out.');
        }, 3000);

        websocket.onopen = function (event) {
            clearTimeout(timeout);
            console.log('WebSocket is open now.');
            websocket.send(data);
            console.log('Data sent:', data);
        };

        websocket.onmessage = function (event) {
            console.log('WebSocket message received:', event.data);
            var response = JSON.parse(event.data);
            const camillaVersion = response.GetVersion.value;
            if (response.GetVersion.result === "Ok") {
                document.getElementById('versionInfo').innerHTML = 'CamillaDSP Version: ' + camillaVersion + ' is running on ' + ipAddress + ':' + port;
                validatedstate = true;
                saveGlobSettings()
                handlestate();


            } else {
                alert('Error: ' + response.GetVersion);
            }

            websocket.close();
        };

        websocket.onclose = function (event) {
            console.log('WebSocket is closed now.');
        };

        websocket.onerror = function (event) {
            console.error('WebSocket error observed:', event);
            alert('WebSocket error observed. Check the console for more details.');
        };
    }


}



function saveGlobSettings() {
    console.log('saving Global Settings');
    const ipAddress = document.getElementById('camillaip').value || 'localhost';
    const port = document.getElementById('camillaport').value || '1234';

    // Create settings object
    const globalSettings = {
        camillaIP: ipAddress,
        camillaPort: port
    };


    streamDeckClient.setGlobalSettings(globalSettings)
        .then(() => {
        })
        .catch(err => {
            console.error('Failed to save settings:', err);
        });

    savedstate = true;
    handlestate();

}

// Function to update volume step display
function updateVolumeStepDisplay() {
    const volumeStepElement = document.getElementById('volumeStep');
    const volumeStepValueElement = document.getElementById('volumeStepValue');
    
    if (volumeStepElement && volumeStepValueElement) {
        // Try different ways to get the current value
        let currentValue = volumeStepElement.value || 
                          volumeStepElement.getAttribute('value') || 
                          volumeStepElement.sdValue || 
                          '0';
        volumeStepValueElement.textContent = `${currentValue} dB`;
    }
}

let volumeStepInterval;

// Initialize volume step display when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Update controller visibility
    updateControllerVisibility();
    
    // Use a timeout to ensure SDPI components are fully loaded
    setTimeout(() => {
        const volumeStepElement = document.getElementById('volumeStep');
        
        if (volumeStepElement) {
            // Set initial value
            updateVolumeStepDisplay();
            
            // Poll for changes every 100ms as a fallback
            if (volumeStepInterval) {
                clearInterval(volumeStepInterval);
            }
            volumeStepInterval = setInterval(updateVolumeStepDisplay, 100);
            
            // Try to listen for SDPI-specific events
            volumeStepElement.addEventListener('sdpi-item-change', updateVolumeStepDisplay);
            volumeStepElement.addEventListener('sdpi-change', updateVolumeStepDisplay);
            
            // Standard events
            volumeStepElement.addEventListener('input', updateVolumeStepDisplay);
            volumeStepElement.addEventListener('change', updateVolumeStepDisplay);
            
            // Use MutationObserver to watch for any attribute changes
            const observer = new MutationObserver(() => {
                updateVolumeStepDisplay();
            });
            observer.observe(volumeStepElement, { 
                attributes: true, 
                childList: true,
                subtree: true
            });
        }
    }, 500);
});

// Function to show/hide keypad-specific controls
function updateControllerVisibility() {
    const volumeUpDown = document.getElementById('volumeUpDown');
    const volumeStepContainer = document.getElementById('volumeStepContainer');
    
    if (volumeUpDown && volumeStepContainer) {
        if (controllerType === 'Keypad') {
            volumeUpDown.style.display = '';
            volumeStepContainer.style.display = '';
        } else {
            volumeUpDown.style.display = 'none';
            volumeStepContainer.style.display = 'none';
        }
    }
}