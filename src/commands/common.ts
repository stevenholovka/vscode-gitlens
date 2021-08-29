'use strict';
import * as paths from 'path';
import {
	commands,
	Disposable,
	ExtensionContext,
	GitTimelineItem,
	SourceControlResourceGroup,
	SourceControlResourceState,
	TextDocumentShowOptions,
	TextEditor,
	TextEditorEdit,
	TimelineItem,
	Uri,
	ViewColumn,
	window,
	workspace,
} from 'vscode';
import { Action, ActionContext } from '../api/gitlens';
import { BuiltInCommands, DocumentSchemes, ImageMimetypes } from '../constants';
import { Container } from '../container';
import { GitBranch, GitCommit, GitContributor, GitFile, GitReference, GitRemote, GitTag, Repository } from '../git/git';
import { GitUri } from '../git/gitUri';
import { Logger } from '../logger';
import { CommandQuickPickItem, RepositoryPicker } from '../quickpicks';
import { ViewNode, ViewRefNode } from '../views/nodes';

export enum Commands {
	ActionPrefix = 'gitlens.action.',
	AddAuthors = 'gitlens.addAuthors',
	BrowseRepoAtRevision = 'gitlens.browseRepoAtRevision',
	BrowseRepoAtRevisionInNewWindow = 'gitlens.browseRepoAtRevisionInNewWindow',
	BrowseRepoBeforeRevision = 'gitlens.browseRepoBeforeRevision',
	BrowseRepoBeforeRevisionInNewWindow = 'gitlens.browseRepoBeforeRevisionInNewWindow',
	ClearFileAnnotations = 'gitlens.clearFileAnnotations',
	CloseUnchangedFiles = 'gitlens.closeUnchangedFiles',
	CloseUpdatesView = 'gitlens.closeUpdatesView',
	CloseWelcomeView = 'gitlens.closeWelcomeView',
	CompareWith = 'gitlens.compareWith',
	CompareHeadWith = 'gitlens.compareHeadWith',
	CompareWorkingWith = 'gitlens.compareWorkingWith',
	ComputingFileAnnotations = 'gitlens.computingFileAnnotations',
	ConnectRemoteProvider = 'gitlens.connectRemoteProvider',
	CopyCurrentBranch = 'gitlens.copyCurrentBranch',
	CopyMessageToClipboard = 'gitlens.copyMessageToClipboard',
	CopyRemoteBranchesUrl = 'gitlens.copyRemoteBranchesUrl',
	CopyRemoteBranchUrl = 'gitlens.copyRemoteBranchUrl',
	CopyRemoteCommitUrl = 'gitlens.copyRemoteCommitUrl',
	CopyRemoteComparisonUrl = 'gitlens.copyRemoteComparisonUrl',
	CopyRemoteFileUrl = 'gitlens.copyRemoteFileUrlToClipboard',
	CopyRemoteFileUrlWithoutRange = 'gitlens.copyRemoteFileUrlWithoutRange',
	CopyRemoteFileUrlFrom = 'gitlens.copyRemoteFileUrlFrom',
	CopyRemotePullRequestUrl = 'gitlens.copyRemotePullRequestUrl',
	CopyRemoteRepositoryUrl = 'gitlens.copyRemoteRepositoryUrl',
	CopyShaToClipboard = 'gitlens.copyShaToClipboard',
	CreatePullRequestOnRemote = 'gitlens.createPullRequestOnRemote',
	DiffDirectory = 'gitlens.diffDirectory',
	DiffDirectoryWithHead = 'gitlens.diffDirectoryWithHead',
	DiffWith = 'gitlens.diffWith',
	DiffWithNext = 'gitlens.diffWithNext',
	DiffWithNextInDiffLeft = 'gitlens.diffWithNextInDiffLeft',
	DiffWithNextInDiffRight = 'gitlens.diffWithNextInDiffRight',
	DiffWithPrevious = 'gitlens.diffWithPrevious',
	DiffWithPreviousInDiffLeft = 'gitlens.diffWithPreviousInDiffLeft',
	DiffWithPreviousInDiffRight = 'gitlens.diffWithPreviousInDiffRight',
	DiffLineWithPrevious = 'gitlens.diffLineWithPrevious',
	DiffWithRevision = 'gitlens.diffWithRevision',
	DiffWithRevisionFrom = 'gitlens.diffWithRevisionFrom',
	DiffWithWorking = 'gitlens.diffWithWorking',
	DiffWithWorkingInDiffLeft = 'gitlens.diffWithWorkingInDiffLeft',
	DiffWithWorkingInDiffRight = 'gitlens.diffWithWorkingInDiffRight',
	DiffLineWithWorking = 'gitlens.diffLineWithWorking',
	DisconnectRemoteProvider = 'gitlens.disconnectRemoteProvider',
	DisableDebugLogging = 'gitlens.disableDebugLogging',
	EnableDebugLogging = 'gitlens.enableDebugLogging',
	DisableRebaseEditor = 'gitlens.disableRebaseEditor',
	EnableRebaseEditor = 'gitlens.enableRebaseEditor',
	ExternalDiff = 'gitlens.externalDiff',
	ExternalDiffAll = 'gitlens.externalDiffAll',
	FetchRepositories = 'gitlens.fetchRepositories',
	InviteToLiveShare = 'gitlens.inviteToLiveShare',
	OpenBlamePriorToChange = 'gitlens.openBlamePriorToChange',
	OpenBranchesOnRemote = 'gitlens.openBranchesOnRemote',
	OpenBranchOnRemote = 'gitlens.openBranchOnRemote',
	OpenChangedFiles = 'gitlens.openChangedFiles',
	OpenCommitOnRemote = 'gitlens.openCommitOnRemote',
	OpenComparisonOnRemote = 'gitlens.openComparisonOnRemote',
	OpenFileHistory = 'gitlens.openFileHistory',
	OpenFileFromRemote = 'gitlens.openFileFromRemote',
	OpenFileOnRemote = 'gitlens.openFileOnRemote',
	OpenFileOnRemoteFrom = 'gitlens.openFileOnRemoteFrom',
	OpenFileAtRevision = 'gitlens.openFileRevision',
	OpenFileAtRevisionFrom = 'gitlens.openFileRevisionFrom',
	OpenFolderHistory = 'gitlens.openFolderHistory',
	OpenOnRemote = 'gitlens.openOnRemote',
	OpenPullRequestOnRemote = 'gitlens.openPullRequestOnRemote',
	OpenAssociatedPullRequestOnRemote = 'gitlens.openAssociatedPullRequestOnRemote',
	OpenRepoOnRemote = 'gitlens.openRepoOnRemote',
	OpenRevisionFile = 'gitlens.openRevisionFile',
	OpenRevisionFileInDiffLeft = 'gitlens.openRevisionFileInDiffLeft',
	OpenRevisionFileInDiffRight = 'gitlens.openRevisionFileInDiffRight',
	OpenWorkingFile = 'gitlens.openWorkingFile',
	OpenWorkingFileInDiffLeft = 'gitlens.openWorkingFileInDiffLeft',
	OpenWorkingFileInDiffRight = 'gitlens.openWorkingFileInDiffRight',
	PullRepositories = 'gitlens.pullRepositories',
	PushRepositories = 'gitlens.pushRepositories',
	GitCommands = 'gitlens.gitCommands',
	GitCommandsBranch = 'gitlens.gitCommands.branch',
	GitCommandsCherryPick = 'gitlens.gitCommands.cherryPick',
	GitCommandsMerge = 'gitlens.gitCommands.merge',
	GitCommandsRebase = 'gitlens.gitCommands.rebase',
	GitCommandsReset = 'gitlens.gitCommands.reset',
	GitCommandsRevert = 'gitlens.gitCommands.revert',
	GitCommandsSwitch = 'gitlens.gitCommands.switch',
	GitCommandsTag = 'gitlens.gitCommands.tag',
	QuickOpenFileHistory = 'gitlens.quickOpenFileHistory',
	RefreshHover = 'gitlens.refreshHover',
	ResetAvatarCache = 'gitlens.resetAvatarCache',
	ResetSuppressedWarnings = 'gitlens.resetSuppressedWarnings',
	RevealCommitInView = 'gitlens.revealCommitInView',
	SearchCommits = 'gitlens.showCommitSearch',
	SearchCommitsInView = 'gitlens.views.searchAndCompare.searchCommits',
	SetViewsLayout = 'gitlens.setViewsLayout',
	ShowBranchesView = 'gitlens.showBranchesView',
	ShowCommitInView = 'gitlens.showCommitInView',
	ShowCommitsInView = 'gitlens.showCommitsInView',
	ShowCommitsView = 'gitlens.showCommitsView',
	ShowContributorsView = 'gitlens.showContributorsView',
	ShowFileHistoryView = 'gitlens.showFileHistoryView',
	ShowLastQuickPick = 'gitlens.showLastQuickPick',
	ShowLineHistoryView = 'gitlens.showLineHistoryView',
	ShowQuickBranchHistory = 'gitlens.showQuickBranchHistory',
	ShowQuickCommit = 'gitlens.showQuickCommitDetails',
	ShowQuickCommitFile = 'gitlens.showQuickCommitFileDetails',
	ShowQuickCurrentBranchHistory = 'gitlens.showQuickRepoHistory',
	ShowQuickFileHistory = 'gitlens.showQuickFileHistory',
	ShowQuickRepoStatus = 'gitlens.showQuickRepoStatus',
	ShowQuickCommitRevision = 'gitlens.showQuickRevisionDetails',
	ShowQuickCommitRevisionInDiffLeft = 'gitlens.showQuickRevisionDetailsInDiffLeft',
	ShowQuickCommitRevisionInDiffRight = 'gitlens.showQuickRevisionDetailsInDiffRight',
	ShowQuickStashList = 'gitlens.showQuickStashList',
	ShowRemotesView = 'gitlens.showRemotesView',
	ShowRepositoriesView = 'gitlens.showRepositoriesView',
	ShowSearchAndCompareView = 'gitlens.showSearchAndCompareView',
	ShowSettingsPage = 'gitlens.showSettingsPage',
	ShowSettingsPageAndJumpToBranchesView = 'gitlens.showSettingsPage#branches-view',
	ShowSettingsPageAndJumpToCommitsView = 'gitlens.showSettingsPage#commits-view',
	ShowSettingsPageAndJumpToContributorsView = 'gitlens.showSettingsPage#contributors-view',
	ShowSettingsPageAndJumpToFileHistoryView = 'gitlens.showSettingsPage#file-history-view',
	ShowSettingsPageAndJumpToLineHistoryView = 'gitlens.showSettingsPage#line-history-view',
	ShowSettingsPageAndJumpToRemotesView = 'gitlens.showSettingsPage#remotes-view',
	ShowSettingsPageAndJumpToRepositoriesView = 'gitlens.showSettingsPage#repositories-view',
	ShowSettingsPageAndJumpToSearchAndCompareView = 'gitlens.showSettingsPage#search-compare-view',
	ShowSettingsPageAndJumpToStashesView = 'gitlens.showSettingsPage#stashes-view',
	ShowSettingsPageAndJumpToTagsView = 'gitlens.showSettingsPage#tags-view',
	ShowSettingsPageAndJumpToViews = 'gitlens.showSettingsPage#views',
	ShowStashesView = 'gitlens.showStashesView',
	ShowTagsView = 'gitlens.showTagsView',
	ShowTimelinePage = 'gitlens.showTimelinePage',
	ShowWelcomePage = 'gitlens.showWelcomePage',
	ShowWelcomeView = 'gitlens.showWelcomeView',
	StashApply = 'gitlens.stashApply',
	StashSave = 'gitlens.stashSave',
	StashSaveFiles = 'gitlens.stashSaveFiles',
	SupportGitLens = 'gitlens.supportGitLens',
	SwitchMode = 'gitlens.switchMode',
	ToggleCodeLens = 'gitlens.toggleCodeLens',
	ToggleFileBlame = 'gitlens.toggleFileBlame',
	ToggleFileBlameInDiffLeft = 'gitlens.toggleFileBlameInDiffLeft',
	ToggleFileBlameInDiffRight = 'gitlens.toggleFileBlameInDiffRight',
	ToggleFileChanges = 'gitlens.toggleFileChanges',
	ToggleFileChangesOnly = 'gitlens.toggleFileChangesOnly',
	ToggleFileHeatmap = 'gitlens.toggleFileHeatmap',
	ToggleFileHeatmapInDiffLeft = 'gitlens.toggleFileHeatmapInDiffLeft',
	ToggleFileHeatmapInDiffRight = 'gitlens.toggleFileHeatmapInDiffRight',
	ToggleLineBlame = 'gitlens.toggleLineBlame',
	ToggleReviewMode = 'gitlens.toggleReviewMode',
	ToggleZenMode = 'gitlens.toggleZenMode',
	ViewsOpenDirectoryDiff = 'gitlens.views.openDirectoryDiff',
	ViewsOpenDirectoryDiffWithWorking = 'gitlens.views.openDirectoryDiffWithWorking',

	Deprecated_DiffHeadWith = 'gitlens.diffHeadWith',
	Deprecated_DiffWorkingWith = 'gitlens.diffWorkingWith',
	Deprecated_OpenBranchesInRemote = 'gitlens.openBranchesInRemote',
	Deprecated_OpenBranchInRemote = 'gitlens.openBranchInRemote',
	Deprecated_OpenCommitInRemote = 'gitlens.openCommitInRemote',
	Deprecated_OpenFileInRemote = 'gitlens.openFileInRemote',
	Deprecated_OpenInRemote = 'gitlens.openInRemote',
	Deprecated_OpenRepoInRemote = 'gitlens.openRepoInRemote',
	Deprecated_ShowFileHistoryInView = 'gitlens.showFileHistoryInView',
}

export function executeActionCommand<T extends ActionContext>(action: Action<T>, args: Omit<T, 'type'>) {
	return commands.executeCommand(`${Commands.ActionPrefix}${action}`, { ...args, type: action });
}

export function getMarkdownActionCommand<T extends ActionContext>(action: Action<T>, args: Omit<T, 'type'>): string {
	return Command.getMarkdownCommandArgsCore(`${Commands.ActionPrefix}${action}`, {
		...args,
		type: action,
	});
}

export function executeCommand<T>(command: Commands, args: T) {
	return commands.executeCommand(command, args);
}

export function executeEditorCommand<T>(command: Commands, uri: Uri | undefined, args: T) {
	return commands.executeCommand(command, uri, args);
}

interface CommandConstructor {
	new (): Command;
}

const registrableCommands: CommandConstructor[] = [];

export function command(): ClassDecorator {
	return (target: any) => {
		registrableCommands.push(target);
	};
}

export function registerCommands(context: ExtensionContext): void {
	for (const c of registrableCommands) {
		context.subscriptions.push(new c());
	}
}

export function getCommandUri(uri?: Uri, editor?: TextEditor): Uri | undefined {
	// Always use the editor.uri (if we have one), so we are correct for a split diff
	return editor?.document?.uri ?? uri;
}

export async function getRepoPathOrActiveOrPrompt(uri: Uri | undefined, editor: TextEditor | undefined, title: string) {
	const repoPath = await Container.git.getRepoPathOrActive(uri, editor);
	if (repoPath) return repoPath;

	const pick = await RepositoryPicker.show(title);
	if (pick instanceof CommandQuickPickItem) {
		await pick.execute();
		return undefined;
	}

	return pick?.repoPath;
}

export async function getRepoPathOrPrompt(title: string, uri?: Uri) {
	const repoPath = await Container.git.getRepoPath(uri);
	if (repoPath) return repoPath;

	const pick = await RepositoryPicker.show(title);
	if (pick instanceof CommandQuickPickItem) {
		void (await pick.execute());
		return undefined;
	}

	return pick?.repoPath;
}

export interface CommandContextParsingOptions {
	expectsEditor: boolean;
}

export interface CommandBaseContext {
	command: string;
	editor?: TextEditor;
	uri?: Uri;
}

export interface CommandGitTimelineItemContext extends CommandBaseContext {
	readonly type: 'timeline-item:git';
	readonly item: GitTimelineItem;
	readonly uri: Uri;
}

export interface CommandScmGroupsContext extends CommandBaseContext {
	readonly type: 'scm-groups';
	readonly scmResourceGroups: SourceControlResourceGroup[];
}

export interface CommandScmStatesContext extends CommandBaseContext {
	readonly type: 'scm-states';
	readonly scmResourceStates: SourceControlResourceState[];
}

export interface CommandUnknownContext extends CommandBaseContext {
	readonly type: 'unknown';
}

export interface CommandUriContext extends CommandBaseContext {
	readonly type: 'uri';
}

export interface CommandUrisContext extends CommandBaseContext {
	readonly type: 'uris';
	readonly uris: Uri[];
}

// export interface CommandViewContext extends CommandBaseContext {
//     readonly type: 'view';
// }

export interface CommandViewNodeContext extends CommandBaseContext {
	readonly type: 'viewItem';
	readonly node: ViewNode;
}

export function isCommandContextGitTimelineItem(context: CommandContext): context is CommandGitTimelineItemContext {
	return context.type === 'timeline-item:git';
}

export function isCommandContextViewNodeHasBranch(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { branch: GitBranch } } {
	if (context.type !== 'viewItem') return false;

	return GitBranch.is((context.node as ViewNode & { branch: GitBranch }).branch);
}

export function isCommandContextViewNodeHasCommit<T extends GitCommit>(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { commit: T } } {
	if (context.type !== 'viewItem') return false;

	return GitCommit.is((context.node as ViewNode & { commit: GitCommit }).commit);
}

export function isCommandContextViewNodeHasContributor(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { contributor: GitContributor } } {
	if (context.type !== 'viewItem') return false;

	return GitContributor.is((context.node as ViewNode & { contributor: GitContributor }).contributor);
}

export function isCommandContextViewNodeHasFile(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { file: GitFile; repoPath: string } } {
	if (context.type !== 'viewItem') return false;

	const node = context.node as ViewNode & { file: GitFile; repoPath: string };
	return node.file != null && (node.file.repoPath != null || node.repoPath != null);
}

export function isCommandContextViewNodeHasFileCommit(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { commit: GitCommit; file: GitFile; repoPath: string } } {
	if (context.type !== 'viewItem') return false;

	const node = context.node as ViewNode & { commit: GitCommit; file: GitFile; repoPath: string };
	return node.file != null && GitCommit.is(node.commit) && (node.file.repoPath != null || node.repoPath != null);
}

export function isCommandContextViewNodeHasFileRefs(context: CommandContext): context is CommandViewNodeContext & {
	node: ViewNode & { file: GitFile; ref1: string; ref2: string; repoPath: string };
} {
	if (context.type !== 'viewItem') return false;

	const node = context.node as ViewNode & { file: GitFile; ref1: string; ref2: string; repoPath: string };
	return (
		node.file != null &&
		node.ref1 != null &&
		node.ref2 != null &&
		(node.file.repoPath != null || node.repoPath != null)
	);
}

export function isCommandContextViewNodeHasRef(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { ref: GitReference } } {
	return context.type === 'viewItem' && context.node instanceof ViewRefNode;
}

export function isCommandContextViewNodeHasRemote(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { remote: GitRemote } } {
	if (context.type !== 'viewItem') return false;

	return GitRemote.is((context.node as ViewNode & { remote: GitRemote }).remote);
}

export function isCommandContextViewNodeHasRepository(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { repo: Repository } } {
	if (context.type !== 'viewItem') return false;

	return (context.node as ViewNode & { repo?: Repository }).repo instanceof Repository;
}

export function isCommandContextViewNodeHasRepoPath(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { repoPath: string } } {
	if (context.type !== 'viewItem') return false;

	return typeof (context.node as ViewNode & { repoPath?: string }).repoPath === 'string';
}

export function isCommandContextViewNodeHasTag(
	context: CommandContext,
): context is CommandViewNodeContext & { node: ViewNode & { tag: GitTag } } {
	if (context.type !== 'viewItem') return false;

	return GitTag.is((context.node as ViewNode & { tag: GitTag }).tag);
}

export type CommandContext =
	| CommandGitTimelineItemContext
	| CommandScmGroupsContext
	| CommandScmStatesContext
	| CommandUnknownContext
	| CommandUriContext
	| CommandUrisContext
	// | CommandViewContext
	| CommandViewNodeContext;

function isScmResourceGroup(group: any): group is SourceControlResourceGroup {
	if (group == null) return false;

	return (
		(group as SourceControlResourceGroup).id != null &&
		(group as SourceControlResourceGroup).label != null &&
		(group as SourceControlResourceGroup).resourceStates != null &&
		Array.isArray((group as SourceControlResourceGroup).resourceStates)
	);
}

function isScmResourceState(resource: any): resource is SourceControlResourceState {
	if (resource == null) return false;

	return (resource as SourceControlResourceState).resourceUri != null;
}

function isTimelineItem(item: any): item is TimelineItem {
	if (item == null) return false;

	return (item as TimelineItem).timestamp != null && (item as TimelineItem).label != null;
}

function isGitTimelineItem(item: any): item is GitTimelineItem {
	if (item == null) return false;

	return (
		isTimelineItem(item) &&
		(item as GitTimelineItem).ref != null &&
		(item as GitTimelineItem).previousRef != null &&
		(item as GitTimelineItem).message != null
	);
}

export abstract class Command implements Disposable {
	static getMarkdownCommandArgsCore<T>(
		command: Commands | `${Commands.ActionPrefix}${ActionContext['type']}`,
		args: T,
	): string {
		return `command:${command}?${encodeURIComponent(JSON.stringify(args))}`;
	}

	protected readonly contextParsingOptions: CommandContextParsingOptions = { expectsEditor: false };

	private readonly _disposable: Disposable;

	constructor(command: Commands | Commands[]) {
		if (typeof command === 'string') {
			this._disposable = commands.registerCommand(
				command,
				(...args: any[]) => this._execute(command, ...args),
				this,
			);

			return;
		}

		const subscriptions = command.map(cmd =>
			commands.registerCommand(cmd, (...args: any[]) => this._execute(cmd, ...args), this),
		);
		this._disposable = Disposable.from(...subscriptions);
	}

	dispose() {
		this._disposable.dispose();
	}

	protected preExecute(context: CommandContext, ...args: any[]): Promise<any> {
		return this.execute(...args);
	}

	abstract execute(...args: any[]): any;

	protected _execute(command: string, ...args: any[]): any {
		const [context, rest] = Command.parseContext(command, { ...this.contextParsingOptions }, ...args);
		return this.preExecute(context, ...rest);
	}

	private static parseContext(
		command: string,
		options: CommandContextParsingOptions,
		...args: any[]
	): [CommandContext, any[]] {
		let editor: TextEditor | undefined = undefined;

		let firstArg = args[0];

		if (options.expectsEditor) {
			if (firstArg == null || (firstArg.id != null && firstArg.document?.uri != null)) {
				editor = firstArg;
				args = args.slice(1);
				firstArg = args[0];
			}

			if (args.length > 0 && (firstArg == null || firstArg instanceof Uri)) {
				const [uri, ...rest] = args as [Uri, any];
				if (uri != null) {
					// If the uri matches the active editor (or we are in a left-hand side of a diff), then pass the active editor
					if (
						editor == null &&
						(uri.toString() === window.activeTextEditor?.document.uri.toString() ||
							command.endsWith('InDiffLeft'))
					) {
						editor = window.activeTextEditor;
					}

					const uris = rest[0];
					if (uris != null && Array.isArray(uris) && uris.length !== 0 && uris[0] instanceof Uri) {
						return [
							{ command: command, type: 'uris', editor: editor, uri: uri, uris: uris },
							rest.slice(1),
						];
					}
					return [{ command: command, type: 'uri', editor: editor, uri: uri }, rest];
				}

				args = args.slice(1);
			} else if (editor == null) {
				// If we are expecting an editor and we have no uri, then pass the active editor
				editor = window.activeTextEditor;
			}
		}

		if (firstArg instanceof ViewNode) {
			const [node, ...rest] = args as [ViewNode, any];
			return [{ command: command, type: 'viewItem', node: node, uri: node.uri }, rest];
		}

		if (isScmResourceState(firstArg)) {
			const states = [];
			let count = 0;
			for (const arg of args) {
				if (!isScmResourceState(arg)) break;

				count++;
				states.push(arg);
			}

			return [
				{ command: command, type: 'scm-states', scmResourceStates: states, uri: states[0].resourceUri },
				args.slice(count),
			];
		}

		if (isScmResourceGroup(firstArg)) {
			const groups = [];
			let count = 0;
			for (const arg of args) {
				if (!isScmResourceGroup(arg)) break;

				count++;
				groups.push(arg);
			}

			return [{ command: command, type: 'scm-groups', scmResourceGroups: groups }, args.slice(count)];
		}

		if (isGitTimelineItem(firstArg)) {
			const [item, uri, ...rest] = args as [GitTimelineItem, Uri, any];
			return [{ command: command, type: 'timeline-item:git', item: item, uri: uri }, rest];
		}

		return [{ command: command, type: 'unknown', editor: editor, uri: editor?.document.uri }, args];
	}
}

export abstract class ActiveEditorCommand extends Command {
	protected override readonly contextParsingOptions: CommandContextParsingOptions = { expectsEditor: true };

	constructor(command: Commands | Commands[]) {
		super(command);
	}

	protected override preExecute(context: CommandContext, ...args: any[]): Promise<any> {
		return this.execute(context.editor, context.uri, ...args);
	}

	protected override _execute(command: string, ...args: any[]): any {
		return super._execute(command, undefined, ...args);
	}

	abstract override execute(editor?: TextEditor, ...args: any[]): any;
}

let lastCommand: { command: string; args: any[] } | undefined = undefined;
export function getLastCommand() {
	return lastCommand;
}

export abstract class ActiveEditorCachedCommand extends ActiveEditorCommand {
	constructor(command: Commands | Commands[]) {
		super(command);
	}

	protected override _execute(command: string, ...args: any[]): any {
		lastCommand = {
			command: command,
			args: args,
		};
		return super._execute(command, ...args);
	}

	abstract override execute(editor: TextEditor, ...args: any[]): any;
}

export abstract class EditorCommand implements Disposable {
	private readonly _disposable: Disposable;

	constructor(command: Commands | Commands[]) {
		if (!Array.isArray(command)) {
			command = [command];
		}

		const subscriptions = [];
		for (const cmd of command) {
			subscriptions.push(
				commands.registerTextEditorCommand(
					cmd,
					(editor: TextEditor, edit: TextEditorEdit, ...args: any[]) =>
						this.executeCore(cmd, editor, edit, ...args),
					this,
				),
			);
		}
		this._disposable = Disposable.from(...subscriptions);
	}

	dispose() {
		this._disposable.dispose();
	}

	private executeCore(command: string, editor: TextEditor, edit: TextEditorEdit, ...args: any[]): any {
		return this.execute(editor, edit, ...args);
	}

	abstract execute(editor: TextEditor, edit: TextEditorEdit, ...args: any[]): any;
}

export function findEditor(uri: Uri): TextEditor | undefined {
	const active = window.activeTextEditor;
	const normalizedUri = uri.toString();

	for (const e of [...(active != null ? [active] : []), ...window.visibleTextEditors]) {
		// Don't include diff editors
		if (e.document.uri.toString() === normalizedUri && e?.viewColumn != null) {
			return e;
		}
	}

	return undefined;
}

export async function findOrOpenEditor(
	uri: Uri,
	options?: TextDocumentShowOptions & { throwOnError?: boolean },
): Promise<TextEditor | undefined> {
	const e = findEditor(uri);
	if (e != null) {
		if (!options?.preserveFocus) {
			await window.showTextDocument(e.document, { ...options, viewColumn: e.viewColumn });
		}

		return e;
	}

	return openEditor(uri, { viewColumn: window.activeTextEditor?.viewColumn, ...options });
}

export function findOrOpenEditors(uris: Uri[]): void {
	const normalizedUris = new Map(uris.map(uri => [uri.toString(), uri]));

	for (const e of window.visibleTextEditors) {
		// Don't include diff editors
		if (e?.viewColumn != null) {
			normalizedUris.delete(e.document.uri.toString());
		}
	}

	for (const uri of normalizedUris.values()) {
		void commands.executeCommand(BuiltInCommands.Open, uri, { background: true, preview: false });
	}
}

export async function openEditor(
	uri: Uri,
	options: TextDocumentShowOptions & { rethrow?: boolean } = {},
): Promise<TextEditor | undefined> {
	const { rethrow, ...opts } = options;
	try {
		if (GitUri.is(uri)) {
			uri = uri.documentUri();
		}

		if (uri.scheme === DocumentSchemes.GitLens && ImageMimetypes[paths.extname(uri.fsPath)]) {
			await commands.executeCommand(BuiltInCommands.Open, uri);

			return undefined;
		}

		const document = await workspace.openTextDocument(uri);
		return window.showTextDocument(document, {
			preserveFocus: false,
			preview: true,
			viewColumn: ViewColumn.Active,
			...opts,
		});
	} catch (ex) {
		const msg: string = ex?.toString() ?? '';
		if (msg.includes('File seems to be binary and cannot be opened as text')) {
			await commands.executeCommand(BuiltInCommands.Open, uri);

			return undefined;
		}

		if (rethrow) throw ex;

		Logger.error(ex, 'openEditor');
		return undefined;
	}
}

export function openWorkspace(uri: Uri, name: string, options: { openInNewWindow?: boolean } = {}) {
	if (options.openInNewWindow) {
		void commands.executeCommand(BuiltInCommands.OpenFolder, uri, true);

		return true;
	}

	return workspace.updateWorkspaceFolders(
		workspace.workspaceFolders != null ? workspace.workspaceFolders.length : 0,
		null,
		{ uri: uri, name: name },
	);
}
