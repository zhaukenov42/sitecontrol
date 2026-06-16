interface RecoveryBannerProps {
  spi: number;
  varianceDays?: number;
}

export default function RecoveryBanner({ spi, varianceDays }: RecoveryBannerProps) {
  if (spi >= 0.85) return null;
  return (
    <div className="bg-red-950 border border-red-700 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 bg-red-700 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
        <span className="text-white font-bold text-lg">!</span>
      </div>
      <div className="flex-1">
        <p className="text-red-300 font-bold text-base tracking-wide">
          РЕЖИМ ВОССТАНОВЛЕНИЯ АКТИВИРОВАН — SPI: {spi.toFixed(2)}
        </p>
        <p className="text-red-400 text-sm mt-0.5">
          Проект отстаёт от базового графика
          {varianceDays ? ` на ${Math.abs(varianceDays)} дней` : ''}.
          Требуется немедленное принятие корректирующих мер.
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-red-300 text-xs font-medium">SPI (факт)</p>
        <p className="text-red-200 text-2xl font-bold">{spi.toFixed(2)}</p>
        <p className="text-red-400 text-xs">Цель: ≥ 0.90</p>
      </div>
    </div>
  );
}
