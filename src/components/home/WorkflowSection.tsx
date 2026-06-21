import React, { useState } from 'react';
import { workflowSteps } from '../../features/home/homeContent';

export const WorkflowSection: React.FC = () => {
  const [activeId, setActiveId] = useState(workflowSteps[0].id);
  const activeStep = workflowSteps.find((step) => step.id === activeId) ?? workflowSteps[0];

  return (
    <section className="border-y border-slate-200 bg-white" aria-labelledby="workflow-heading">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">How it works</p>
          <h2 id="workflow-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            From room setup to a live committee.
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            These are the real screens your dais team uses—not a separate marketing dashboard.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.36fr_0.64fr] lg:items-start">
          <div className="space-y-3" role="tablist" aria-label="MUN Chair workflow steps">
            {workflowSteps.map((step) => {
              const isActive = step.id === activeStep.id;
              return (
                <button
                  key={step.id}
                  id={`workflow-tab-${step.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`workflow-panel-${step.id}`}
                  onClick={() => setActiveId(step.id)}
                  className={`w-full rounded-xl border px-5 py-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isActive
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                    {step.eyebrow}
                  </span>
                  <span className="mt-1 block font-bold text-slate-950">{step.label}</span>
                </button>
              );
            })}
          </div>

          <div
            id={`workflow-panel-${activeStep.id}`}
            role="tabpanel"
            aria-labelledby={`workflow-tab-${activeStep.id}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)]"
          >
            <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
              <h3 className="text-xl font-bold text-slate-950">{activeStep.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{activeStep.description}</p>
            </div>
            <img
              src={activeStep.imageSrc}
              alt={activeStep.imageAlt}
              loading="lazy"
              decoding="async"
              className="aspect-[16/10] w-full bg-slate-100 object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
