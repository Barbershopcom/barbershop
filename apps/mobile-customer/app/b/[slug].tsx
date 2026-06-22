import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { persistSlug } from '@/lib/tenant-slug';

export default function DeepLinkB() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  useEffect(() => {
    if (slug) void persistSlug(slug);
  }, [slug]);
  return <Redirect href="/(main)" />;
}
