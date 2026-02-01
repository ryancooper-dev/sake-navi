import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Sake',
  description: 'A lightweight, high-performance web framework for Navi',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#1a1a1a' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Sake - Web Framework for Navi' }],
    ['meta', { property: 'og:description', content: 'A lightweight, high-performance web framework for Navi' }],
  ],

  cleanUrls: true,

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/engine' },
      { text: 'Examples', link: '/examples' },
      {
        text: 'Navi',
        link: 'https://navi-lang.org',
        target: '_blank',
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
          ]
        },
        {
          text: 'Essentials',
          items: [
            { text: 'Routing', link: '/guide/routing' },
            { text: 'Middleware', link: '/guide/middleware' },
            { text: 'Context', link: '/guide/context' },
            { text: 'Request & Response', link: '/guide/request-response' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Parallelism', link: '/guide/parallelism' },
            { text: 'Performance', link: '/guide/performance' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Engine', link: '/api/engine' },
            { text: 'Context', link: '/api/context' },
            { text: 'Request', link: '/api/request' },
            { text: 'Response', link: '/api/response' },
            { text: 'Router', link: '/api/router' },
            { text: 'Config', link: '/api/config' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pnowak-dev/sake-navi' }
    ],

    footer: {
      message: 'Released under the MIT License. Built for <a href="https://navi-lang.org" target="_blank">Navi</a>.',
      copyright: 'Copyright © 2024'
    },

    search: {
      provider: 'local'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    // Use Rust highlighting for Navi (similar syntax)
    languages: [],
    languageAlias: {
      'nv': 'rust',
      'navi': 'rust'
    }
  },

  // Ignore dead links in existing docs
  ignoreDeadLinks: [
    /\.\.\/specs\//,
    /\.\.\/WORKERPOOL/,
    /\/Users\//
  ]
})
