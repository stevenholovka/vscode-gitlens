'use strict';
import { commands, ConfigurationChangeEvent, ConfigurationScope, ExtensionContext } from 'vscode';
import { Autolinks } from './annotations/autolinks';
import { FileAnnotationController } from './annotations/fileAnnotationController';
import { LineAnnotationController } from './annotations/lineAnnotationController';
import { ActionRunners } from './api/actionRunners';
import { resetAvatarCache } from './avatars';
import { GitCodeLensController } from './codelens/codeLensController';
import { Commands, ToggleFileAnnotationCommandArgs } from './commands';
import {
	AnnotationsToggleMode,
	Config,
	configuration,
	ConfigurationWillChangeEvent,
	FileAnnotationType,
} from './configuration';
import { GitFileSystemProvider } from './git/fsProvider';
import { GitService } from './git/gitService';
import { LineHoverController } from './hovers/lineHoverController';
import { Keyboard } from './keyboard';
import { Logger } from './logger';
import { StatusBarController } from './statusbar/statusBarController';
import { memoize } from './system/decorators/memoize';
import { GitTerminalLinkProvider } from './terminal/linkProvider';
import { GitDocumentTracker } from './trackers/gitDocumentTracker';
import { GitLineTracker } from './trackers/gitLineTracker';
import { BranchesView } from './views/branchesView';
import { CommitsView } from './views/commitsView';
import { ContributorsView } from './views/contributorsView';
import { FileHistoryView } from './views/fileHistoryView';
import { LineHistoryView } from './views/lineHistoryView';
import { RemotesView } from './views/remotesView';
import { RepositoriesView } from './views/repositoriesView';
import { SearchAndCompareView } from './views/searchAndCompareView';
import { StashesView } from './views/stashesView';
import { TagsView } from './views/tagsView';
import { ViewCommands } from './views/viewCommands';
import { ViewFileDecorationProvider } from './views/viewDecorationProvider';
import { VslsController } from './vsls/vsls';
import { RebaseEditorProvider } from './webviews/rebaseEditor';
import { SettingsWebview } from './webviews/settingsWebview';
import { TimelineWebview } from './webviews/timelineWebview';
import { TimelineWebviewView } from './webviews/timelineWebviewView';
import { WelcomeWebview } from './webviews/welcomeWebview';

export class Container {
	private static _configsAffectedByMode: string[] | undefined;
	private static _applyModeConfigurationTransformBound:
		| ((e: ConfigurationChangeEvent) => ConfigurationChangeEvent)
		| undefined;

	private static _terminalLinks: GitTerminalLinkProvider | undefined;

	static initialize(extensionId: string, context: ExtensionContext, config: Config) {
		this._extensionId = extensionId;
		this._context = context;
		this._config = Container.applyMode(config);

		context.subscriptions.push((this._actionRunners = new ActionRunners()));
		context.subscriptions.push((this._lineTracker = new GitLineTracker()));
		context.subscriptions.push((this._tracker = new GitDocumentTracker()));
		context.subscriptions.push((this._vsls = new VslsController()));

		context.subscriptions.push((this._git = new GitService()));

		context.subscriptions.push(new ViewFileDecorationProvider());

		// Since there is a bit of a chicken & egg problem with the DocumentTracker and the GitService, initialize the tracker once the GitService is loaded
		this._tracker.initialize();

		context.subscriptions.push((this._fileAnnotationController = new FileAnnotationController()));
		context.subscriptions.push((this._lineAnnotationController = new LineAnnotationController()));
		context.subscriptions.push((this._lineHoverController = new LineHoverController()));
		context.subscriptions.push((this._statusBarController = new StatusBarController()));
		context.subscriptions.push((this._codeLensController = new GitCodeLensController()));
		context.subscriptions.push((this._keyboard = new Keyboard()));
		context.subscriptions.push((this._settingsWebview = new SettingsWebview()));
		context.subscriptions.push((this._timelineWebview = new TimelineWebview()));
		context.subscriptions.push((this._welcomeWebview = new WelcomeWebview()));

		context.subscriptions.push((this._repositoriesView = new RepositoriesView()));
		context.subscriptions.push((this._commitsView = new CommitsView()));
		context.subscriptions.push((this._fileHistoryView = new FileHistoryView()));
		context.subscriptions.push((this._lineHistoryView = new LineHistoryView()));
		context.subscriptions.push((this._branchesView = new BranchesView()));
		context.subscriptions.push((this._remotesView = new RemotesView()));
		context.subscriptions.push((this._stashesView = new StashesView()));
		context.subscriptions.push((this._tagsView = new TagsView()));
		context.subscriptions.push((this._contributorsView = new ContributorsView()));
		context.subscriptions.push((this._searchAndCompareView = new SearchAndCompareView()));
		context.subscriptions.push((this._timelineView = new TimelineWebviewView()));

		context.subscriptions.push((this._rebaseEditor = new RebaseEditorProvider()));

		if (config.terminalLinks.enabled) {
			context.subscriptions.push((this._terminalLinks = new GitTerminalLinkProvider()));
		}

		context.subscriptions.push(
			configuration.onDidChange(e => {
				if (!configuration.changed(e, 'terminalLinks.enabled')) return;

				this._terminalLinks?.dispose();
				if (Container.config.terminalLinks.enabled) {
					context.subscriptions.push((this._terminalLinks = new GitTerminalLinkProvider()));
				}
			}),
		);

		context.subscriptions.push(new GitFileSystemProvider());

		context.subscriptions.push(configuration.onWillChange(this.onConfigurationChanging, this));
	}

	private static onConfigurationChanging(e: ConfigurationWillChangeEvent) {
		this._config = undefined;

		if (configuration.changed(e.change, 'outputLevel')) {
			Logger.level = configuration.get('outputLevel');
		}

		if (configuration.changed(e.change, 'defaultGravatarsStyle')) {
			resetAvatarCache('fallback');
		}

		if (configuration.changed(e.change, 'mode') || configuration.changed(e.change, 'modes')) {
			if (this._applyModeConfigurationTransformBound == null) {
				this._applyModeConfigurationTransformBound = this.applyModeConfigurationTransform.bind(this);
			}
			e.transform = this._applyModeConfigurationTransformBound;
		}
	}

	private static _actionRunners: ActionRunners;
	static get actionRunners() {
		if (this._actionRunners == null) {
			this._context.subscriptions.push((this._actionRunners = new ActionRunners()));
		}

		return this._actionRunners;
	}

	private static _autolinks: Autolinks;
	static get autolinks() {
		if (this._autolinks == null) {
			this._context.subscriptions.push((this._autolinks = new Autolinks()));
		}

		return this._autolinks;
	}

	private static _codeLensController: GitCodeLensController;
	static get codeLens() {
		return this._codeLensController;
	}

	private static _branchesView: BranchesView | undefined;
	static get branchesView() {
		if (this._branchesView == null) {
			this._context.subscriptions.push((this._branchesView = new BranchesView()));
		}

		return this._branchesView;
	}

	private static _commitsView: CommitsView | undefined;
	static get commitsView() {
		if (this._commitsView == null) {
			this._context.subscriptions.push((this._commitsView = new CommitsView()));
		}

		return this._commitsView;
	}

	private static _config: Config | undefined;
	static get config() {
		if (this._config == null) {
			this._config = Container.applyMode(configuration.get());
		}
		return this._config;
	}

	private static _context: ExtensionContext;
	static get context() {
		return this._context;
	}

	private static _contributorsView: ContributorsView | undefined;
	static get contributorsView() {
		if (this._contributorsView == null) {
			this._context.subscriptions.push((this._contributorsView = new ContributorsView()));
		}

		return this._contributorsView;
	}

	private static _extensionId: string;
	static get extensionId() {
		return this._extensionId;
	}

	private static _fileAnnotationController: FileAnnotationController;
	static get fileAnnotations() {
		return this._fileAnnotationController;
	}

	private static _fileHistoryView: FileHistoryView | undefined;
	static get fileHistoryView() {
		if (this._fileHistoryView == null) {
			this._context.subscriptions.push((this._fileHistoryView = new FileHistoryView()));
		}

		return this._fileHistoryView;
	}

	private static _git: GitService;
	static get git() {
		return this._git;
	}

	private static _github: Promise<import('./github/github').GitHubApi | undefined> | undefined;
	static get github() {
		if (this._github == null) {
			this._github = this._loadGitHubApi();
		}

		return this._github;
	}

	private static async _loadGitHubApi() {
		try {
			return new (await import(/* webpackChunkName: "github" */ './github/github')).GitHubApi();
		} catch (ex) {
			Logger.error(ex);
			return undefined;
		}
	}

	@memoize()
	static get insiders() {
		return this._extensionId.endsWith('-insiders');
	}

	private static _keyboard: Keyboard;
	static get keyboard() {
		return this._keyboard;
	}

	private static _lineAnnotationController: LineAnnotationController;
	static get lineAnnotations() {
		return this._lineAnnotationController;
	}

	private static _lineHistoryView: LineHistoryView | undefined;
	static get lineHistoryView() {
		if (this._lineHistoryView == null) {
			this._context.subscriptions.push((this._lineHistoryView = new LineHistoryView()));
		}

		return this._lineHistoryView;
	}

	private static _lineHoverController: LineHoverController;
	static get lineHovers() {
		return this._lineHoverController;
	}

	private static _lineTracker: GitLineTracker;
	static get lineTracker() {
		return this._lineTracker;
	}

	private static _rebaseEditor: RebaseEditorProvider | undefined;
	static get rebaseEditor() {
		if (this._rebaseEditor == null) {
			this._context.subscriptions.push((this._rebaseEditor = new RebaseEditorProvider()));
		}

		return this._rebaseEditor;
	}

	private static _remotesView: RemotesView | undefined;
	static get remotesView() {
		if (this._remotesView == null) {
			this._context.subscriptions.push((this._remotesView = new RemotesView()));
		}

		return this._remotesView;
	}

	private static _repositoriesView: RepositoriesView | undefined;
	static get repositoriesView(): RepositoriesView {
		if (this._repositoriesView == null) {
			this._context.subscriptions.push((this._repositoriesView = new RepositoriesView()));
		}

		return this._repositoriesView;
	}

	private static _searchAndCompareView: SearchAndCompareView | undefined;
	static get searchAndCompareView() {
		if (this._searchAndCompareView == null) {
			this._context.subscriptions.push((this._searchAndCompareView = new SearchAndCompareView()));
		}

		return this._searchAndCompareView;
	}

	private static _settingsWebview: SettingsWebview;
	static get settingsWebview() {
		return this._settingsWebview;
	}

	private static _stashesView: StashesView | undefined;
	static get stashesView() {
		if (this._stashesView == null) {
			this._context.subscriptions.push((this._stashesView = new StashesView()));
		}

		return this._stashesView;
	}

	private static _statusBarController: StatusBarController;
	static get statusBar() {
		return this._statusBarController;
	}

	private static _tagsView: TagsView | undefined;
	static get tagsView() {
		if (this._tagsView == null) {
			this._context.subscriptions.push((this._tagsView = new TagsView()));
		}

		return this._tagsView;
	}

	private static _timelineView: TimelineWebviewView;
	static get timelineView() {
		return this._timelineView;
	}

	private static _timelineWebview: TimelineWebview;
	static get timelineWebview() {
		return this._timelineWebview;
	}

	private static _tracker: GitDocumentTracker;
	static get tracker() {
		return this._tracker;
	}

	private static _viewCommands: ViewCommands | undefined;
	static get viewCommands() {
		if (this._viewCommands == null) {
			this._viewCommands = new ViewCommands();
		}
		return this._viewCommands;
	}

	private static _vsls: VslsController;
	static get vsls() {
		return this._vsls;
	}

	private static _welcomeWebview: WelcomeWebview;
	static get welcomeWebview() {
		return this._welcomeWebview;
	}

	private static applyMode(config: Config) {
		if (!config.mode.active) return config;

		const mode = config.modes?.[config.mode.active];
		if (mode == null) return config;

		if (mode.annotations != null) {
			let command: string | undefined;
			switch (mode.annotations) {
				case 'blame':
					config.blame.toggleMode = AnnotationsToggleMode.Window;
					command = Commands.ToggleFileBlame;
					break;
				case 'changes':
					config.changes.toggleMode = AnnotationsToggleMode.Window;
					command = Commands.ToggleFileChanges;
					break;
				case 'heatmap':
					config.heatmap.toggleMode = AnnotationsToggleMode.Window;
					command = Commands.ToggleFileHeatmap;
					break;
			}

			if (command != null) {
				const commandArgs: ToggleFileAnnotationCommandArgs = {
					type: mode.annotations as FileAnnotationType,
					on: true,
				};
				// Make sure to delay the execution by a bit so that the configuration changes get propegated first
				setTimeout(() => commands.executeCommand(command!, commandArgs), 50);
			}
		}

		if (mode.codeLens != null) {
			config.codeLens.enabled = mode.codeLens;
		}

		if (mode.currentLine != null) {
			config.currentLine.enabled = mode.currentLine;
		}

		if (mode.hovers != null) {
			config.hovers.enabled = mode.hovers;
		}

		if (mode.statusBar != null) {
			config.statusBar.enabled = mode.statusBar;
		}

		return config;
	}

	private static applyModeConfigurationTransform(e: ConfigurationChangeEvent): ConfigurationChangeEvent {
		if (this._configsAffectedByMode == null) {
			this._configsAffectedByMode = [
				`gitlens.${configuration.name('mode')}`,
				`gitlens.${configuration.name('modes')}`,
				`gitlens.${configuration.name('blame.toggleMode')}`,
				`gitlens.${configuration.name('changes.toggleMode')}`,
				`gitlens.${configuration.name('codeLens')}`,
				`gitlens.${configuration.name('currentLine')}`,
				`gitlens.${configuration.name('heatmap.toggleMode')}`,
				`gitlens.${configuration.name('hovers')}`,
				`gitlens.${configuration.name('statusBar')}`,
			];
		}

		const original = e.affectsConfiguration;
		return {
			...e,
			affectsConfiguration: (section: string, scope?: ConfigurationScope) =>
				this._configsAffectedByMode?.some(n => section.startsWith(n)) ? true : original(section, scope),
		};
	}
}
