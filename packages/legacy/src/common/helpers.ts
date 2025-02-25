import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  StatusCategoryType,
  ConditionType,
  StepType,
  ProviderType,
  SOURCE_PROVIDER_TYPES,
  TARGET_PROVIDER_TYPES,
  PROVIDER_TYPES,
} from 'legacy/src/common/constants';
import {
  ICR,
  IMetaObjectMeta,
  InventoryProvider,
  IObjectReference,
  IProviderObject,
  ISecret,
  IStatusCondition,
  IStep,
  IVMStatus,
} from 'legacy/src/queries/types';
import { UseQueryResult } from 'react-query';
import { IKubeList } from 'legacy/src/client/types';
import { StatusType } from '@migtools/lib-ui';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

export const hasCondition = (conditions: IStatusCondition[], type: ConditionType): boolean => {
  return !!conditions.find((condition) => condition.type === type);
};

export const findConditionByCategory = (
  conditions: IStatusCondition[],
  category: string
): IStatusCondition | undefined => {
  return conditions.find((condition) => condition.category === category);
};

export const getStatusType = (severity: string): StatusType => {
  if (severity === 'Ready' || severity === StatusCategoryType.Required) {
    return 'Ok';
  }
  if (severity === StatusCategoryType.Advisory) {
    return 'Info';
  }
  if (severity === 'Pending') {
    return 'Loading';
  }
  if (severity === StatusCategoryType.Critical || severity === StatusCategoryType.Error) {
    return 'Error';
  }
  return 'Warning';
};

export const getMostSeriousCondition = (conditions: IStatusCondition[]): string => {
  if (findConditionByCategory(conditions, StatusCategoryType.Critical)) {
    return StatusCategoryType.Critical;
  }
  if (findConditionByCategory(conditions, StatusCategoryType.Error)) {
    return StatusCategoryType.Error;
  }
  if (findConditionByCategory(conditions, StatusCategoryType.Warn)) {
    return StatusCategoryType.Warn;
  }
  if (
    conditions.find((condition) => condition.reason === 'Started' || condition.reason === 'Running')
  ) {
    return 'Pending';
  }
  if (
    hasCondition(conditions, 'Ready') ||
    conditions.find((condition) => condition.reason === 'Completed')
  ) {
    return 'Ready';
  }
  if (findConditionByCategory(conditions, StatusCategoryType.Required)) {
    return StatusCategoryType.Required;
  }
  if (findConditionByCategory(conditions, StatusCategoryType.Advisory)) {
    return StatusCategoryType.Advisory;
  }

  return 'Unknown';
};

export const findCurrentStep = (
  pipeline: IStep[]
): { currentStep: IStep | undefined; currentStepIndex: number } => {
  if (pipeline.length === 0) return { currentStep: undefined, currentStepIndex: 0 };
  let currentStep: IStep;
  if (!pipeline[0].started) {
    currentStep = pipeline[0];
  } else {
    currentStep =
      pipeline
        .slice(0)
        .reverse()
        .find((step) => !!step.error || !!step.started) || pipeline[pipeline.length - 1];
  }
  const currentStepIndex = currentStep ? pipeline.indexOf(currentStep) : 0;
  return { currentStep, currentStepIndex };
};

export const formatTimestamp = (timestamp?: string, showSeconds = true): string => {
  const template = `DD MMM YYYY, HH:mm${showSeconds ? ':ss' : ''} z`;
  return timestamp ? dayjs(timestamp).format(template) : '';
};

const padNum = (num: number) => (num < 10 ? `0${num}` : `${num}`);

export const formatDuration = (
  start?: string | dayjs.Dayjs,
  end?: string | dayjs.Dayjs
): string => {
  if (!start) return '00:00:00';
  let seconds = (end ? dayjs(end) : dayjs()).diff(dayjs(start), 'second');
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  return `${padNum(hours)}:${padNum(minutes)}:${padNum(seconds)}`;
};

export const getStepType = (status: IVMStatus, index: number, isCanceled: boolean): StepType => {
  const { currentStepIndex } = findCurrentStep(status.pipeline);
  const step = status.pipeline[index];
  if (step?.started && step?.completed && index === currentStepIndex && isCanceled) {
    return StepType.Canceled;
  }
  if (step?.completed || index < currentStepIndex) return StepType.Full;
  if (status.started && index === currentStepIndex)
    return isCanceled ? StepType.Canceled : StepType.Half;
  return StepType.Empty;
};

export const isStepOnError = (status: IVMStatus, index: number): boolean => {
  const step = status.pipeline[index];
  if (step.error) return true;
  return false;
};

export const numStr = (num: number | undefined): string => {
  if (num === undefined) return '';
  return String(num);
};

export const getObjectRef = (cr: ICR): IObjectReference => ({
  apiVersion: cr.apiVersion,
  kind: cr.kind,
  name: cr.metadata.name,
  namespace: cr.metadata.namespace,
  uid: cr.metadata.uid,
});

export const getMinutesUntil = (timestamp: Date | string): string => {
  const minutes = dayjs(timestamp).diff(dayjs(), 'minute');
  if (minutes <= 0) return 'less than 1 minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
};

function providerTypesFilterFromRole(role: 'target' | 'source') {
  if (role === 'source') {
    return SOURCE_PROVIDER_TYPES;
  } else if (role === 'target') {
    return TARGET_PROVIDER_TYPES;
  } else {
    return PROVIDER_TYPES;
  }
}

export const getAvailableProviderTypes = (
  clusterProvidersQuery: UseQueryResult<IKubeList<IProviderObject>>,
  role: 'target' | 'source'
): ProviderType[] => {
  const providerTypesFilter = providerTypesFilterFromRole(role);
  const clusterProviders = clusterProvidersQuery.data?.items || [];

  return Array.from(new Set(clusterProviders.map((provider) => provider.spec.type)))
    .filter((type) => providerTypesFilter.includes(type))
    .sort() as ProviderType[];
};

export function checkIfOvirtInsecureProvider(
  provider: InventoryProvider,
  secrets: IKubeList<ISecret>
): boolean {
  if (provider?.type !== 'ovirt') {
    return false;
  }
  const secretName = provider?.object?.spec?.secret?.name ?? '';
  const secret = secrets?.items.find(
    (secret: ISecret) => (secret.metadata as IMetaObjectMeta).name === secretName
  );
  return secret?.data?.insecureSkipVerify
    ? stringToBoolean(atob(secret.data.insecureSkipVerify))
    : false;
}

/**
 * Can this provider be considered a local target provider?
 */
export const isProviderLocalTarget = (provider: IProviderObject): boolean =>
  provider?.spec?.type === 'openshift' && (!provider?.spec?.url || provider?.spec?.url === '');

export const getStorageTitle = (sourceProviderType: ProviderType, cap = false): string => {
  if (sourceProviderType === 'vsphere') return `${cap ? 'D' : 'd'}atastores`;
  if (sourceProviderType === 'ovirt') return `${cap ? 'S' : 's'}torage domains`;
  if (sourceProviderType === 'openstack') return `${cap ? 'V' : 'v'}olume types`;
  if (sourceProviderType === 'openshift') return `${cap ? 'S' : 's'}torage classes`;
  return '';
};

export const getUniqueItemsByName = <T extends { name: string }>(allItems: T[]): T[] => {
  const uniqueItems: T[] = [];
  allItems.forEach((item) => {
    if (!uniqueItems.some(({ name }) => name === item.name)) {
      uniqueItems.push(item);
    }
  });
  return uniqueItems;
};

/**
 * Follow the golang `ParseBool` to return a boolean value represented by the string.
 * It accepts 1, t, T, TRUE, true, True, 0, f, F, FALSE, false, False.
 * Any other values return undefined.
 */
export const stringToBoolean = (s: string, defaultReturn: boolean = undefined): boolean => {
  switch (s) {
    case '1':
    case 't':
    case 'T':
    case 'true':
    case 'TRUE':
    case 'True':
      return true;

    case '0':
    case 'f':
    case 'F':
    case 'false':
    case 'FALSE':
    case 'False':
      return false;

    default:
      return defaultReturn;
  }
};

/**
 * Follow the golang `FormatBool` to return "true" or "false" according to the
 * value of `b`.
 */
export const booleanToString = (b: boolean): string => {
  return b ? 'true' : 'false';
};
