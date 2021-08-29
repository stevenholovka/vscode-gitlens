'use strict';
import { Config } from '../config';

export interface IpcMessage {
	id: string;
	method: string;
	params?: any;
}

export type IpcNotificationParamsOf<NT> = NT extends IpcNotificationType<infer P> ? P : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class IpcNotificationType<P = any> {
	constructor(public readonly method: string) {}
}

export type IpcCommandParamsOf<CT> = CT extends IpcCommandType<infer P> ? P : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class IpcCommandType<P = any> {
	constructor(public readonly method: string) {}
}

export function onIpcCommand<CT extends IpcCommandType>(
	type: CT,
	command: IpcMessage,
	fn: (params: IpcCommandParamsOf<CT>) => unknown,
) {
	fn(command.params);
}

export function onIpcNotification<NT extends IpcNotificationType>(
	type: NT,
	notification: IpcMessage,
	fn: (params: IpcNotificationParamsOf<NT>) => void,
) {
	fn(notification.params);
}

export interface DidChangeConfigurationNotificationParams {
	config: Config;
	customSettings: Record<string, boolean>;
}
export const DidChangeConfigurationNotificationType = new IpcNotificationType<DidChangeConfigurationNotificationParams>(
	'configuration/didChange',
);

export const ReadyCommandType = new IpcCommandType('webview/ready');

export interface UpdateConfigurationCommandParams {
	changes: {
		[key: string]: any;
	};
	removes: string[];
	scope: 'user' | 'workspace';
	uri?: string;
}
export const UpdateConfigurationCommandType = new IpcCommandType<UpdateConfigurationCommandParams>(
	'configuration/update',
);

export interface CommitPreviewConfigurationCommandParams {
	key: string;
	id: string;
	type: 'commit';

	format: string;
}

type PreviewConfigurationCommandParams = CommitPreviewConfigurationCommandParams;
export const PreviewConfigurationCommandType = new IpcCommandType<PreviewConfigurationCommandParams>(
	'configuration/preview',
);

export interface DidPreviewConfigurationNotificationParams {
	id: string;
	preview: string;
}
export const DidPreviewConfigurationNotificationType =
	new IpcNotificationType<DidPreviewConfigurationNotificationParams>('configuration/didPreview');

export interface SettingsDidRequestJumpToNotificationParams {
	anchor: string;
}
export const SettingsDidRequestJumpToNotificationType =
	new IpcNotificationType<SettingsDidRequestJumpToNotificationParams>('settings/jumpTo');

export interface TimelineDatum {
	author: string;
	added: number;
	changed: number;
	deleted: number;
	commit: string;
	date: Date;
	message: string;
}

export interface TimelineData {
	dataset: TimelineDatum[];
	period: string;
	repoPath: string;
	title: string;
	uri?: string;
}

export interface TimelineDidChangeDataNotificationParams {
	data?: TimelineData;
}
export const TimelineDidChangeDataNotificationType = new IpcNotificationType<TimelineDidChangeDataNotificationParams>(
	'timeline/data/didChange',
);

export interface TimelineDataPointClickCommandParams {
	data?: {
		id: string;
		selected: boolean;
	};
}
export const TimelineDataPointClickCommandType = new IpcCommandType<TimelineDataPointClickCommandParams>(
	'timeline/point/click',
);

export interface TimelinePeriodUpdateCommandParams {
	data?: {
		period: string;
	};
}
export const TimelinePeriodUpdateCommandType = new IpcCommandType<TimelinePeriodUpdateCommandParams>(
	'timeline/period/update',
);

export interface AppStateWithConfig {
	config: Config;
	customSettings?: Record<string, boolean>;
}

export interface SettingsState extends AppStateWithConfig {
	scope: 'user' | 'workspace';
	scopes: ['user' | 'workspace', string][];
}

export type WelcomeState = AppStateWithConfig;

export interface Author {
	readonly author: string;
	readonly avatarUrl: string;
	readonly email: string | undefined;
}

export interface Commit {
	readonly ref: string;
	readonly author: string;
	// readonly avatarUrl: string;
	readonly date: string;
	readonly dateFromNow: string;
	// readonly email: string | undefined;
	readonly message: string;
	// readonly command: string;
}

export type RebaseEntryAction = 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'break' | 'drop';

export interface RebaseEntry {
	readonly action: RebaseEntryAction;
	readonly ref: string;
	readonly message: string;
	readonly index: number;
	readonly done?: boolean;
}

export interface RebaseDidChangeNotificationParams {
	state: RebaseState;
}
export const RebaseDidChangeNotificationType = new IpcNotificationType<RebaseDidChangeNotificationParams>(
	'rebase/change',
);

export const RebaseDidAbortCommandType = new IpcCommandType('rebase/abort');

export const RebaseDidContinueCommandType = new IpcCommandType('rebase/continue');

export const RebaseDidDisableCommandType = new IpcCommandType('rebase/disable');

export const RebaseDidStartCommandType = new IpcCommandType('rebase/start');

export const RebaseDidSwitchCommandType = new IpcCommandType('rebase/switch');

export interface RebaseDidChangeEntryCommandParams {
	ref: string;
	action: RebaseEntryAction;
}
export const RebaseDidChangeEntryCommandType = new IpcCommandType<RebaseDidChangeEntryCommandParams>(
	'rebase/change/entry',
);

export interface RebaseDidMoveEntryCommandParams {
	ref: string;
	to: number;
	relative: boolean;
}
export const RebaseDidMoveEntryCommandType = new IpcCommandType<RebaseDidMoveEntryCommandParams>('rebase/move/entry');

export interface RebaseState {
	branch: string;
	onto: string;

	entries: RebaseEntry[];
	authors: Author[];
	commits: Commit[];
	commands: {
		commit: string;
	};

	rebasing?: {
		current: string | undefined;
		incoming: string;
		conflicts: number;
		steps: {
			current: { number: number; commit: string };
			total: number;
		};
	};
}
