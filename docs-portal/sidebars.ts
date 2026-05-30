import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/quickstart',
        'getting-started/authentication',
      ],
    },
    {
      type: 'category',
      label: 'Providers',
      items: [
        'providers/vodacom',
        'providers/tigo',
        'providers/airtel',
      ],
    },
    {
      type: 'category',
      label: 'SDKs',
      items: [
        'sdks/kotlin',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker',
      ],
    },
  ],
};

export default sidebars;
