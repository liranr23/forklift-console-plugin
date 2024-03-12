import {
  NetworkMapModel,
  StorageMapModel,
  V1beta1NetworkMap,
  V1beta1NetworkMapSpecMap,
  V1beta1StorageMap,
  V1beta1StorageMapSpecMap,
} from '@kubev2v/types';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';

/**
 * Updates the existing data of a Kubernetes planNetworkMaps and  planStorageMaps resources.
 *
 * @param {planNetworkMaps} V1beta1NetworkMap - The planNetworkMaps original object.
 * @param {planStorageMaps} V1beta1StorageMap - The planStorageMaps original object.
 * @param {updatedNetwork} V1beta1NetworkMapSpecMap[] - The V1beta1NetworkMapSpecMap array, containing the updated data.
 * @param {updatedStorage} V1beta1StorageMapSpecMap[] - The V1beta1StorageMapSpecMap array, containing the updated data.
 * @returns {Promise<void>} A promise that resolves when the patch operation is complete.
 */
export async function patchPlanMappingsData(
  planNetworkMaps: V1beta1NetworkMap,
  planStorageMaps: V1beta1StorageMap,
  updatedNetwork: V1beta1NetworkMapSpecMap[],
  updatedStorage: V1beta1StorageMapSpecMap[],
) {
  await k8sPatch({
    model: NetworkMapModel,
    resource: planNetworkMaps,
    data: [
      {
        op: 'replace',
        path: '/spec/map',
        value: updatedNetwork,
      },
    ],
  });

  await k8sPatch({
    model: StorageMapModel,
    resource: planStorageMaps,
    data: [
      {
        op: 'replace',
        path: '/spec/map',
        value: updatedStorage,
      },
    ],
  });
}
