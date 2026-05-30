import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Mobile Money API Portal',
  tagline: 'Searchable API docs powered by OpenAPI + Redoc',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'https://sublime247.github.io',
  baseUrl: '/mobile-money/',

  organizationName: 'sublime247',
  projectName: 'mobile-money',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Mobile Money API',
      items: [
        { to: '/', label: 'Overview', position: 'left' },
        { to: '/docs/getting-started/quickstart', label: 'Docs', position: 'left' },
        { to: '/api', label: 'API Reference', position: 'left' },
        {
          href: 'https://github.com/sublime247/mobile-money',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Quickstart', to: '/docs/getting-started/quickstart' },
            { label: 'API Reference', to: '/api' },
          ],
        },
        {
          title: 'Providers',
          items: [
            { label: 'Vodacom', to: '/docs/providers/vodacom' },
            { label: 'Tigo', to: '/docs/providers/tigo' },
            { label: 'Airtel', to: '/docs/providers/airtel' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/sublime247/mobile-money' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Mobile Money`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
