'use client'

import { useSmartCards } from '@/lib/hooks/useSmartCards'
import { useEffect, useState } from 'react'
import { X, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function SmartCardsWidget() {
  const {
    card,
    loading,
    showSkipConfirm,
    onDismiss,
    onNext,
    onSkipOnboarding,
    onConfirmSkip,
    onCancelSkip,
  } = useSmartCards()

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (card && !loading) {
      // Small delay to trigger slide-up animation
      const t = setTimeout(() => setVisible(true), 100)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [card, loading])

  if (!card) return null

  const isOnboarding = card.kind === 'onboarding'
  const isCelebration = card.kind === 'celebration'

  return (
    <>
      {/* Skip onboarding confirmation modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">Passer le tutoriel ?</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Vous pouvez retrouver toutes ces informations dans la section Aide à tout moment.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancelSkip}
                className="flex-1 py-2.5 rounded-xl border border-surface-300 text-gray-300 text-sm font-medium hover:bg-surface-100 transition-colors"
              >
                Continuer le guide
              </button>
              <button
                onClick={onConfirmSkip}
                className="flex-1 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-semibold transition-colors"
              >
                Passer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Card */}
      <div
        className={`fixed bottom-5 right-5 z-[9000] w-80 max-w-[calc(100vw-2.5rem)] transition-all duration-500 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div
          className={`
            rounded-2xl shadow-2xl border overflow-hidden
            ${isCelebration
              ? 'bg-gradient-to-br from-brand-orange/20 to-surface-50 border-brand-orange/30'
              : 'bg-surface-50 border-surface-200'
            }
          `}
        >
          {/* Header bar */}
          <div
            className={`h-1 w-full ${
              isOnboarding ? 'bg-brand-orange' : isCelebration ? 'bg-gradient-to-r from-brand-orange to-yellow-400' : 'bg-surface-300'
            }`}
          >
            {/* Progress indicator for onboarding */}
            {isOnboarding && (
              <div
                className="h-full bg-brand-orange transition-all duration-300"
                style={{ width: `${(card.step / card.stepCount) * 100}%` }}
              />
            )}
          </div>

          <div className="p-4">
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {isOnboarding && (
                  <span className="text-xs text-brand-orange font-semibold bg-brand-orange/10 px-2 py-0.5 rounded-full">
                    {card.step}/{card.stepCount}
                  </span>
                )}
                {isCelebration && (
                  <span className="text-base">🎉</span>
                )}
                {isOnboarding && (
                  <span className="text-white text-sm font-semibold">{card.title}</span>
                )}
              </div>
              <button
                onClick={onDismiss}
                className="text-gray-500 hover:text-white transition-colors flex-shrink-0 p-0.5"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message */}
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {card.message}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* CTA button */}
              {card.kind !== 'celebration' && card.cta && (
                <Link
                  href={card.cta.href}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                >
                  {card.cta.label}
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                </Link>
              )}

              {/* Onboarding: Next + Skip buttons */}
              {isOnboarding && (
                <>
                  <button
                    onClick={onNext}
                    className={`flex items-center gap-1 ${card.cta ? '' : 'flex-1'} bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors`}
                  >
                    {card.step === card.stepCount ? 'Terminer' : 'Suivant'}
                    {card.step < card.stepCount && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {card.step < card.stepCount && (
                    <button
                      onClick={onSkipOnboarding}
                      className="text-gray-500 hover:text-gray-300 text-xs transition-colors px-1 py-2"
                    >
                      Passer le tutoriel
                    </button>
                  )}
                </>
              )}

              {/* Celebration: just dismiss */}
              {isCelebration && (
                <button
                  onClick={onDismiss}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                >
                  Super, merci !
                </button>
              )}

              {/* Reminder/optimization without CTA */}
              {(card.kind === 'reminder' || card.kind === 'optimization') && !card.cta && (
                <button
                  onClick={onDismiss}
                  className="flex-1 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-gray-300 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                >
                  Compris
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
