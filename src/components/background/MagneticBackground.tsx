
import { useEffect, useRef } from 'react';

export const MagneticBackground = () => {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          life: Math.random() * 100,
          maxLife: 100,
        });
      }
    };

    initParticles();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const drawMagneticField = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw magnetic field lines
      const { x: mouseX, y: mouseY } = mouseRef.current;
      
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.1)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const startX = mouseX + Math.cos(angle) * 100;
        const startY = mouseY + Math.sin(angle) * 100;
        const endX = mouseX + Math.cos(angle) * 300;
        const endY = mouseY + Math.sin(angle) * 300;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(mouseX, mouseY, endX, endY);
        ctx.stroke();
      }

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Apply magnetic force towards mouse
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          const force = (200 - distance) / 200 * 0.02;
          particle.vx += dx / distance * force;
          particle.vy += dy / distance * force;
        }
        
        // Apply drag
        particle.vx *= 0.99;
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
        const alpha = 1 - (particle.life / particle.maxLife);
        ctx.fillStyle = `rgba(79, 70, 229, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw connections to nearby particles
        particlesRef.current.forEach((otherParticle, otherIndex) => {
          if (index >= otherIndex) return;
          
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            const alpha = (100 - distance) / 100 * 0.3;
            ctx.strokeStyle = `rgba(79, 70, 229, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });
    };

    const animate = () => {
      drawMagneticField();
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'linear-gradient(135deg, hsl(240, 21%, 15%) 0%, hsl(240, 27%, 9%) 50%, hsl(240, 21%, 15%) 100%)' }}
    />
  );
};
