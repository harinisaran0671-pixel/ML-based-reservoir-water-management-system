import React from 'react';
import { Lightbulb, ArrowRight, CheckCircle2 } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: string;
  index: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  index,
}) => {
  return (
    <div className="bg-slate-50 hover:bg-sky-50/40 border border-slate-200 hover:border-sky-200 rounded-xl p-4 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-xs font-bold font-mono">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-800 leading-relaxed font-medium">
            {recommendation}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
            <CheckCircle2 className="w-3 h-3 text-sky-600" />
            <span>AI Decision Support Directive</span>
            <span aria-hidden="true">·</span>
            <span>Ministry / CWC Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
