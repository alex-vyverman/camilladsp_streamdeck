const { streamDeckClient } = SDPIComponents;



streamDeckClient.didReceiveGlobalSettings.subscribe(console.log);
streamDeckClient.sendToPropertyInspector.subscribe(console.log);


// streamDeckClient.setGlobalSettings()


function saveGlobSettings() {
	// Get values from the text fields
	console.log('saving Global Settings');
	const ipAddress = document.getElementById('camillaIP').value || 'localhost';
	const port = document.getElementById('camillaPort').value || '1234';

	// Create settings object
	const globalSettings = {
		camillaIP: ipAddress,
		camillaPort: port
	};

	// Send to Stream Deck

	streamDeckClient.setGlobalSettings(globalSettings)
		.then(() => {
			// Optional: Show success feedback
			const button = document.getElementById('saveButton');
			const originalText = button.textContent;
			button.textContent = 'Saved!';
			setTimeout(() => {
				button.textContent = originalText;
			}, 2000);
		})
		.catch(err => {
			console.error('Failed to save settings:', err);
		});

}