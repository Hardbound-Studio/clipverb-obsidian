import { App, Editor, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import { checkPairing, linkFromEditor, sendLink, type Http, type Mode, type Outcome } from './client';
import { initLanguage, t } from './i18n';

interface ClipverbSettings {
	pairingCode: string;
	mode: Mode;
}

const DEFAULTS: ClipverbSettings = { pairingCode: '', mode: 'captions' };

/** Obsidian's requestUrl, shaped for client.ts. It is not bound by CORS. */
const http: Http = async (req) => {
	const res = await requestUrl({
		url: req.url,
		method: req.method,
		headers: req.headers,
		body: req.body,
		throw: false,
	});
	let json: unknown = null;
	try {
		json = res.text ? (JSON.parse(res.text) as unknown) : null;
	} catch {
		json = null;
	}
	return { status: res.status, json };
};

function say(outcome: Outcome): void {
	new Notice(t(`outcome.${outcome}`), outcome === 'sent' ? 4000 : 8000);
}

export default class ClipverbPlugin extends Plugin {
	settings: ClipverbSettings = { ...DEFAULTS };

	async onload(): Promise<void> {
		initLanguage();
		await this.loadSettings();

		this.addRibbonIcon('clapperboard', t('ribbon'), () => this.openPrompt());

		this.addCommand({
			id: 'send-link',
			name: t('command.prompt'),
			callback: () => this.openPrompt(),
		});

		this.addCommand({
			id: 'send-link-in-editor',
			name: t('command.editor'),
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();
				const link = linkFromEditor(editor.getSelection(), editor.getLine(cursor.line), cursor.ch);
				if (link === null) {
					say('no_link');
					return;
				}
				void this.send(link);
			},
		});

		this.addSettingTab(new ClipverbSettingTab(this.app, this));
	}

	openPrompt(): void {
		new LinkModal(this.app, (link) => void this.send(link)).open();
	}

	async send(link: string): Promise<void> {
		say(await sendLink(http, this.settings.pairingCode, link, this.settings.mode));
	}

	async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) as Partial<ClipverbSettings> | null;
		this.settings = { ...DEFAULTS, ...saved };
		if (this.settings.mode !== 'captions' && this.settings.mode !== 'distill') this.settings.mode = 'captions';
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class LinkModal extends Modal {
	constructor(
		app: App,
		private readonly onSend: (link: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('modal.title'));
		let value = '';
		const submit = () => {
			if (!value.trim()) return;
			this.close();
			this.onSend(value);
		};
		new Setting(this.contentEl)
			.addText((text) => {
				text.setPlaceholder(t('modal.placeholder')).onChange((v) => (value = v));
				text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						submit();
					}
				});
				window.setTimeout(() => text.inputEl.focus(), 0);
			})
			.addButton((b) => b.setButtonText(t('modal.send')).setCta().onClick(submit));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

class ClipverbSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: ClipverbPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('p', { text: t('settings.about'), cls: 'setting-item-description' });

		new Setting(containerEl)
			.setName(t('settings.code.name'))
			.setDesc(t('settings.code.desc'))
			.addText((text) =>
				text.setValue(this.plugin.settings.pairingCode).onChange(async (v) => {
					this.plugin.settings.pairingCode = v.trim();
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(t('settings.mode.name'))
			.setDesc(t('settings.mode.desc'))
			.addDropdown((d) =>
				d
					.addOption('captions', t('settings.mode.captions'))
					.addOption('distill', t('settings.mode.distill'))
					.setValue(this.plugin.settings.mode)
					.onChange(async (v) => {
						this.plugin.settings.mode = v === 'distill' ? 'distill' : 'captions';
						await this.plugin.saveSettings();
					}),
			);

		const check = new Setting(containerEl).setName(t('settings.check.name')).setDesc(t('settings.check.desc'));
		check.addButton((b) =>
			b.setButtonText(t('settings.check.button')).onClick(async () => {
				b.setDisabled(true);
				const outcome = await checkPairing(http, this.plugin.settings.pairingCode);
				b.setDisabled(false);
				check.setDesc(t(`outcome.${outcome}`));
			}),
		);
	}
}
