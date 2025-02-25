import * as React from 'react';
import { Title, EmptyState, EmptyStateIcon, EmptyStateBody } from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { Mapping, MappingType } from 'legacy/src/queries/types';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import { MappingsTable } from './components/MappingsTable';
import {
  filterSharedMappings,
  useClusterProvidersQuery,
  useHasSufficientProvidersQuery,
  useMappingsQuery,
} from 'legacy/src/queries';
import { CreateMappingButton } from './components/CreateMappingButton';
import { ResolvedQueries } from 'legacy/src/common/components/ResolvedQuery';
import { ENV } from 'legacy/src/common/constants';

interface IMappingsProps {
  mappingType: MappingType;
  toggleModalAndResetEdit: () => void;
  openEditMappingModal: (mapping: Mapping) => void;
}

export const Mappings: React.FunctionComponent<IMappingsProps> = ({
  mappingType,
  toggleModalAndResetEdit,
  openEditMappingModal,
}: IMappingsProps) => {
  const namespace = ENV.DEFAULT_NAMESPACE;
  const sufficientProvidersQuery = useHasSufficientProvidersQuery();
  const clusterProvidersQuery = useClusterProvidersQuery(namespace);
  const mappingsQuery = useMappingsQuery(mappingType, namespace);
  const filteredMappings = filterSharedMappings(mappingsQuery.data?.items);

  return (
    <ResolvedQueries
      results={[sufficientProvidersQuery.result, clusterProvidersQuery, mappingsQuery]}
      errorTitles={[
        'Cannot load provider inventory data',
        'Cannot load providers from cluster',
        'Cannot load mappings',
      ]}
      errorsInline={false}
    >
      {!filteredMappings ? null : filteredMappings.length === 0 ? (
        <EmptyState className={spacing.my_2xl}>
          <EmptyStateIcon icon={PlusCircleIcon} />
          <Title headingLevel="h2" size="lg">
            No {mappingType.toLowerCase()} mappings
          </Title>
          <EmptyStateBody>
            {mappingType === MappingType.Network
              ? 'Map source provider networks to target provider networks.'
              : 'Map datastores, storage domains, volume types or storage classes from the source provider to storage classes of the target provider.'}
          </EmptyStateBody>
          <CreateMappingButton onClick={toggleModalAndResetEdit} />
        </EmptyState>
      ) : (
        <MappingsTable
          mappings={filteredMappings || []}
          mappingType={mappingType}
          openEditMappingModal={openEditMappingModal}
        />
      )}
    </ResolvedQueries>
  );
};
