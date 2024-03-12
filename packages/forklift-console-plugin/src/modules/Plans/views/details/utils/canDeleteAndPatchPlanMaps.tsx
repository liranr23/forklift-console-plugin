import { NetworkMapModel, StorageMapModel, V1beta1Plan } from '@kubev2v/types';
import { useAccessReview } from '@openshift-console/dynamic-plugin-sdk';

export const canDeleteAndPatchPlanMaps = (plan: V1beta1Plan) => {
  const [canDeleteNetworkMap] = useAccessReview({
    group: '',
    resource: NetworkMapModel.plural,
    verb: 'delete',
    name: plan.metadata?.name,
    namespace: plan.metadata?.name,
  });

  const [canPatchNetworkMap] = useAccessReview({
    group: '',
    resource: NetworkMapModel.plural,
    verb: 'patch',
    name: plan.metadata?.name,
    namespace: plan.metadata?.name,
  });

  const [canDeleteStorageMap] = useAccessReview({
    group: '',
    resource: StorageMapModel.plural,
    verb: 'delete',
    name: plan.metadata?.name,
    namespace: plan.metadata?.name,
  });

  const [canPatchStorageMap] = useAccessReview({
    group: '',
    resource: StorageMapModel.plural,
    verb: 'patch',
    name: plan.metadata?.name,
    namespace: plan.metadata?.name,
  });

  return canPatchNetworkMap && canDeleteNetworkMap && canPatchStorageMap && canDeleteStorageMap;
};
