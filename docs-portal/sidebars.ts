import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/overview',
        'getting-started/architecture',
        'getting-started/docker-dev',
        'getting-started/contributing',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/rest-overview',
        'api/graphql',
        'api/versioning',
        'api/bride-api-examples',
        'api/vaults-api',
      ],
    },
    {
      type: 'category',
      label: 'Mobile Money Providers',
      items: [
        'providers/orange-integration',
        'providers/airtel-session-proxy',
      ],
    },
    {
      type: 'category',
      label: 'Stellar Integration',
      items: [
        'stellar/sep10-authentication',
        'stellar/sep10-multisig',
        'stellar/sep12-kyc',
        'stellar/sep31-cross-border',
        'stellar/bridge-implementation',
        'stellar/bridge-deployment',
        'stellar/bridge-provider-comparison',
        'stellar/fee-bumping',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      items: [
        'security/jwt-authentication',
        'security/rbac',
        'security/kyc-integration',
        'security/kyc-document-upload',
        'security/fraud-rules',
        'security/2fa-setup',
        'security/sso-integration',
        'security/secrets-management',
      ],
    },
    {
      type: 'category',
      label: 'Infrastructure',
      items: [
        'infrastructure/cicd-pipeline',
        'infrastructure/docker-dev',
        'infrastructure/kubernetes',
        'infrastructure/terraform',
        'infrastructure/s3-setup',
        'infrastructure/codecov-setup',
        'infrastructure/pre-commit-setup',
      ],
    },
    {
      type: 'category',
      label: 'Observability',
      items: [
        'observability/metrics',
        'observability/heartbeat',
        'observability/elk-stack',
        'observability/slow-query-logging',
        'observability/pagerduty-integration',
        'observability/centralized-config',
      ],
    },
    {
      type: 'category',
      label: 'Performance',
      items: [
        'performance/redis-caching',
        'performance/redis-aof',
        'performance/distributed-locks',
        'performance/read-replica-routing',
        'performance/queue-system',
        'performance/fee-strategy-engine',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      items: [
        'testing/pact-contract-testing',
        'testing/load-testing',
        'testing/code-coverage',
      ],
    },
    {
      type: 'category',
      label: 'CLI & SDK',
      items: [
        'tools/cli',
        'tools/cli-testing',
        'tools/kotlin-sdk',
        'tools/sdk-publish',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        'advanced/zk-balance-proofs',
        'advanced/zk-research',
        'advanced/stellar-evm-bridge',
        'advanced/monthly-statements',
        'advanced/dispute-resolution',
        'advanced/transaction-filtering',
      ],
    },
  ],
};

export default sidebars;
