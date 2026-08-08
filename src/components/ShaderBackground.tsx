import React, { useEffect, useRef } from 'react';

interface ShaderBackgroundProps {
  className?: string;
}

interface Cluster {
  id: number;
  xCenter: number;
  yCenter: number;
  width: number;
  activity: number;
  targetActivity: number;
  isHotspotActive: boolean;
  hotspotXRatio: number;
  hotspotIntensity: number;
  hotspotTimer: number;
}

interface SignalBar {
  x: number;
  width: number;
  layer: 0 | 1 | 2; // 0=BG, 1=MID, 2=FG
  yTop: number;
  targetYTop: number;
  height: number;
  targetHeight: number;
  minHeight: number;
  maxHeight: number;
  opacity: number;
  targetOpacity: number;
  speed: number;
  state: 'MOVE' | 'HOLD' | 'FADE';
  holdTimer: number;
  clusterId: number;
  xRatioInCluster: number;
  baseColor: string;
  glowColor: string;
  isShiny: boolean;
}

export const ShaderBackground: React.FC<ShaderBackgroundProps> = ({
  className = 'fixed inset-0 w-full h-full pointer-events-none z-0',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    let clusters: Cluster[] = [];
    let bars: SignalBar[] = [];
    let mouse = { x: -1000, y: -1000, active: false };

    // Wave progression state
    let waveX = -200;
    let waveActive = false;
    let waveSpeed = 4;
    let waveTimer = 0;

    let globalFrame = 0;

    // Refined Luxury Tech Palette
    const LUXURY_PALETTE = {
      emerald: '#10B981',
      electricTeal: '#06B6D4',
      cyanGlow: '#22D3EE',
      slateDark: '#08252C',
      slateMid: '#0F3A42',
      platinum: '#E2E8F0',
      pureWhite: '#FFFFFF',
    };

    const buildField = (width: number, height: number) => {
      clusters = [];
      bars = [];

      const isMobile = width < 768;
      const numClusters = isMobile ? 6 : 9;
      const totalBarsTarget = isMobile ? 100 : 170;

      // Cluster regions distributed with spatial balance
      const clusterRegions = [
        { xPct: 0.10, yPct: 0.28 },
        { xPct: 0.20, yPct: 0.62 },
        { xPct: 0.30, yPct: 0.32 },
        { xPct: 0.42, yPct: 0.72 },
        { xPct: 0.52, yPct: 0.24 },
        { xPct: 0.62, yPct: 0.65 },
        { xPct: 0.74, yPct: 0.30 },
        { xPct: 0.85, yPct: 0.68 },
        { xPct: 0.92, yPct: 0.25 },
      ];

      const activeRegions = isMobile
        ? clusterRegions.filter((_, i) => i % 2 === 0)
        : clusterRegions.slice(0, numClusters);

      // Generate Clusters
      activeRegions.forEach((reg, cIdx) => {
        const cWidth = isMobile ? 70 + Math.random() * 40 : 90 + Math.random() * 70;

        clusters.push({
          id: cIdx,
          xCenter: reg.xPct * width,
          yCenter: reg.yPct * height,
          width: cWidth,
          activity: 0.25 + Math.random() * 0.35,
          targetActivity: 0.3 + Math.random() * 0.3,
          isHotspotActive: cIdx === 2 || cIdx === 6,
          hotspotXRatio: 0.4 + Math.random() * 0.2,
          hotspotIntensity: cIdx === 2 ? 0.5 : 0.2,
          hotspotTimer: Math.floor(Math.random() * 140),
        });
      });

      // Distribute bars into clusters
      const barsPerCluster = Math.floor(totalBarsTarget / clusters.length);

      clusters.forEach((cluster) => {
        const startX = cluster.xCenter - cluster.width / 2;
        let currentX = startX;

        for (let b = 0; b < barsPerCluster; b++) {
          const xRatio = (currentX - startX) / cluster.width;
          if (xRatio > 1.0) break;

          const lRand = Math.random();
          const layer: 0 | 1 | 2 = lRand < 0.45 ? 0 : lRand < 0.80 ? 1 : 2;

          const barW = layer === 0 ? 2.0 : layer === 1 ? 3.5 : 5.5;

          const bellFactor = Math.sin(Math.PI * Math.max(0, Math.min(1, xRatio)));
          const minH = layer === 0 ? 12 + bellFactor * 15 : layer === 1 ? 24 + bellFactor * 30 : 40 + bellFactor * 50;
          const maxH = layer === 0 ? 60 + bellFactor * 40 : layer === 1 ? 110 + bellFactor * 60 : 170 + bellFactor * 90;

          const initH = minH + Math.random() * (maxH - minH) * 0.5;
          const yVar = (Math.random() - 0.5) * 40;
          const baseYTop = Math.max(15, Math.min(height - maxH - 15, cluster.yCenter - initH / 2 + yVar));

          let bColor = LUXURY_PALETTE.slateDark;
          let gColor = 'transparent';

          if (layer === 0) {
            bColor = Math.random() < 0.6 ? LUXURY_PALETTE.slateDark : LUXURY_PALETTE.slateMid;
          } else if (layer === 1) {
            bColor = Math.random() < 0.75 ? LUXURY_PALETTE.electricTeal : LUXURY_PALETTE.emerald;
            gColor = 'rgba(6, 182, 212, 0.20)';
          } else {
            const r = Math.random();
            bColor = r < 0.65 ? LUXURY_PALETTE.cyanGlow : r < 0.90 ? LUXURY_PALETTE.emerald : LUXURY_PALETTE.platinum;
            gColor = 'rgba(34, 211, 238, 0.35)';
          }

          const isShiny = layer === 2 ? Math.random() < 0.70 : layer === 1 ? Math.random() < 0.30 : false;

          bars.push({
            x: currentX,
            width: barW,
            layer,
            yTop: baseYTop,
            targetYTop: baseYTop,
            height: initH,
            targetHeight: initH,
            minHeight: minH,
            maxHeight: maxH,
            opacity: layer === 0 ? 0.08 : layer === 1 ? 0.22 : 0.50,
            targetOpacity: layer === 0 ? 0.10 : layer === 1 ? 0.28 : 0.55,
            speed: 0.02 + Math.random() * 0.025,
            state: Math.random() < 0.6 ? 'MOVE' : 'HOLD',
            holdTimer: Math.floor(Math.random() * 70),
            clusterId: cluster.id,
            xRatioInCluster: xRatio,
            baseColor: bColor,
            glowColor: gColor,
            isShiny,
          });

          currentX += barW + 2.5 + Math.random() * 4.5;
        }
      });
    };

    const handleResize = () => {
      const w = window.innerWidth || 300;
      const h = window.innerHeight || 150;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        buildField(w, h);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Main Canvas Render Loop
    const render = () => {
      globalFrame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Deep Obsidian Luxury Canvas
      const bgGrad = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.35,
        120,
        canvas.width * 0.5,
        canvas.height * 0.5,
        Math.max(canvas.width, canvas.height) * 0.85
      );
      bgGrad.addColorStop(0, '#030914');
      bgGrad.addColorStop(0.5, '#02060d');
      bgGrad.addColorStop(1, '#010307');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. High-Tech Background Block Shader Matrix (Clearer, architectural grid structure)
      ctx.save();
      const gridStep = canvas.width < 768 ? 40 : 32;
      const cols = Math.ceil(canvas.width / gridStep);
      const rows = Math.ceil(canvas.height / gridStep);

      // Fill select background grid blocks with architectural subtle shader shading
      const time = globalFrame * 0.015;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const blockX = c * gridStep;
          const blockY = r * gridStep;

          // Deterministic pattern with smooth breathing wave
          const blockPhase = Math.sin(time + c * 0.35 + r * 0.25);
          const isSelectedBlock = (c * 7 + r * 13) % 5 === 0 || (c * 3 + r * 11) % 8 === 0;

          if (isSelectedBlock && blockPhase > 0.1) {
            const blockAlpha = (blockPhase - 0.1) * 0.085;
            ctx.fillStyle = (c + r) % 2 === 0 ? 'rgba(6, 182, 212, ' + blockAlpha + ')' : 'rgba(16, 185, 129, ' + (blockAlpha * 0.75) + ')';
            ctx.fillRect(blockX + 1, blockY + 1, gridStep - 2, gridStep - 2);
          }
        }
      }

      // Draw crisp precision grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = gridStep; x < canvas.width; x += gridStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = gridStep; y < canvas.height; y += gridStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // Major grid accent lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = gridStep * 4; x < canvas.width; x += gridStep * 4) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = gridStep * 4; y < canvas.height; y += gridStep * 4) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
      ctx.restore();

      if (!prefersReducedMotion) {
        // Shift cluster activities smoothly
        if (globalFrame % 140 === 0) {
          const randCluster = clusters[Math.floor(Math.random() * clusters.length)];
          if (randCluster) {
            randCluster.targetActivity = 0.20 + Math.random() * 0.45;
            if (Math.random() < 0.35) {
              clusters.forEach((c) => {
                if (c.id !== randCluster.id) c.isHotspotActive = false;
              });
              randCluster.isHotspotActive = true;
              randCluster.hotspotXRatio = 0.3 + Math.random() * 0.4;
              randCluster.hotspotIntensity = 0.3;
              randCluster.hotspotTimer = 160;
            }
          }
        }

        clusters.forEach((cluster) => {
          cluster.activity += (cluster.targetActivity - cluster.activity) * 0.02;

          if (cluster.isHotspotActive) {
            cluster.hotspotTimer--;
            if (cluster.hotspotTimer > 80) {
              cluster.hotspotIntensity += (0.7 - cluster.hotspotIntensity) * 0.03;
            } else if (cluster.hotspotTimer > 0) {
              cluster.hotspotIntensity += (0.0 - cluster.hotspotIntensity) * 0.02;
            } else {
              cluster.isHotspotActive = false;
              cluster.hotspotIntensity = 0;
            }
          }
        });

        // Wave progression
        waveTimer++;
        if (waveTimer > 280) {
          waveTimer = 0;
          waveActive = true;
          waveX = -150;
          waveSpeed = 4.0 + Math.random() * 2.0;
        }

        if (waveActive) {
          waveX += waveSpeed;
          if (waveX > canvas.width + 250) {
            waveActive = false;
          }
        }
      }

      // 3. Soft Backlight Ambient Aura Pass
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      clusters.forEach((cluster) => {
        if (cluster.activity > 0.15) {
          const haloGrad = ctx.createRadialGradient(
            cluster.xCenter,
            cluster.yCenter,
            10,
            cluster.xCenter,
            cluster.yCenter,
            cluster.width * 1.4
          );
          const haloColor = cluster.isHotspotActive ? 'rgba(34, 211, 238, ' : 'rgba(16, 185, 129, ';
          const haloAlpha = Math.min(0.20, cluster.activity * 0.25);
          haloGrad.addColorStop(0, `${haloColor}${haloAlpha})`);
          haloGrad.addColorStop(0.6, `${haloColor}${haloAlpha * 0.25})`);
          haloGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.ellipse(
            cluster.xCenter,
            cluster.yCenter,
            cluster.width * 1.3,
            Math.min(canvas.height * 0.45, 260),
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });
      ctx.restore();

      // 4. Render Vertical Signal Bars Layer by Layer (Only Vertical Stripes)
      for (let layerIdx = 0; layerIdx <= 2; layerIdx++) {
        const layerBars = bars.filter((b) => b.layer === layerIdx);

        for (const bar of layerBars) {
          const parentCluster = clusters.find((c) => c.id === bar.clusterId);
          const clusterActivity = parentCluster ? parentCluster.activity : 0.4;
          let isHotspot = false;

          if (!prefersReducedMotion) {
            let mouseHeightBoost = 0;
            let mouseOpacityBoost = 0;

            if (mouse.active) {
              const dx = mouse.x - bar.x;
              const barMidY = bar.yTop + bar.height / 2;
              const dy = mouse.y - barMidY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 160) {
                const prox = 1.0 - dist / 160;
                mouseHeightBoost = 25 * prox;
                mouseOpacityBoost = 0.22 * prox;
              }
            }

            let waveBoost = 0;
            if (waveActive) {
              const wDist = Math.abs(bar.x - waveX);
              if (wDist < 120) {
                const wFactor = 1.0 - wDist / 120;
                waveBoost = 0.22 * wFactor;
              }
            }

            let hotspotBoost = 0;

            if (parentCluster && parentCluster.isHotspotActive) {
              const xDiff = Math.abs(bar.xRatioInCluster - parentCluster.hotspotXRatio);
              if (xDiff < 0.2) {
                const spotFactor = (1.0 - xDiff / 0.2) * parentCluster.hotspotIntensity;
                hotspotBoost = spotFactor;
                if (spotFactor > 0.25 && bar.layer >= 1) {
                  isHotspot = true;
                }
              }
            }

            if (bar.state === 'MOVE') {
              const effectiveTargetH = bar.targetHeight + mouseHeightBoost + hotspotBoost * 35;
              bar.height += (effectiveTargetH - bar.height) * bar.speed;
              bar.yTop += (bar.targetYTop - bar.yTop) * bar.speed;

              const targetOp = Math.min(
                0.70,
                bar.targetOpacity * clusterActivity * 1.4 + mouseOpacityBoost + waveBoost + hotspotBoost * 0.25
              );
              bar.opacity += (targetOp - bar.opacity) * bar.speed;

              if (Math.abs(effectiveTargetH - bar.height) < 2 && Math.abs(bar.targetYTop - bar.yTop) < 2) {
                bar.state = 'HOLD';
                bar.holdTimer = Math.floor(40 + Math.random() * 90);
              }
            } else if (bar.state === 'HOLD') {
              bar.holdTimer--;
              if (mouse.active || waveBoost > 0 || hotspotBoost > 0) {
                bar.opacity = Math.min(
                  0.70,
                  bar.targetOpacity * clusterActivity * 1.4 + mouseOpacityBoost + waveBoost + hotspotBoost * 0.25
                );
              }

              if (bar.holdTimer <= 0) {
                const rand = Math.random();
                if (rand < 0.70) {
                  bar.targetHeight = bar.minHeight + Math.random() * (bar.maxHeight - bar.minHeight);
                  bar.targetYTop = Math.max(
                    15,
                    Math.min(canvas.height - bar.targetHeight - 15, bar.yTop + (Math.random() - 0.5) * 70)
                  );
                  bar.targetOpacity =
                    bar.layer === 0
                      ? 0.08 + Math.random() * 0.08
                      : bar.layer === 1
                      ? 0.20 + Math.random() * 0.18
                      : 0.42 + Math.random() * 0.22;
                  bar.state = 'MOVE';
                } else {
                  bar.state = 'FADE';
                  bar.holdTimer = Math.floor(30 + Math.random() * 70);
                }
              }
            } else if (bar.state === 'FADE') {
              bar.opacity += (0.03 - bar.opacity) * 0.04;
              bar.holdTimer--;
              if (bar.holdTimer <= 0 || bar.opacity <= 0.04) {
                bar.targetHeight = bar.minHeight + Math.random() * (bar.maxHeight - bar.minHeight);
                bar.yTop = Math.random() * (canvas.height - bar.targetHeight);
                bar.state = 'MOVE';
              }
            }
          }

          // Calculate Dynamic Color & Glow
          ctx.save();

          let renderColor = bar.baseColor;
          let renderGlow = bar.glowColor;

          if (isHotspot) {
            renderColor = LUXURY_PALETTE.pureWhite;
            renderGlow = LUXURY_PALETTE.cyanGlow;
          }

          const renderAlpha = Math.max(0.04, Math.min(0.80, bar.opacity));
          ctx.globalAlpha = renderAlpha;

          const isVeryShiny = bar.isShiny || isHotspot;

          if (isVeryShiny) {
            ctx.shadowColor = renderGlow || LUXURY_PALETTE.cyanGlow;
            ctx.shadowBlur = 12 * renderAlpha;

            const glossyGrad = ctx.createLinearGradient(bar.x, bar.yTop, bar.x, bar.yTop + bar.height);
            glossyGrad.addColorStop(0, LUXURY_PALETTE.pureWhite);
            glossyGrad.addColorStop(0.18, renderColor);
            glossyGrad.addColorStop(0.82, renderColor);
            glossyGrad.addColorStop(1, 'rgba(6, 182, 212, 0.20)');
            ctx.fillStyle = glossyGrad;
          } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillStyle = renderColor;
          }

          const radius = Math.min(bar.width / 2, 2.5);
          ctx.beginPath();
          ctx.roundRect(bar.x, bar.yTop, bar.width, bar.height, radius);
          ctx.fill();

          // Shiny Specular Vertical Spine Light Beam on Foreground Bars
          if (isVeryShiny && renderAlpha > 0.25) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.beginPath();
            ctx.roundRect(
              bar.x + Math.max(0.5, bar.width * 0.25),
              bar.yTop + 2,
              Math.max(1, bar.width * 0.35),
              Math.max(4, bar.height - 4),
              1
            );
            ctx.fill();

            // Specular top cap
            ctx.fillStyle = LUXURY_PALETTE.pureWhite;
            ctx.beginPath();
            ctx.ellipse(bar.x + bar.width / 2, bar.yTop + 1.2, bar.width / 2, 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // Hero vignette protecting central content readability
      ctx.save();
      const textVignette = ctx.createRadialGradient(
        canvas.width * 0.35,
        canvas.height * 0.4,
        60,
        canvas.width * 0.35,
        canvas.height * 0.4,
        Math.max(canvas.width, canvas.height) * 0.65
      );
      textVignette.addColorStop(0, 'rgba(2, 6, 13, 0.70)');
      textVignette.addColorStop(0.5, 'rgba(2, 6, 13, 0.40)');
      textVignette.addColorStop(1, 'rgba(2, 6, 13, 0.10)');
      ctx.fillStyle = textVignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
};
