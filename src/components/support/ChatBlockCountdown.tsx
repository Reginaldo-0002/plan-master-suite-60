import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ChatBlockCountdownProps {
  blockedUntil: Date | null;
  reason?: string | null;
}

export const ChatBlockCountdown = ({ blockedUntil, reason }: ChatBlockCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!blockedUntil) {
      setIsExpired(true);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = blockedUntil.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  if (isExpired) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-green-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">✅ Bloqueio Expirado</span>
        </div>
        <p className="text-xs text-green-600/80 mt-1">
          Seu chat foi liberado! Recarregue a página para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-2 text-destructive">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">🚫 Chat Bloqueado</span>
      </div>
      
      {reason && (
        <p className="text-xs text-destructive/80 mt-1 mb-2">
          <strong>Motivo:</strong> {reason}
        </p>
      )}

      <div className="flex justify-center gap-2 text-sm">
        {timeLeft.days > 0 && (
          <div className="bg-destructive/20 rounded px-2 py-1">
            <span className="font-mono font-bold text-destructive">{timeLeft.days}</span>
            <span className="text-xs text-destructive/70 ml-1">
              {timeLeft.days === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        )}
        
        <div className="bg-destructive/20 rounded px-2 py-1">
          <span className="font-mono font-bold text-destructive">
            {timeLeft.hours.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-destructive/70 ml-1">h</span>
        </div>
        
        <div className="bg-destructive/20 rounded px-2 py-1">
          <span className="font-mono font-bold text-destructive">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-destructive/70 ml-1">m</span>
        </div>
        
        <div className="bg-destructive/20 rounded px-2 py-1">
          <span className="font-mono font-bold text-destructive">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-destructive/70 ml-1">s</span>
        </div>
      </div>

      {blockedUntil && (
        <p className="text-xs text-destructive/60 mt-2">
          <strong>Liberado em:</strong> {blockedUntil.toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      )}
    </div>
  );
};