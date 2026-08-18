# VAULT Chrome Extension

A Chrome extension that syncs your [VAULT](https://vault.sizo.dev) services and automatically fills passwords on matching websites

## Features

- **Synchronization**: Syncs your services from VAULT
- **Fill Passwords**: Fills password fields on websites
- **Multi-account Management**: Switch between different VAULT accounts
- **Intuitive Interface**: Easy-to-use popup panel

## Requirements

- Google Chrome version 88 or higher
- Access to [VAULT](https://vault.sizo.dev) or a local instance

## Installation

### Step 1: Download the Extension

Download the extension [source code](https://github.com/sizoLabs/vault-chrome-extension/releases/latest)

### Step 2: Copy the Folder

Copy the `vault-chrome-extension` folder to your desired location on your computer. For example:
```
~/Extensions/vault-chrome-extension
```

### Step 3: Access Chrome Extensions

1. Open Google Chrome
2. Go to the URL: `chrome://extensions/`
3. Or use the menu: ⋮ → **More tools** → **Extensions**

### Step 4: Enable Developer Mode

In the top-right corner of the extensions page, toggle **"Developer mode"**

### Step 5: Load the Extension

1. Click the **"Load unpacked"** button
2. Select the `vault-chrome-extension` folder from the location where you copied it
3. Done! The extension will appear in your extensions list

## How to Use

### First Time

1. Sync your account from [vault.sizo.dev](https://vault.sizo.dev) or your local VAULT instance
2. Click the VAULT icon in the Chrome toolbar
3. The extension panel will open
4. Select your VAULT account
5. Enter your master password
6. You'll see all the services in your account

### Filling Passwords

1. Navigate to a website with password fields
2. Click the VAULT icon and access your account
3. The extension will automatically detect if you have a matching service
4. Click the service and it will fill the password field. You can also click "Copy" to copy the password.

## Security

- The extension does not store any passwords
- The extension only accesses data from the services stored in your VAULT

## Troubleshooting

### Extension Does Not Appear in Chrome

- Make sure "Developer mode" is enabled
- Verify that you selected the correct folder

### Synchronization Errors

- Reload the extension from `chrome://extensions/`
- Try syncing your account again from [vault.sizo.dev](https://vault.sizo.dev) or your local instance

## Support

For more information about VAULT, visit [vault.sizo.dev](https://vault.sizo.dev)

## License

See the LICENSE file in the repository.
