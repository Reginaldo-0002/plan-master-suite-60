import { useEffect, useRef, memo, useCallback } from 'react';

const OptimizedMagneticBackground = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
  }>>([]);
  const animationRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  const updateMouse = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    resizeCanvas();
    
    // Otimização: usar passive listeners
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('mousemove', updateMouse, { passive: true });

    // Initialize particles com menos partículas para performance
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < 20; i++) { // Reduzido de 30 para 20
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2, // Velocidade reduzida
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 1.2 + 0.3, // Tamanho reduzido
          life: Math.random() * 100,
          maxLife: 100,
        });
      }
    };

    initParticles();

    const drawMagneticField = (currentTime: number) => {
      // Otimização: limitar FPS para 30fps
      if (currentTime - lastFrameTimeRef.current < 33) { // ~30 FPS
        animationRef.current = requestAnimationFrame(drawMagneticField);
        return;
      }
      
      lastFrameTimeRef.current = currentTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Otimização: reduzir linhas do campo magnético
      const { x: mouseX, y: mouseY } = mouseRef.current;
      
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.03)'; // Opacidade reduzida
      ctx.lineWidth = 0.5; // Linha mais fina
      
      // Reduzido de 6 para 4 linhas
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const startX = mouseX + Math.cos(angle) * 60; // Raio reduzido
        const startY = mouseY + Math.sin(angle) * 60;
        const endX = mouseX + Math.cos(angle) * 150; // Raio reduzido
        const endY = mouseY + Math.sin(angle) * 150;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(mouseX, mouseY, endX, endY);
        ctx.stroke();
      }

      // Update particles com otimizações
      particlesRef.current.forEach((particle, index) => {
        // Magnetic force (otimizado)
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distanceSquared = dx * dx + dy * dy; // Evitar sqrt quando possível
        
        if (distanceSquared < 22500) { // 150^2
          const distance = Math.sqrt(distanceSquared);
          const force = (150 - distance) / 150 * 0.01; // Força reduzida
          particle.vx += dx / distance * force;
          particle.vy += dy / distance * force;
        }
        
        // Apply drag
        particle.vx *= 0.99; // Drag melhorado
        particle.vy *= 0.99;
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Update life
        particle.life += 1;
        if (particle.life > particle.maxLife) {
          particle.life = 0;
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
        }
        
        // Draw particle
        const alpha = (1 - (particle.life / particle.maxLife)) * 0.3; // Alpha reduzido
        ctx.fillStyle = `rgba(79, 70, 229, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Otimização: reduzir conexões entre partículas
        for (let j = index + 1; j < particlesRef.current.length; j += 2) { // Skip every other
          const otherParticle = particlesRef.current[j];
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distanceSquared = dx * dx + dy * dy;
          
          if (distanceSquared < 4900) { // 70^2 (reduzido de 80)
            const distance = Math.sqrt(distanceSquared);
            const alpha = (70 - distance) / 70 * 0.1; // Alpha reduzido
            ctx.strokeStyle = `rgba(79, 70, 229, ${alpha})`;
            ctx.lineWidth = 0.2; // Linha mais fina
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(drawMagneticField);
    };

    animationRef.current = requestAnimationFrame(drawMagneticField);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', updateMouse);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [resizeCanvas, updateMouse]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[-1]"
      style={{ background: 'linear-gradient(135deg, hsl(240, 21%, 15%) 0%, hsl(240, 27%, 9%) 50%, hsl(240, 21%, 15%) 100%)' }}
    />
  );
});

OptimizedMagneticBackground.displayName = 'OptimizedMagneticBackground';

export { OptimizedMagneticBackground };