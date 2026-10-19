import { STRATEGY_FILES } from '../data/strategyCode';

/**
 * Downloads all strategy files one by one, or bundles them into a multi-file deployment script
 */
export function exportAllStrategyFiles() {
  // Trigger sequential downloads with small interval
  STRATEGY_FILES.forEach((file, index) => {
    setTimeout(() => {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, index * 250);
  });
}
