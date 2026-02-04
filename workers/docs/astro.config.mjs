// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

import cloudflare from '@astrojs/cloudflare';
import pageMarkdown from '@nuasite/llm-enhancements';

// https://astro.build/config
export default defineConfig({
    site: 'https://cf-agents.charl.dev',
    integrations: [
        react(),
        pageMarkdown(),
        starlight({
            title: 'CF-Agents',
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
                        { label: 'Agent Skills', slug: 'packages/skills' },
                        { label: 'Dynamic Workers', slug: 'packages/dynamic-workers' },
                    ],
                },
            ],
            components: {
                PageTitle: './src/components/PageTitleOverride.astro',
            },
        }),
    ],

    adapter: cloudflare({
        platformProxy: {
            enabled: true
        },

        imageService: "cloudflare"
    }),
});