import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import React from 'react';

import * as slug from './tenant-slug';
import { api } from './api';
import { TenantProvider, useTenant } from './tenant-context';

jest.mock('expo-linking', () => ({ useURL: () => null }));
jest.mock('./api');

function Probe() {
  const state = useTenant();
  return <Text>{state.status === 'ready' ? state.tenant.name : state.status}</Text>;
}

describe('TenantProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no-tenant quando não há deep link nem slug persistido', async () => {
    jest.spyOn(slug, 'loadPersistedSlug').mockResolvedValue(null);
    const { getByText } = await render(
      <TenantProvider><Probe /></TenantProvider>,
    );
    await waitFor(() => getByText('no-tenant'));
  });

  it('ready quando há slug persistido e o fetch responde', async () => {
    jest.spyOn(slug, 'loadPersistedSlug').mockResolvedValue('zezinho');
    (api.get as jest.Mock).mockResolvedValue({
      id: 'bs1', slug: 'zezinho', name: 'Barbearia Zezinho', ratingAvg: 4.5,
    });
    const { getByText } = await render(
      <TenantProvider><Probe /></TenantProvider>,
    );
    await waitFor(() => getByText('Barbearia Zezinho'));
  });

  it('error quando o fetch falha', async () => {
    jest.spyOn(slug, 'loadPersistedSlug').mockResolvedValue('zezinho');
    (api.get as jest.Mock).mockRejectedValue(new Error('boom'));
    const { getByText } = await render(
      <TenantProvider><Probe /></TenantProvider>,
    );
    await waitFor(() => getByText('error'));
  });
});
