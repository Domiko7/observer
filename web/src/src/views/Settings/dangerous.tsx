import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DialogModal } from '../../components/ui/DialogModal';
import { Banner } from '../../components/widget/Banner';
import { TimePicker } from '../../components/widget/TimePicker';
import {
    JobStatus,
    PurgeDataJob,
    useGetCleanupStatusQuery,
    usePurgeHelicorderFilesByDateMutation,
    usePurgeHelicorderFilesMutation,
    usePurgeMiniSeedFilesByDateMutation,
    usePurgeMiniSeedFilesMutation,
    usePurgeSeisRecordsByDateMutation,
    usePurgeSeisRecordsMutation,
    useRestartApplicationMutation,
    useRestoreServiceConfigMutation,
    useRestoreStationConfigMutation
} from '../../graphql';
import { sendPromiseAlert } from '../../helpers/alert/sendPromiseAlert';
import { sendUserAlert } from '../../helpers/alert/sendUserAlert';
import { sendUserConfirm } from '../../helpers/alert/sendUserConfirm';

type CleanupMode = 'all' | 'range';
type CleanupTargetId = 'seisRecords' | 'miniSeed' | 'helicorder';

interface CleanupRange {
    startDate?: number;
    endDate?: number;
}

const initialCleanupRanges: Record<CleanupTargetId, CleanupRange> = {
    seisRecords: {},
    miniSeed: {},
    helicorder: {}
};

const initialCleanupModes: Record<CleanupTargetId, CleanupMode> = {
    seisRecords: 'all',
    miniSeed: 'all',
    helicorder: 'all'
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

const cleanupTargetByKind = (kind?: string): CleanupTargetId | undefined => {
    if (kind?.startsWith('seis_records')) {
        return 'seisRecords';
    }
    if (kind?.startsWith('miniseed')) {
        return 'miniSeed';
    }
    if (kind?.startsWith('helicorder')) {
        return 'helicorder';
    }
    return undefined;
};

interface IDangerous {
    currentLocale: string;
}

export const Dangerous = ({ currentLocale }: IDangerous) => {
    const { t } = useTranslation();
    const [cleanupModes, setCleanupModes] =
        useState<Record<CleanupTargetId, CleanupMode>>(initialCleanupModes);
    const [cleanupRanges, setCleanupRanges] =
        useState<Record<CleanupTargetId, CleanupRange>>(initialCleanupRanges);
    const [trackedCleanupJobId, setTrackedCleanupJobId] = useState<string | null>(null);
    const [cleanupModalTargetId, setCleanupModalTargetId] = useState<CleanupTargetId | null>(null);
    const [cleanupVerificationInput, setCleanupVerificationInput] = useState('');

    const [[restartApplication], [resetStationConfig], [resetServiceConfig]] = [
        useRestartApplicationMutation(),
        useRestoreStationConfigMutation(),
        useRestoreServiceConfigMutation()
    ];

    const [purgeSeisRecords] = usePurgeSeisRecordsMutation();
    const [purgeSeisRecordsByDate] = usePurgeSeisRecordsByDateMutation();
    const [purgeMiniSeedFiles] = usePurgeMiniSeedFilesMutation();
    const [purgeMiniSeedFilesByDate] = usePurgeMiniSeedFilesByDateMutation();
    const [purgeHelicorderFiles] = usePurgeHelicorderFilesMutation();
    const [purgeHelicorderFilesByDate] = usePurgeHelicorderFilesByDateMutation();

    const {
        data: cleanupStatusData,
        error: cleanupStatusError,
        refetch: refetchCleanupStatus
    } = useGetCleanupStatusQuery({ fetchPolicy: 'network-only', pollInterval: 5000 });
    const cleanupJob = cleanupStatusData?.getCleanupStatus;
    const isCleanupRunning = cleanupJob?.status === JobStatus.Running;
    const runningTarget = cleanupTargetByKind(cleanupJob?.kind);

    const cleanupTargets = useMemo(
        () => [
            {
                id: 'seisRecords',
                title: t('views.Settings.Dangerous.purge_waveform_records.title'),
                description: t('views.Settings.Dangerous.purge_waveform_records.description'),
                buttonText: t('views.Settings.Dangerous.purge_waveform_records.submit_button'),
                confirmTitle: t('views.Settings.Dangerous.purge_waveform_records.confirm_title'),
                confirmMessage: t(
                    'views.Settings.Dangerous.purge_waveform_records.confirm_message'
                ),
                confirmBtnText: t('views.Settings.Dangerous.purge_waveform_records.confirm_button'),
                cancelBtnText: t('views.Settings.Dangerous.purge_waveform_records.cancel_button')
            },
            {
                id: 'miniSeed',
                title: t('views.Settings.Dangerous.purge_miniseed_files.title'),
                description: t('views.Settings.Dangerous.purge_miniseed_files.description'),
                buttonText: t('views.Settings.Dangerous.purge_miniseed_files.submit_button'),
                confirmTitle: t('views.Settings.Dangerous.purge_miniseed_files.confirm_title'),
                confirmMessage: t('views.Settings.Dangerous.purge_miniseed_files.confirm_message'),
                confirmBtnText: t('views.Settings.Dangerous.purge_miniseed_files.confirm_button'),
                cancelBtnText: t('views.Settings.Dangerous.purge_miniseed_files.cancel_button')
            },
            {
                id: 'helicorder',
                title: t('views.Settings.Dangerous.purge_helicorder_files.title'),
                description: t('views.Settings.Dangerous.purge_helicorder_files.description'),
                buttonText: t('views.Settings.Dangerous.purge_helicorder_files.submit_button'),
                confirmTitle: t('views.Settings.Dangerous.purge_helicorder_files.confirm_title'),
                confirmMessage: t(
                    'views.Settings.Dangerous.purge_helicorder_files.confirm_message'
                ),
                confirmBtnText: t('views.Settings.Dangerous.purge_helicorder_files.confirm_button'),
                cancelBtnText: t('views.Settings.Dangerous.purge_helicorder_files.cancel_button')
            }
        ],
        [t]
    );

    const getCleanupKindLabel = useCallback(
        (kind?: string) => {
            switch (kind) {
                case 'seis_records_full':
                    return t('views.Settings.Dangerous.purge_data.kind_seis_records_full');
                case 'seis_records_by_date':
                    return t('views.Settings.Dangerous.purge_data.kind_seis_records_by_date');
                case 'miniseed_full':
                    return t('views.Settings.Dangerous.purge_data.kind_miniseed_full');
                case 'miniseed_by_date':
                    return t('views.Settings.Dangerous.purge_data.kind_miniseed_by_date');
                case 'helicorder_full':
                    return t('views.Settings.Dangerous.purge_data.kind_helicorder_full');
                case 'helicorder_by_date':
                    return t('views.Settings.Dangerous.purge_data.kind_helicorder_by_date');
                default:
                    return t('views.Settings.Dangerous.purge_data.kind_unknown');
            }
        },
        [t]
    );

    const getTargetLabel = useCallback(
        (targetId: CleanupTargetId) => {
            const target = cleanupTargets.find(({ id }) => id === targetId);
            return target?.title ?? targetId;
        },
        [cleanupTargets]
    );

    const getCleanupStatusMeta = useCallback(() => {
        if (cleanupStatusError !== undefined) {
            return {
                status: 'error' as const,
                message: t('views.Settings.Dangerous.purge_data.status_query_failed', {
                    error: cleanupStatusError.message
                })
            };
        }

        if (
            cleanupJob === null ||
            cleanupJob === undefined ||
            cleanupJob.status === JobStatus.Idle
        ) {
            return {
                status: 'ok' as const,
                message: t('views.Settings.Dangerous.purge_data.status_idle')
            };
        }

        const kind = getCleanupKindLabel(cleanupJob.kind);
        if (cleanupJob.status === JobStatus.Running) {
            return {
                status: 'warning' as const,
                message: `${t('views.Settings.Dangerous.purge_data.status_running', {
                    kind
                })} ${t('views.Settings.Dangerous.purge_data.running_hint')}`
            };
        }
        if (cleanupJob.status === JobStatus.Succeeded) {
            return {
                status: 'ok' as const,
                message: t('views.Settings.Dangerous.purge_data.status_success', { kind })
            };
        }
        return {
            status: 'error' as const,
            message: t('views.Settings.Dangerous.purge_data.status_failed', {
                kind,
                error: cleanupJob.error ?? 'unknown error'
            })
        };
    }, [cleanupJob, cleanupStatusError, getCleanupKindLabel, t]);

    useEffect(() => {
        if (
            trackedCleanupJobId === null ||
            cleanupJob === null ||
            cleanupJob === undefined ||
            cleanupJob.id !== trackedCleanupJobId
        ) {
            return;
        }

        const kind = getCleanupKindLabel(cleanupJob.kind);
        if (cleanupJob.status === JobStatus.Succeeded) {
            sendUserAlert(t('views.Settings.Dangerous.purge_data.status_success', { kind }));
            setTrackedCleanupJobId(null);
        }
        if (cleanupJob.status === JobStatus.Failed) {
            sendUserAlert(
                t('views.Settings.Dangerous.purge_data.status_failed', {
                    kind,
                    error: cleanupJob.error ?? 'unknown error'
                }),
                true,
                5000
            );
            setTrackedCleanupJobId(null);
        }
    }, [cleanupJob, getCleanupKindLabel, t, trackedCleanupJobId]);

    const updateCleanupMode = useCallback((targetId: CleanupTargetId, mode: CleanupMode) => {
        setCleanupModes((prev) => ({ ...prev, [targetId]: mode }));
    }, []);

    const updateCleanupRange = useCallback(
        (targetId: CleanupTargetId, key: keyof CleanupRange, value: number) => {
            setCleanupRanges((prev) => ({
                ...prev,
                [targetId]: { ...prev[targetId], [key]: value || undefined }
            }));
        },
        []
    );

    const getCleanupVerificationText = useCallback(
        (targetId: CleanupTargetId) => getTargetLabel(targetId),
        [getTargetLabel]
    );

    const executeCleanup = useCallback(
        async (targetId: CleanupTargetId) => {
            const mode = cleanupModes[targetId];
            const range = cleanupRanges[targetId];
            const startDate = range.startDate;
            const endDate = range.endDate;
            const variables = {
                startDate: startDate ?? 0,
                endDate: endDate ?? 0
            };
            if (mode === 'range') {
                if (startDate === undefined || endDate === undefined) {
                    sendUserAlert(t('views.Settings.Dangerous.purge_data.invalid_range'), true, 4000);
                    return;
                }
                if (startDate > endDate) {
                    sendUserAlert(t('views.Settings.Dangerous.purge_data.invalid_range'), true, 4000);
                    return;
                }
            }

            try {
                let job: PurgeDataJob | null | undefined;
                if (targetId === 'seisRecords') {
                    job =
                        mode === 'all'
                            ? (await purgeSeisRecords()).data?.purgeSeisRecords
                            : (await purgeSeisRecordsByDate({ variables })).data
                                  ?.purgeSeisRecordsByDate;
                }
                if (targetId === 'miniSeed') {
                    job =
                        mode === 'all'
                            ? (await purgeMiniSeedFiles()).data?.purgeMiniSeedFiles
                            : (await purgeMiniSeedFilesByDate({ variables })).data
                                  ?.purgeMiniSeedFilesByDate;
                }
                if (targetId === 'helicorder') {
                    job =
                        mode === 'all'
                            ? (await purgeHelicorderFiles()).data?.purgeHelicorderFiles
                            : (await purgeHelicorderFilesByDate({ variables })).data
                                  ?.purgeHelicorderFilesByDate;
                }

                if (job === null || job === undefined) {
                    return;
                }

                setTrackedCleanupJobId(job.id);
                await refetchCleanupStatus();
                sendUserAlert(t('views.Settings.Dangerous.purge_data.started'), false, 3000);
            } catch (error) {
                sendUserAlert(
                    t('views.Settings.Dangerous.purge_data.request_failed', {
                        error: getErrorMessage(error)
                    }),
                    true,
                    5000
                );
            }
        },
        [
            cleanupModes,
            cleanupRanges,
            purgeHelicorderFiles,
            purgeHelicorderFilesByDate,
            purgeMiniSeedFiles,
            purgeMiniSeedFilesByDate,
            purgeSeisRecords,
            purgeSeisRecordsByDate,
            refetchCleanupStatus,
            t
        ]
    );

    const handleResetStationConfig = useCallback(
        async () =>
            await sendPromiseAlert(
                resetStationConfig(),
                t('views.Settings.Dangerous.reset_station_config.resetting'),
                t('views.Settings.Dangerous.reset_station_config.success'),
                (error) => t('views.Settings.Dangerous.reset_station_config.error', { error })
            ),
        [resetStationConfig, t]
    );

    const handleResetServiceConfig = useCallback(
        async () =>
            await sendPromiseAlert(
                resetServiceConfig(),
                t('views.Settings.Dangerous.reset_service_config.resetting'),
                t('views.Settings.Dangerous.reset_service_config.success'),
                (error) => t('views.Settings.Dangerous.reset_service_config.error', { error })
            ),
        [resetServiceConfig, t]
    );

    const handleRestartApplication = useCallback(
        async () =>
            await sendPromiseAlert(
                restartApplication(),
                t('views.Settings.Dangerous.restart_application.restarting'),
                t('views.Settings.Dangerous.restart_application.success'),
                (error) =>
                    t('views.Settings.Dangerous.restart_application.error', {
                        error
                    })
            ),
        [restartApplication, t]
    );

    const otherActions = useMemo(
        () => [
            {
                title: t('views.Settings.Dangerous.reset_station_config.title'),
                description: t('views.Settings.Dangerous.reset_station_config.description'),
                buttonText: t('views.Settings.Dangerous.reset_station_config.submit_button'),
                confirmTitle: t('views.Settings.Dangerous.reset_station_config.confirm_title'),
                confirmMessage: t('views.Settings.Dangerous.reset_station_config.confirm_message'),
                confirmBtnText: t('views.Settings.Dangerous.reset_station_config.confirm_button'),
                cancelBtnText: t('views.Settings.Dangerous.reset_station_config.cancel_button'),
                onConfirmed: handleResetStationConfig
            },
            {
                title: t('views.Settings.Dangerous.reset_service_config.title'),
                description: t('views.Settings.Dangerous.reset_service_config.description'),
                buttonText: t('views.Settings.Dangerous.reset_service_config.submit_button'),
                confirmTitle: t('views.Settings.Dangerous.reset_service_config.confirm_title'),
                confirmMessage: t('views.Settings.Dangerous.reset_service_config.confirm_message'),
                confirmBtnText: t('views.Settings.Dangerous.reset_service_config.confirm_button'),
                cancelBtnText: t('views.Settings.Dangerous.reset_service_config.cancel_button'),
                onConfirmed: handleResetServiceConfig
            },
            {
                title: t('views.Settings.Dangerous.restart_application.title'),
                description: t('views.Settings.Dangerous.restart_application.description'),
                buttonText: t('views.Settings.Dangerous.restart_application.submit_button'),
                confirmTitle: t('views.Settings.Dangerous.restart_application.confirm_title'),
                confirmMessage: t('views.Settings.Dangerous.restart_application.confirm_message'),
                confirmBtnText: t('views.Settings.Dangerous.restart_application.confirm_button'),
                cancelBtnText: t('views.Settings.Dangerous.restart_application.cancel_button'),
                onConfirmed: handleRestartApplication
            }
        ],
        [t, handleRestartApplication, handleResetServiceConfig, handleResetStationConfig]
    );

    const confirmCleanup = useCallback(
        (targetId: CleanupTargetId) => {
            const target = cleanupTargets.find(({ id }) => id === targetId);
            if (target === undefined) {
                return;
            }

            const mode = cleanupModes[targetId];
            const range = cleanupRanges[targetId];
            const startDate = range.startDate;
            const endDate = range.endDate;
            if (mode === 'range') {
                if (startDate === undefined || endDate === undefined) {
                    sendUserAlert(t('views.Settings.Dangerous.purge_data.invalid_range'), true, 4000);
                    return;
                }
                if (startDate > endDate) {
                    sendUserAlert(t('views.Settings.Dangerous.purge_data.invalid_range'), true, 4000);
                    return;
                }
            }

            setCleanupModalTargetId(null);
            setCleanupVerificationInput('');
            executeCleanup(targetId);
        },
        [cleanupModes, cleanupRanges, cleanupTargets, executeCleanup, t]
    );

    const confirmOtherAction = useCallback(
        (index: number) => {
            const action = otherActions[index];
            if (action === undefined) {
                return;
            }
            sendUserConfirm(action.confirmMessage, {
                title: action.confirmTitle,
                cancelBtnText: action.cancelBtnText,
                confirmBtnText: action.confirmBtnText,
                onConfirmed: action.onConfirmed
            });
        },
        [otherActions]
    );

    const handleCleanupTargetClick = useCallback(
        ({ currentTarget }: MouseEvent<HTMLButtonElement>) => {
            setCleanupVerificationInput('');
            setCleanupModalTargetId(currentTarget.value as CleanupTargetId);
        },
        []
    );

    const handleOtherActionClick = useCallback(
        ({ currentTarget }: MouseEvent<HTMLButtonElement>) => {
            confirmOtherAction(Number(currentTarget.value));
        },
        [confirmOtherAction]
    );

    const handleCleanupModalClose = useCallback(() => {
        setCleanupModalTargetId(null);
    }, []);

    const handleCleanupModeAllClick = useCallback(() => {
        if (cleanupModalTargetId !== null) {
            updateCleanupMode(cleanupModalTargetId, 'all');
        }
    }, [cleanupModalTargetId, updateCleanupMode]);

    const handleCleanupModeRangeClick = useCallback(() => {
        if (cleanupModalTargetId !== null) {
            updateCleanupMode(cleanupModalTargetId, 'range');
        }
    }, [cleanupModalTargetId, updateCleanupMode]);

    const handleCleanupStartDateChange = useCallback(
        (value: number) => {
            if (cleanupModalTargetId !== null) {
                updateCleanupRange(cleanupModalTargetId, 'startDate', value);
            }
        },
        [cleanupModalTargetId, updateCleanupRange]
    );

    const handleCleanupEndDateChange = useCallback(
        (value: number) => {
            if (cleanupModalTargetId !== null) {
                updateCleanupRange(cleanupModalTargetId, 'endDate', value);
            }
        },
        [cleanupModalTargetId, updateCleanupRange]
    );

    const handleCleanupVerificationInputChange = useCallback(
        ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
            setCleanupVerificationInput(currentTarget.value);
        },
        []
    );

    const handleCleanupSubmit = useCallback(() => {
        if (cleanupModalTargetId !== null) {
            confirmCleanup(cleanupModalTargetId);
        }
    }, [cleanupModalTargetId, confirmCleanup]);

    const cleanupModalTarget =
        cleanupModalTargetId === null
            ? undefined
            : cleanupTargets.find(({ id }) => id === cleanupModalTargetId);
    const cleanupModalMode =
        cleanupModalTargetId === null ? undefined : cleanupModes[cleanupModalTargetId];
    const cleanupStatusMeta = getCleanupStatusMeta();
    const cleanupVerificationText =
        cleanupModalTargetId === null ? '' : getCleanupVerificationText(cleanupModalTargetId);
    const cleanupVerificationPassed = cleanupVerificationInput === cleanupVerificationText;

    return (
        <div className="mx-auto max-w-3xl space-y-4 p-6">
            <Banner
                fullWidth={true}
                status={cleanupStatusMeta.status}
                message={cleanupStatusMeta.message}
            />

            <div>
                {cleanupTargets.map(({ id, title, description, buttonText }) => {
                    const isActiveTarget = isCleanupRunning && runningTarget === id;

                    return (
                        <div
                            key={id}
                            className={`flex flex-col justify-between gap-4 border-b border-gray-300 p-4 transition-colors sm:flex-row sm:items-center ${
                                isActiveTarget ? 'bg-amber-50' : ''
                            }`}
                        >
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                                    {isActiveTarget && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                            {t('views.Settings.Dangerous.purge_data.mode_running')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">{description}</p>
                            </div>

                            <button
                                value={id}
                                className="btn w-full rounded-lg bg-red-500 px-4 py-2 font-medium text-white shadow-lg transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
                                disabled={isCleanupRunning}
                                onClick={handleCleanupTargetClick}
                            >
                                {buttonText}
                            </button>
                        </div>
                    );
                })}
                {otherActions.map(({ title, description, buttonText }, index) => (
                    <div
                        key={`${index}-${title}`}
                        className="flex flex-col justify-between gap-4 border-b border-gray-300 p-4 sm:flex-row sm:items-center"
                    >
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                            <p className="text-sm text-gray-500">{description}</p>
                        </div>
                        <button
                            value={index}
                            className="btn w-full rounded-lg bg-red-500 px-4 py-2 font-medium text-white shadow-lg transition-all hover:bg-red-700 sm:w-auto"
                            onClick={handleOtherActionClick}
                        >
                            {buttonText}
                        </button>
                    </div>
                ))}
            </div>

            {cleanupModalTarget !== undefined && cleanupModalTargetId !== null && (
                <DialogModal
                    open={true}
                    nativeModal={false}
                    onClose={handleCleanupModalClose}
                    heading={
                        <h2 className="text-lg font-extrabold text-gray-800">
                            {cleanupModalTarget.confirmTitle}
                        </h2>
                    }
                >
                    <div className="space-y-5">
                        <p className="text-sm leading-6 text-gray-500">
                            {cleanupModalTarget.description}
                        </p>

                        <div className="flex flex-col items-start space-y-2">
                            <span className="text-sm font-medium text-gray-700">
                                {t('views.Settings.Dangerous.purge_data.mode_label')}
                            </span>
                            <div className="join w-fit">
                                <button
                                    className={`btn join-item btn-sm ${
                                        cleanupModalMode === 'all' ? 'btn-active' : ''
                                    }`}
                                    onClick={handleCleanupModeAllClick}
                                >
                                    {t('views.Settings.Dangerous.purge_data.mode_all')}
                                </button>
                                <button
                                    className={`btn join-item btn-sm ${
                                        cleanupModalMode === 'range' ? 'btn-active' : ''
                                    }`}
                                    onClick={handleCleanupModeRangeClick}
                                >
                                    {t('views.Settings.Dangerous.purge_data.mode_range')}
                                </button>
                            </div>
                        </div>

                        {cleanupModalMode === 'range' && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                    <span className="text-xs font-medium text-gray-600">
                                        {t('views.Settings.Dangerous.purge_data.start_date')}
                                    </span>
                                    <TimePicker
                                        dateOnly
                                        currentLocale={currentLocale}
                                        value={cleanupRanges[cleanupModalTargetId].startDate}
                                        placeholder={t(
                                            'views.Settings.Dangerous.purge_data.start_date'
                                        )}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-sm shadow-sm transition-all hover:ring focus:outline-none disabled:bg-gray-100"
                                        onChange={handleCleanupStartDateChange}
                                    />
                                </label>

                                <label className="space-y-1">
                                    <span className="text-xs font-medium text-gray-600">
                                        {t('views.Settings.Dangerous.purge_data.end_date')}
                                    </span>
                                    <TimePicker
                                        dateOnly
                                        currentLocale={currentLocale}
                                        value={cleanupRanges[cleanupModalTargetId].endDate}
                                        placeholder={t('views.Settings.Dangerous.purge_data.end_date')}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-sm shadow-sm transition-all hover:ring focus:outline-none disabled:bg-gray-100"
                                        onChange={handleCleanupEndDateChange}
                                    />
                                </label>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                {t('views.Settings.Dangerous.purge_data.verification_label')}
                            </label>
                            <p className="text-sm leading-6 text-gray-500">
                                {t('views.Settings.Dangerous.purge_data.verification_help', {
                                    verificationText: cleanupVerificationText
                                })}
                            </p>
                            <input
                                className="input w-full border border-gray-300 shadow-sm transition-all hover:ring focus:outline-none"
                                value={cleanupVerificationInput}
                                placeholder={cleanupVerificationText}
                                onChange={handleCleanupVerificationInputChange}
                            />
                        </div>

                        <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
                            <button
                                className="btn rounded-lg px-4 py-2 font-medium transition-all hover:bg-gray-300"
                                onClick={handleCleanupModalClose}
                            >
                                {cleanupModalTarget.cancelBtnText}
                            </button>
                            <button
                                className="btn rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                disabled={!cleanupVerificationPassed}
                                onClick={handleCleanupSubmit}
                            >
                                {cleanupModalTarget.confirmBtnText}
                            </button>
                        </div>
                    </div>
                </DialogModal>
            )}
        </div>
    );
};
