// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
    integrations: [
        react(),
        starlight({
            title: '@cf-agents',
            customCss: ['./src/styles/custom.css'],
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
                        { label: 'LLM Enhancements', slug: 'packages/llm-enhancements' },
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