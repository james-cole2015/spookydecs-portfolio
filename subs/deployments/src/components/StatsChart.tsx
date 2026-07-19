import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@spookydecs/ui';
import { resolveChartPalette, resolveChartChrome } from '../config/chartColors';

/**
 * StatsChart — React wrapper around the CDN-loaded Chart.js global (#338 Decision 1).
 *
 * Chart.js stays a CDN `<script>` (see index.html). This component owns the
 * imperative bridge: it instantiates a doughnut chart against a `<canvas>` ref in
 * a `useEffect` and destroys it on unmount/data change — mirroring the playbook's
 * "React wraps CDN globals, it does not replace them" stance. The legend is
 * rendered declaratively below the canvas.
 *
 * Colors are resolved from the active HeroUI theme (see config/chartColors) at
 * paint time — inside the effect — and the resolved slice colors are mirrored to
 * state so the JSX legend dots track the canvas. `useTheme()` re-runs the effect
 * on a ThemeSwitch toggle, re-reading the CSS vars for the new theme (#430 F5).
 */

// Chart.js is provided at runtime by the CDN <script> in index.html.
declare const Chart: any;

export function StatsChart({ data }: { data: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  // Resolved slice colors, mirrored to state so the legend dots match the canvas.
  const [legendColors, setLegendColors] = useState<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
      console.warn('[StatsChart] Chart.js not loaded');
      return;
    }
    if (entries.length === 0) return;

    const labels = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);

    // Resolve theme colors now (post-commit): the <html> theme class is already
    // applied, so getComputedStyle reflects the current light/dark palette.
    const palette = resolveChartPalette();
    const chrome = resolveChartChrome();
    const sliceColors = entries.map((_, i) => palette[i % palette.length]);
    setLegendColors(sliceColors);

    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw(chart: any) {
        const { width, height, ctx } = chart;
        ctx.save();
        const centerX = width / 2;
        const centerY = height / 2;
        // Follow the active theme foreground so the center label reads in dark mode.
        ctx.font = `700 1.75rem -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = chrome.foreground;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(total), centerX, centerY - 10);
        ctx.font = `0.65rem -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = chrome.sublabel;
        ctx.fillText('items', centerX, centerY + 12);
        ctx.restore();
      },
    };

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: sliceColors,
            borderWidth: 2,
            borderColor: chrome.border,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const pct = ((ctx.parsed / total) * 100).toFixed(0);
                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
      plugins: [centerTextPlugin],
    });

    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), theme]);

  if (entries.length === 0) {
    return <div className="py-10 text-center text-sm text-default-500">No data available</div>;
  }

  return (
    <div>
      <div className="relative mx-auto h-48 w-48">
        <canvas ref={canvasRef} />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {entries.map(([label, count], i) => {
          const pct = ((count / total) * 100).toFixed(0);
          return (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: legendColors[i % (legendColors.length || 1)] }}
                />
                {label}
              </span>
              <span className="text-foreground">
                {count} <span className="font-normal text-default-400">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
