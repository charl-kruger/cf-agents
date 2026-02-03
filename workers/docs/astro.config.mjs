// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
    integrations: [
        starlight({
            title: '@cf-agents Docs',
            social: [
                { label: 'GitHub', icon: 'github', href: 'https://github.com/charl-kruger/cf-agents' }
            ],
            sidebar: [
                {
                    label: 'Guides',
                    items: [
                        { label: 'Getting Started', slug: 'guides/getting-started' },
                    ],
                },
                {
                    label: 'Packages',
                    items: [
                        { label: 'Google', slug: 'packages/google' },
                        { label: 'Discord', slug: 'packages/discord' },
                        { label: 'Telegram', slug: 'packages/telegram' },
                        { label: 'Slack', slug: 'packages/slack' },
                    ],
                },
            ],
        }),
    ],

    adapter: cloudflare({
        platformProxy: {
            enabled: true
        },

        imageService: "cloudflare"
    }),
});