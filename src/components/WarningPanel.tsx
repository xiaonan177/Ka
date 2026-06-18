'use client';

import { Warning } from '@/lib/palletize';

interface WarningPanelProps {
  warnings: Warning[];
  title?: string;
}

const WARNING_ICONS: Record<Warning['type'], string> = {
  height: '📏',
  weight: '⚖️',
  payload: '🚛',
  door: '🚪',
};

const SEVERITY_COLORS: Record<Warning['severity'], { bg: string; border: string; text: string }> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-700',
  },
};

export function WarningPanel({ warnings, title = '合规性检查' }: WarningPanelProps) {
  if (warnings.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 text-lg">✓</span>
          <span className="text-sm font-semibold text-emerald-700">{title}</span>
        </div>
        <div className="mt-2 text-xs text-emerald-600">
          所有参数符合要求，无预警
        </div>
      </div>
    );
  }

  const errors = warnings.filter(w => w.severity === 'error');
  const warningItems = warnings.filter(w => w.severity === 'warning');

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      
      {/* 错误级别的预警 */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((w, idx) => (
            <div
              key={`error-${idx}`}
              className={`${SEVERITY_COLORS.error.bg} ${SEVERITY_COLORS.error.border} border rounded-lg p-3`}
            >
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-lg">✗</span>
                <div>
                  <div className={`text-sm font-semibold ${SEVERITY_COLORS.error.text}`}>
                    {WARNING_ICONS[w.type]} {w.message}
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {w.details}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 警告级别 */}
      {warningItems.length > 0 && (
        <div className="space-y-1">
          {warningItems.map((w, idx) => (
            <div
              key={`warning-${idx}`}
              className={`${SEVERITY_COLORS.warning.bg} ${SEVERITY_COLORS.warning.border} border rounded-lg p-3`}
            >
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-lg">⚠</span>
                <div>
                  <div className={`text-sm font-semibold ${SEVERITY_COLORS.warning.text}`}>
                    {WARNING_ICONS[w.type]} {w.message}
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    {w.details}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 简洁版本的预警徽章
interface WarningBadgeProps {
  warnings: Warning[];
}

export function WarningBadge({ warnings }: WarningBadgeProps) {
  const errorCount = warnings.filter(w => w.severity === 'error').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;

  if (errorCount === 0 && warningCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">
        ✓ 合规
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium">
      {errorCount > 0 && (
        <span className="bg-red-100 text-red-700 rounded px-1">
          {errorCount} 错误
        </span>
      )}
      {warningCount > 0 && (
        <span className="bg-amber-100 text-amber-700 rounded px-1">
          {warningCount} 警告
        </span>
      )}
    </span>
  );
}