import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';

// Agent actions that will appear in a loop
const AGENT_ACTIONS = [
    {
        id: 'email',
        icon: '✉️',
        title: 'Sending Email',
        description: 'Drafting response to John...',
        color: '#EA4335',
        service: 'Gmail'
    },
    {
        id: 'discord',
        icon: '💬',
        title: 'Discord Message',
        description: 'Posted update to #general',
        color: '#5865F2',
        service: 'Discord'
    },
    {
        id: 'calendar',
        icon: '📅',
        title: 'Scheduling Meeting',
        description: 'Booked standup for 10am',
        color: '#4285F4',
        service: 'Calendar'
    },
    {
        id: 'slack',
        icon: '💼',
        title: 'Slack Alert',
        description: 'Notified @team about deploy',
        color: '#4A154B',
        service: 'Slack'
    },
    {
        id: 'sheets',
        icon: '📊',
        title: 'Updating Spreadsheet',
        description: 'Added Q4 revenue data',
        color: '#0F9D58',
        service: 'Sheets'
    },
    {
        id: 'telegram',
        icon: '📱',
        title: 'Telegram Sent',
        description: 'Alert delivered to channel',
        color: '#0088cc',
        service: 'Telegram'
    }
];

// All possible marker locations (tech hubs)
const ALL_LOCATIONS = [
    { location: [37.7749, -122.4194], size: 0.06 },  // SF
    { location: [51.5074, -0.1278], size: 0.05 },    // London
    { location: [35.6762, 139.6503], size: 0.05 },   // Tokyo
    { location: [1.3521, 103.8198], size: 0.04 },    // Singapore
    { location: [-33.8688, 151.2093], size: 0.04 },  // Sydney
    { location: [52.52, 13.405], size: 0.04 },       // Berlin
    { location: [40.7128, -74.006], size: 0.05 },    // NYC
    { location: [48.8566, 2.3522], size: 0.04 },     // Paris
    { location: [55.7558, 37.6173], size: 0.04 },    // Moscow
    { location: [22.3193, 114.1694], size: 0.04 },   // Hong Kong
    { location: [19.4326, -99.1332], size: 0.04 },   // Mexico City
    { location: [-23.5505, -46.6333], size: 0.04 },  // Sao Paulo
    { location: [28.6139, 77.209], size: 0.04 },     // Delhi
    { location: [31.2304, 121.4737], size: 0.05 },   // Shanghai
];

type MarkerMeta = {
    location: [number, number];
    /** current (animated) size */
    size: number;
    /** target size to animate toward */
    target: number;
};

function markerKey(location: [number, number]) {
    return `${location[0].toFixed(4)},${location[1].toFixed(4)}`;
}

interface ActionCardProps {
    action: typeof AGENT_ACTIONS[0];
    isVisible: boolean;
    position: 'left' | 'right';
    index: number;
}

function ActionCard({ action, isVisible, position, index }: ActionCardProps) {
    const yOffset = (index % 2) * 100; // Only 2 cards per side max

    return (
        <div
            className={`action-card ${isVisible ? 'visible' : ''} ${position}`}
            style={{
                '--card-color': action.color,
                '--y-offset': `${yOffset}px`,
            } as React.CSSProperties}
        >
            <div className="action-icon">{action.icon}</div>
            <div className="action-content">
                <span className="action-service">{action.service}</span>
                <strong className="action-title">{action.title}</strong>
                <p className="action-description">{action.description}</p>
            </div>
            <div className="action-status">
                <span className="status-dot"></span>
                <span>Processing...</span>
            </div>
        </div>
    );
}

export default function GlobeHero() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visibleActions, setVisibleActions] = useState<number[]>([]);
    const markersMetaRef = useRef<MarkerMeta[]>([]);
    const markersRef = useRef<Array<{ location: [number, number]; size: number }>>([]);

    // Randomly update markers
    useEffect(() => {
        const updateMarkers = () => {
            // Randomly select 3-6 markers to show
            const numMarkers = 3 + Math.floor(Math.random() * 4);
            const shuffled = [...ALL_LOCATIONS].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, numMarkers);

            // Vary the sizes slightly for animation effect
            const withVariedSizes = selected.map(m => ({
                ...m,
                size: m.size * (0.7 + Math.random() * 0.6) // Size varies 70-130%
            }));

            const nextByKey = new Map<string, { location: [number, number]; size: number }>();
            for (const m of withVariedSizes) {
                nextByKey.set(markerKey(m.location as [number, number]), {
                    location: m.location as [number, number],
                    size: m.size,
                });
            }

            // Update existing markers: keep + retarget, or fade out.
            const existing = markersMetaRef.current;
            const existingByKey = new Map(existing.map((m) => [markerKey(m.location), m]));

            for (const m of existing) {
                const key = markerKey(m.location);
                const next = nextByKey.get(key);
                if (next) {
                    m.target = next.size;
                    nextByKey.delete(key);
                } else {
                    // not selected anymore -> fade out
                    m.target = 0;
                }
            }

            // Add any new markers (start at 0 and fade in).
            for (const [, m] of nextByKey) {
                existing.push({ location: m.location, size: 0, target: m.size });
            }
        };

        // Initial markers
        updateMarkers();

        // Update markers every 2 seconds
        const interval = setInterval(updateMarkers, 2000);

        return () => clearInterval(interval);
    }, []);

    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // Theme detection
    useEffect(() => {
        const checkTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
            if (currentTheme) setTheme(currentTheme);
        };

        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    // Globe animation - Theme-aware
    useEffect(() => {
        let phi = 0;
        let width = 0;

        const onResize = () => {
            if (canvasRef.current) {
                width = canvasRef.current.offsetWidth;
            }
        };

        window.addEventListener('resize', onResize);
        onResize();

        if (!canvasRef.current) return;

        const isDark = theme === 'dark';

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0.3,
            dark: isDark ? 1 : 0,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: isDark ? 2 : 12,
            baseColor: isDark ? [0.15, 0.13, 0.1] : [1, 1, 1],
            markerColor: [0.965, 0.51, 0.12],
            glowColor: isDark ? [0.965, 0.51, 0.12] : [1, 1, 1],
            markers: markersRef.current,
            onRender: (state) => {
                state.phi = phi;
                phi += 0.003;
                state.width = width * 2;
                state.height = width * 2;
                // Animate markers (fade-like by tweening size)
                const metas = markersMetaRef.current;
                const tween = 0.08; // lower = slower / smoother
                for (let i = metas.length - 1; i >= 0; i--) {
                    const m = metas[i];
                    m.size += (m.target - m.size) * tween;
                    if (m.target === 0 && m.size < 0.003) {
                        metas.splice(i, 1);
                    }
                }

                markersRef.current = metas.map((m) => ({ location: m.location, size: m.size }));
                state.markers = markersRef.current;
            }
        });

        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, [theme]);

    // Action cards animation loop - show only 2 at a time
    useEffect(() => {
        let currentIndex = 0;

        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % AGENT_ACTIONS.length;

            setVisibleActions(prev => {
                const newVisible = [...prev, currentIndex];
                // Keep only last 2 visible
                if (newVisible.length > 2) {
                    return newVisible.slice(-2);
                }
                return newVisible;
            });
        }, 3000);

        // Start with first action
        setVisibleActions([0]);

        return () => clearInterval(interval);
    }, []);

    // Get left and right cards (only show 1 per side)
    const leftActions = AGENT_ACTIONS.filter((_, i) => i % 2 === 0);
    const rightActions = AGENT_ACTIONS.filter((_, i) => i % 2 === 1);

    return (
        <div className="globe-hero">
            <div className="globe-hero-content">
                <h1>
                    The Toolkit for <em>Building</em> Agents.
                </h1>
                <p className="tagline">
                    Drop-in integrations for Google, Discord, Slack, Telegram and more.
                    Built for Cloudflare Workers.
                </p>
                <div className="hero-actions">
                    <a href="/guides/getting-started" className="btn-primary">
                        Get Started →
                    </a>
                    <a href="https://github.com/charl-kruger/cf-agents" className="btn-secondary" target="_blank" rel="noopener noreferrer">
                        View on GitHub
                    </a>
                </div>
            </div>

            <div className="globe-container">
                {/* Floating action cards - left side (only first visible) */}
                <div className="action-cards-left">
                    {leftActions.slice(0, 2).map((action, i) => (
                        <ActionCard
                            key={action.id}
                            action={action}
                            isVisible={visibleActions.includes(AGENT_ACTIONS.indexOf(action))}
                            position="left"
                            index={i}
                        />
                    ))}
                </div>

                {/* The Globe */}
                <div className="globe-wrapper">
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            contain: 'layout paint size',
                            cursor: 'grab',
                        }}
                    />
                    <div className="globe-glow"></div>
                </div>

                {/* Floating action cards - right side (only first visible) */}
                <div className="action-cards-right">
                    {rightActions.slice(0, 2).map((action, i) => (
                        <ActionCard
                            key={action.id}
                            action={action}
                            isVisible={visibleActions.includes(AGENT_ACTIONS.indexOf(action))}
                            position="right"
                            index={i}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
