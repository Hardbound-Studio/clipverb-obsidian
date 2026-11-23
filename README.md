# Clipverb: Video to Notes

Send a video link from Obsidian to the Clipverb desktop app. The app files the video's own captions as a Markdown note in your vault, or a summary made with your own AI key.

This plugin is free. It needs the Clipverb desktop app, a paid app with a 30-day trial, running on the same computer. Get it at [clipverb.app](https://clipverb.app).

## Set up

1. Install Clipverb and open it.
2. In Clipverb, open the Browser fetcher tab and press Copy pairing code.
3. In Obsidian, open Settings and find Clipverb under Community plugins. Paste the code into Pairing code and press Check. The line under it reads "Connected to Clipverb."
4. Choose a mode. Captions only needs no key and no model. Captions + distill uses the provider and model chosen on the app's Captions + distill tab.

## Use

1. Run "Send a video link" from the command palette, or press the clapperboard icon in the ribbon, and paste the link.
2. In a note, put the cursor in a link or select it, then run "Send the link under the cursor or selected".

Clipverb files the note in the vault folder chosen in the app. The app can stay in the system tray while it works.

If the app cannot take a link, the plugin says why and how to fix it. The app may be closed, the pairing code may have changed, or the trial may be over, and a purchase keeps Clipverb filing. Captions + distill also needs a model and your consent in the app.

## Disclosures

1. Payment: the plugin is free. The Clipverb desktop app it sends links to is a paid purchase with a 30-day trial.
2. Network: the plugin connects only to 127.0.0.1, this computer, on ports 47800 to 47809, to reach the Clipverb app. The plugin itself sends nothing to the internet and collects no usage data. The app fetches the captions. In Captions + distill the app sends them to the AI provider you chose, with your own key, or to a model that runs on your computer.
3. Files: the plugin writes no files of its own. Its settings, including the pairing code, stay in the plugin's data.json in this vault. The app writes each note into the vault folder you chose in the app.
4. Desktop only: the plugin works on Obsidian for desktop, beside the Clipverb app.

## Languages

English, Arabic, Spanish and French, following Obsidian's language setting.

## Licence

MIT. Copyright 2026 Hardbound Studio.
