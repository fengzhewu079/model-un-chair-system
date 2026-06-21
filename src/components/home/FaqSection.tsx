import React, { useState } from 'react';
import { faqItems } from '../../features/home/homeContent';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-[#f7f8fb]" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">FAQ</p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Before you create a room.
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            The essentials about access, roles, collaboration, and the free beta.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            const answerId = `faq-answer-${index}`;
            return (
              <div key={item.question} className={index > 0 ? 'border-t border-slate-200' : ''}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-bold text-slate-950 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:px-6"
                  >
                    {item.question}
                    <span aria-hidden="true" className="text-xl font-normal text-slate-500">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                </h3>
                {isOpen && (
                  <div id={answerId} className="px-5 pb-5 leading-7 text-slate-600 sm:px-6">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
