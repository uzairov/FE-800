'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PLANS, PLAN_ORDER, type PlanName } from '@/lib/plans';

interface PlanLimitModalProps {
  open:        boolean;
  onClose:     () => void;
  currentPlan: string;
  used?:       number;
  limit?:      number;
  feature?:    string;
  upgradeTo?:  PlanName;
  message?:    string;
}

const FEATURE_LABELS: Record<string, string> = {
  maxAssessmentsPerMonth: 'оценок в месяц',
  hasAiAssistant:         'AI-ассистент',
  hasPdfExport:           'экспорт в PDF',
  hasApiAccess:           'API-доступ',
  hasWebhooks:            'Webhooks',
  hasWhiteLabel:          'белый лейбл',
};

export default function PlanLimitModal({
  open,
  onClose,
  currentPlan,
  used,
  limit,
  feature,
  upgradeTo,
  message,
}: PlanLimitModalProps) {
  const cur = PLANS[(currentPlan as PlanName)] ?? PLANS.free;

  // Plans to show as upgrade options (paid only, current and above)
  const offerNames = PLAN_ORDER.filter(
    (n) => n !== 'free' && PLAN_ORDER.indexOf(n) > PLAN_ORDER.indexOf(currentPlan as PlanName),
  );

  const featureLabel = feature ? FEATURE_LABELS[feature] ?? feature : 'оценок в месяц';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div
              className="rounded-2xl p-6 w-full max-w-lg pointer-events-auto"
              style={{
                background: 'linear-gradient(160deg, #141830 0%, #0d1024 100%)',
                border:     '1px solid rgba(255,255,255,0.10)',
                boxShadow:  '0 24px 80px rgba(0,0,0,0.6)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🚀</div>
                <h2 className="text-xl font-bold text-white mb-2">Лимит плана достигнут</h2>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                  {message ?? (
                    used !== undefined && limit !== undefined ? (
                      <>
                        Вы использовали <strong style={{ color: '#fff' }}>{used} из {limit}</strong> {featureLabel} на плане{' '}
                        <strong style={{ color: '#fff' }}>{cur.displayName}</strong>.
                        Обновите тариф, чтобы продолжить.
                      </>
                    ) : (
                      <>
                        Функция <strong style={{ color: '#fff' }}>«{featureLabel}»</strong> недоступна на плане{' '}
                        <strong style={{ color: '#fff' }}>{cur.displayName}</strong>.
                      </>
                    )
                  )}
                </p>
              </div>

              {/* Upgrade options */}
              {offerNames.length > 0 && (
                <div
                  className={`grid gap-2 mb-6 ${
                    offerNames.length === 1
                      ? 'grid-cols-1'
                      : offerNames.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                  }`}
                >
                  {offerNames.map((name) => {
                    const p           = PLANS[name];
                    const isSuggested = name === upgradeTo;
                    return (
                      <div
                        key={name}
                        className="rounded-xl p-3 text-center transition-all"
                        style={
                          isSuggested
                            ? {
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.10))',
                                border:     '1px solid rgba(59,130,246,0.45)',
                                boxShadow:  '0 0 24px rgba(59,130,246,0.18)',
                              }
                            : {
                                background: 'rgba(255,255,255,0.03)',
                                border:     '1px solid rgba(255,255,255,0.08)',
                              }
                        }
                      >
                        <div className="text-xs font-semibold text-white">{p.displayName}</div>
                        <div className="text-base font-bold mt-0.5" style={{ color: isSuggested ? '#60a5fa' : '#fff' }}>
                          ${p.priceUsd}
                          <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>/мес</span>
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                          {p.maxAssessmentsPerMonth < 0 ? '∞' : p.maxAssessmentsPerMonth} оценок
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border:     '1px solid rgba(255,255,255,0.10)',
                    color:      '#94a3b8',
                  }}
                >
                  Закрыть
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.href = '/dashboard/settings#billing';
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)',
                    boxShadow:  '0 4px 16px rgba(59,130,246,0.35)',
                  }}
                >
                  Обновить тариф →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
